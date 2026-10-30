import { UserRound, Clock3, MapPin, Navigation } from 'lucide-react';
import { StatusPill } from './StatusPill';
import { estimateEta } from '@/utils/eta';

export function RouteCard({ route, status, busData, boardingStop, onClick }) {
  const isLive = status === 'Live' || status === 'Demo-Live';
  const pillStatus = status === 'Demo-Live' ? 'Live' : status;

  let etaLabel = 'No live data';
  if (isLive && busData && boardingStop) {
    const eta = estimateEta({
      busPosition: [busData.latitude, busData.longitude],
      stopPosition: [boardingStop.lat, boardingStop.lng],
      gpsSpeedKmh: busData.speed,
      routeMultiplier: route.roadMultiplier,
    });
    etaLabel = `~${eta.etaMinutes} min`;
  }

  return (
    <button className="route-card" onClick={onClick} data-status={status.toLowerCase()}>
      <div className="route-line">
        <span className="route-number">{route.id}</span>
        <span className="route-name">{route.name}</span>
        <StatusPill status={pillStatus} extra={status === 'Demo-Live' ? 'Demo' : null} />
      </div>
      <div className="route-meta">
        <span><UserRound size={13} /> {route.busId}</span>
        <span><Clock3 size={13} /> {route.departure}</span>
      </div>
      <div className="route-bottom">
        <span className="route-path">
          <MapPin size={12} /> {route.start} <i>→</i> {route.destination} <Navigation size={11} />
        </span>
        <span className={`eta ${status === 'Inactive' || status === 'Scheduled' ? 'muted' : ''}`}>{etaLabel}</span>
      </div>
      <span className="view-link">View Live Tracking <span>↗</span></span>
    </button>
  );
}
