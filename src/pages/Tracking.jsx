import { useCallback, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import L from 'leaflet';
import { Shell } from '../components/Shell';
import { MapControls } from '../components/MapControls';
import { StopList } from '../components/StopList';
import { EtaPanel } from '../components/EtaPanel';
import { DiagnosticsPanel } from '../components/DiagnosticsPanel';
import { ErrorBanner } from '../components/ErrorBanner';
import { TrackingMap } from '../components/TrackingMap';
import { createBusIcon, createPassengerIcon } from '../components/BusMarker';
import { useRoutesContext } from '@/context/RoutesContext';
import { useDemoMode } from '@/context/DemoModeContext';
import { useSimulation } from '@/context/SimulationContext';
import { useBusLocation } from '@/hooks/useBusLocation';
import { isFirebaseConfigured } from '@/firebase';
import { BOARDING_STORAGE_KEY, settings } from '@/data/settings';
import { estimateEta } from '@/utils/eta';
import { buildSegments, getRouteProgress, haversineDistance } from '@/utils/geo';
import { findRouteByBusId } from '@/utils/routes';
import { BUS_STATE_LABELS, getBusState } from '@/utils/busStatus';
import { formatSecondsAgo } from '@/utils/time';

function readBoardingStop(route) {
  const saved = localStorage.getItem(BOARDING_STORAGE_KEY);
  return route.stops.find((stop) => stop.name === saved) ?? route.stops[0];
}

export function Tracking() {
  const { busId } = useParams();
  const { routes } = useRoutesContext();
  const route = findRouteByBusId(routes, busId);

  if (!route) {
    return (
      <Shell title="Live tracking" subtitle={`Bus ${busId}`}>
        <main className="page not-found">
          <p className="eyebrow">Bus {busId}</p>
          <h1>Bus not found</h1>
          <p>No bus with this ID is on the Karachi Red Bus network.</p>
          <Link className="primary-button" to="/">Back to routes</Link>
        </main>
      </Shell>
    );
  }

  return <TrackingView key={route.busId} route={route} busId={route.busId} />;
}

function TrackingView({ route, busId }) {
  const { demoMode, setDemoMode } = useDemoMode();
  const { positions } = useSimulation();
  const { location, error: listenerError, now } = useBusLocation(busId);
  const [selectedStop, setSelectedStop] = useState(() => readBoardingStop(route));
  const [followBus, setFollowBus] = useState(false);
  const [passengerPos, setPassengerPos] = useState(null);
  const [locationNote, setLocationNote] = useState(null);
  const mapRef = useRef(null);

  const busState = getBusState({ bus: demoMode ? positions[route.id] : location, demoMode, now });
  const activeBus = busState === 'demo' || busState === 'live'
    ? (demoMode ? positions[route.id] ?? null : location)
    : null;
  const busLat = activeBus?.latitude ?? null;
  const busLng = activeBus?.longitude ?? null;
  const busPosition = useMemo(() => (busLat != null ? [busLat, busLng] : null), [busLat, busLng]);

  const progress = useMemo(
    () => (busPosition ? getRouteProgress(route.stops, busPosition) : null),
    [route.stops, busPosition],
  );
  const nextStop = progress ? route.stops[progress.nextStopIndex] : null;

  const eta = busPosition && selectedStop
    ? estimateEta({
        busPosition,
        stopPosition: [selectedStop.lat, selectedStop.lng],
        gpsSpeedKmh: activeBus?.speed,
        routeMultiplier: route.roadMultiplier,
      })
    : null;

  const isLive = busState === 'live';
  const busIcon = useMemo(() => createBusIcon(isLive), [isLive]);
  const passengerIcon = useMemo(() => createPassengerIcon(), []);
  const routeBounds = useMemo(() => L.latLngBounds(route.stops.map((stop) => [stop.lat, stop.lng])), [route.stops]);
  const totalDistanceKm = useMemo(() => buildSegments(route.stops).totalDistance, [route.stops]);

  const handleZoomIn = useCallback(() => mapRef.current?.zoomIn(), []);
  const handleZoomOut = useCallback(() => mapRef.current?.zoomOut(), []);
  const handleFitRoute = useCallback(() => {
    mapRef.current?.fitBounds(routeBounds, { padding: [40, 40] });
  }, [routeBounds]);
  const handleToggleFollow = useCallback(() => setFollowBus((value) => !value), []);
  const handleUserDrag = useCallback(() => setFollowBus(false), []);
  const handleMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationNote('Location is not available on this device.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const point = [pos.coords.latitude, pos.coords.longitude];
        setPassengerPos(point);
        setLocationNote(null);
        mapRef.current?.setView(point, 14, { animate: true });
      },
      () => setLocationNote('Location is off. Allow it in browser settings to see where you are on the map.'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  const stateLabel = BUS_STATE_LABELS[busState];
  const labelText = isLive ? `${stateLabel} · updated ${formatSecondsAgo(location.lastUpdated, now)}` : stateLabel;
  const dotClass = busState === 'live' ? 'pulse-dot' : busState === 'demo' ? 'pulse-dot demo' : 'pulse-dot waiting';

  const routeLegs = route.stops.slice(0, -1).map((stop, index) => {
    const next = route.stops[index + 1];
    const distance = haversineDistance([stop.lat, stop.lng], [next.lat, next.lng]);
    return { key: `${stop.name}-${next.name}`, label: `${stop.name} → ${next.name}`, km: distance * route.roadMultiplier };
  });

  return (
    <Shell title="Live tracking" subtitle={`Bus ${route.busId} · ${route.id} — ${route.name}`}>
      {!isFirebaseConfigured && <ErrorBanner type="demo" />}
      <ErrorBanner type="listener" error={listenerError} />
      <main className="tracking-page">
        <div className="tracking-map-wrap">
          <TrackingMap
            mapRef={mapRef}
            route={route}
            selectedStop={selectedStop}
            onSelectStop={setSelectedStop}
            passengerPos={passengerPos}
            passengerIcon={passengerIcon}
            busPosition={busPosition}
            busIcon={busIcon}
            follow={followBus}
            onUserDrag={handleUserDrag}
          />

          <div className="map-top-label">
            <span className={dotClass} /> {labelText}
          </div>

          <div className="demo-toggle">
            <label>
              <input type="checkbox" checked={demoMode} onChange={(e) => setDemoMode(e.target.checked)} />
              <span>Demo Mode</span>
            </label>
          </div>

          {locationNote && <div className="map-note">{locationNote}</div>}

          <MapControls
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onMyLocation={handleMyLocation}
            onFitRoute={handleFitRoute}
            followBus={followBus}
            onToggleFollow={handleToggleFollow}
          />
        </div>

        <EtaPanel
          eta={eta}
          selectedStop={selectedStop}
          nextStopName={nextStop?.name ?? null}
          route={route}
          busData={activeBus}
          busState={busState}
          demoMode={demoMode}
          lastUpdated={demoMode ? null : location?.lastUpdated}
        />

        <div className="stop-list-section">
          <h3 className="stop-list-heading">Route Stops</h3>
          <StopList
            stops={route.stops}
            selectedStop={selectedStop}
            onSelect={setSelectedStop}
            nextStopIndex={progress?.nextStopIndex ?? 0}
          />
        </div>

        <div className="route-overview">
          <h3 className="stop-list-heading">Route Overview</h3>
          {routeLegs.map((leg) => (
            <div key={leg.key} className="route-overview-row">
              <span>{leg.label}</span>
              <em>~{leg.km.toFixed(1)} km</em>
            </div>
          ))}
          <div className="route-overview-row total">
            <span>Total route distance</span>
            <em>~{(totalDistanceKm * route.roadMultiplier).toFixed(1)} km</em>
          </div>
        </div>

        <DiagnosticsPanel lastSnapshotTime={location?.lastUpdated} />
      </main>
    </Shell>
  );
}
