import { useState } from 'react';
import { Navigation, Play, Square, CircleAlert, Wifi, Signal, Radio } from 'lucide-react';
import { Shell } from '../components/Shell';
import { DiagnosticsPanel } from '../components/DiagnosticsPanel';
import { useRoutesContext } from '@/context/RoutesContext';
import { useGeolocationTrip } from '@/hooks/useGeolocationTrip';
import { useNow } from '@/hooks/useNow';
import { isFirebaseConfigured } from '@/firebase';
import { formatSecondsAgo } from '@/utils/time';

export function Driver() {
  const { routes } = useRoutesContext();
  const trip = useGeolocationTrip();
  const now = useNow();
  const [selectedId, setSelectedId] = useState(routes[0]?.id);
  const selectedRoute = routes.find((route) => route.id === selectedId) ?? routes[0];

  return (
    <Shell title="Driver panel" subtitle="Your assigned routes">
      <main className="page driver-page">
        {!isFirebaseConfigured && (
          <div className="driver-warning"><CircleAlert size={16} /> Firebase not configured — location will NOT be shared with passengers</div>
        )}
        {!trip.online && (
          <div className="driver-warning"><CircleAlert size={16} /> No internet connection — updates paused</div>
        )}
        <div className="driver-welcome">
          <div>
            <p className="eyebrow">Driver</p>
            <h1>Ready for the road?</h1>
          </div>
          <span className={`driver-status ${trip.tracking ? 'on' : ''}`}>
            <span className="pulse-dot" /> {trip.tracking ? 'On trip' : 'Offline'}
          </span>
        </div>

        <label className="select-label">Select your assigned route
          <select disabled={trip.tracking} value={selectedRoute?.id} onChange={(e) => setSelectedId(e.target.value)}>
            {routes.map((route) => <option key={route.id} value={route.id}>{route.id} — {route.name}</option>)}
          </select>
        </label>

        <section className="assigned-card">
          <div className="assigned-card-top">
            <div><span className="route-number large">{selectedRoute.id}</span><h2>{selectedRoute.name}</h2></div>
            <span className="bus-badge">{selectedRoute.busId}</span>
          </div>
          <div className="route-journey">
            <div><span>Starting point</span><strong>{selectedRoute.start}</strong></div>
            <div className="journey-line" />
            <div><span>Destination</span><strong>{selectedRoute.destination}</strong></div>
          </div>
          <div className="driver-stops">
            {selectedRoute.stops.map((stop, index) => <span key={stop.name} className={index === 0 ? 'first' : ''}><i /> {stop.name}</span>)}
          </div>
        </section>

        <section className="gps-card">
          <div className="gps-card-heading">
            <div className="gps-icon"><Navigation size={19} /></div>
            <div><h3>GPS status</h3><p>{trip.gpsStatus}</p></div>
            <span className={`connection-dot ${trip.tracking ? 'connected' : ''}`} />
          </div>
          {trip.lastFix && (
            <div className="coordinates">
              <span>Current coordinates</span>
              <strong>{trip.lastFix.latitude.toFixed(5)}, {trip.lastFix.longitude.toFixed(5)}</strong>
              <small>Accuracy ±{trip.lastFix.accuracy}m · Speed {trip.lastFix.speed} km/h</small>
            </div>
          )}
          <p className="last-sent">Last sent: {trip.lastSentAt ? formatSecondsAgo(trip.lastSentAt, now) : 'not yet'}</p>
          <div className="status-grid">
            <div><Signal size={14} /><span>GPS</span><strong>{trip.gpsStatus}</strong></div>
            <div><Wifi size={14} /><span>Firebase</span><strong>{trip.online ? trip.firebaseStatus : 'Offline'}</strong></div>
            <div><Radio size={14} /><span>Tracking</span><strong>{trip.trackingStatus}</strong></div>
          </div>
          {trip.tracking && trip.gpsError && (
            <button className="secondary-button full" onClick={trip.retryGps}>Retry GPS</button>
          )}
          {!trip.tracking ? (
            <button className="primary-button full trip-button" onClick={() => trip.startTrip(selectedRoute)}>
              <Play size={18} fill="currentColor" /> Start Trip
            </button>
          ) : (
            <button className="stop-button full trip-button" onClick={trip.stopTrip}>
              <Square size={16} fill="currentColor" /> Stop Trip
            </button>
          )}
        </section>
        <div className="driver-note">
          <CircleAlert size={16} />
          <span>
            Keep this screen open while driving. GPS works best over a secure HTTPS connection.
            {!trip.wakeLockSupported ? ' Screen wake lock is not supported on this device.' : ''}
          </span>
        </div>
        <DiagnosticsPanel lastWriteResult={trip.lastWriteResult} lastSnapshotTime={trip.lastSentAt} />
      </main>
    </Shell>
  );
}
