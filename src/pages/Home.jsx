import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Navigation, ArrowLeftRight } from 'lucide-react';
import { Shell } from '../components/Shell';
import { RouteCard } from '../components/RouteCard';
import { ErrorBanner } from '../components/ErrorBanner';
import { useRoutesContext } from '@/context/RoutesContext';
import { useDemoMode } from '@/context/DemoModeContext';
import { useSimulation } from '@/context/SimulationContext';
import { useAllBuses } from '@/hooks/useAllBuses';
import { isFirebaseConfigured } from '@/firebase';
import { BOARDING_STORAGE_KEY, DESTINATION_STORAGE_KEY } from '@/data/settings';
import { allStopNames } from '@/utils/routes';
import { getRouteStatus, isDemoLiveRoute } from '@/utils/busStatus';
import { minutesOfDay } from '@/utils/time';

const FILTERS = ['All Routes', 'Active Buses', 'Scheduled Buses'];
const LIVE_STATUSES = ['Live', 'Demo-Live'];
const EMPTY_MESSAGES = {
  'Active Buses': 'No buses are live on this trip right now.',
  'Scheduled Buses': 'No scheduled buses left for this trip today.',
};

export function Home() {
  const navigate = useNavigate();
  const { routes, error: routesError } = useRoutesContext();
  const { demoMode } = useDemoMode();
  const { positions } = useSimulation();
  const { buses, error: busesError, now } = useAllBuses();
  const [boarding, setBoarding] = useState(() => localStorage.getItem(BOARDING_STORAGE_KEY) || 'Gulshan-e-Iqbal');
  const [destination, setDestination] = useState(() => localStorage.getItem(DESTINATION_STORAGE_KEY) || 'North Karachi');
  const [filter, setFilter] = useState('All Routes');
  const stopNames = useMemo(() => allStopNames(routes), [routes]);

  useEffect(() => {
    localStorage.setItem(BOARDING_STORAGE_KEY, boarding);
  }, [boarding]);

  useEffect(() => {
    localStorage.setItem(DESTINATION_STORAGE_KEY, destination);
  }, [destination]);

  const swap = () => {
    setBoarding(destination);
    setDestination(boarding);
  };

  const nowMinutes = minutesOfDay(now);
  const allRows = routes.map((route) => {
    const demoLive = isDemoLiveRoute(route.id, demoMode);
    const bus = demoLive ? positions[route.id] : buses[route.busId];
    const status = getRouteStatus({ route, bus, demoLive, now, nowMinutes });
    return { route, bus, status };
  });
  const anyLive = allRows.some((row) => LIVE_STATUSES.includes(row.status));

  const isOnTrip = (route) => {
    const names = route.stops.map((stop) => stop.name);
    const boardingIndex = names.indexOf(boarding);
    const destinationIndex = names.indexOf(destination);
    return boardingIndex >= 0 && destinationIndex >= 0 && boardingIndex < destinationIndex;
  };

  const visibleRows = allRows.filter(({ route, status }) => {
    if (!isOnTrip(route)) return false;
    if (filter === 'Active Buses') return LIVE_STATUSES.includes(status);
    if (filter === 'Scheduled Buses') return status === 'Scheduled';
    return true;
  });

  return (
    <Shell>
      {!isFirebaseConfigured && <ErrorBanner type="demo" />}
      <ErrorBanner type="listener" error={routesError ?? busesError} />
      <main className="page home-page">
        <section className="hero-intro">
          <div>
            <p className="project-title">Adaptive Smart Mobile App for Tracking and Monitoring of Public Transport</p>
            <p className="eyebrow">Smart Public Transport Tracking</p>
            <h1>Plan your ride<br /><span>with confidence.</span></h1>
          </div>
          <div className={`live-badge ${anyLive ? '' : 'offline'}`}>
            <span className={`pulse-dot ${anyLive ? '' : 'waiting'}`} /> {anyLive ? 'Live network' : 'No live buses'}
          </div>
        </section>

        <section className="search-card">
          <div className="field-row">
            <MapPin size={18} />
            <label>Boarding at
              <select value={boarding} onChange={(e) => setBoarding(e.target.value)}>
                {stopNames.map((stop) => <option key={stop}>{stop}</option>)}
              </select>
            </label>
            <span className="field-chevron">⌄</span>
          </div>
          <div className="field-divider" />
          <div className="field-row">
            <Navigation size={18} />
            <label>Going to
              <select value={destination} onChange={(e) => setDestination(e.target.value)}>
                {stopNames.map((stop) => <option key={stop}>{stop}</option>)}
              </select>
            </label>
            <button className="swap-btn" onClick={swap} aria-label="Swap stops">
              <ArrowLeftRight size={16} />
            </button>
          </div>
        </section>

        <div className="section-heading">
          <div>
            <p className="eyebrow">Karachi Red Bus</p>
            <h2>Routes near you</h2>
          </div>
          <span className="demo-label">Sample Karachi routes — demo data</span>
        </div>

        <div className="filter-row">
          {FILTERS.map((item) => (
            <button key={item} className={`filter-chip ${filter === item ? 'active' : ''}`} onClick={() => setFilter(item)}>
              {item}
            </button>
          ))}
        </div>

        <div className="route-list">
          {visibleRows.map(({ route, status, bus }) => (
            <RouteCard
              key={route.id}
              route={route}
              status={status}
              busData={bus}
              boardingStop={route.stops.find((stop) => stop.name === boarding)}
              onClick={() => navigate(`/tracking/${route.busId}`)}
            />
          ))}
          {visibleRows.length === 0 && (
            <div className="empty-state">{EMPTY_MESSAGES[filter] ?? 'No routes found for this trip'}</div>
          )}
        </div>
      </main>
    </Shell>
  );
}
