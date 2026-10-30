import { settings, DEMO_LIVE_ROUTE_IDS } from '@/data/settings';

export const BUS_STATE_LABELS = {
  live: 'Live',
  demo: 'Demo (simulated)',
  waiting: 'Waiting for Driver Location',
  ended: 'Trip ended / Inactive',
};

export function isFreshActive(bus, now) {
  if (!bus || bus.status !== 'active' || typeof bus.lastUpdated !== 'number') return false;
  return (now - bus.lastUpdated) / 1000 < settings.staleAfterSeconds;
}

export function getBusState({ bus, demoMode, now }) {
  if (demoMode) return 'demo';
  if (!bus) return 'waiting';
  if (bus.status === 'inactive') return 'ended';
  return isFreshActive(bus, now) ? 'live' : 'waiting';
}

export function listFreshActiveBuses(buses, now) {
  return Object.entries(buses)
    .filter(([, bus]) => isFreshActive(bus, now))
    .map(([busId, bus]) => ({ ...bus, busId }));
}

export function isDemoLiveRoute(routeId, demoMode) {
  return demoMode && DEMO_LIVE_ROUTE_IDS.includes(routeId);
}

export function getRouteStatus({ route, bus, demoLive, now, nowMinutes }) {
  if (demoLive) return 'Demo-Live';
  if (isFreshActive(bus, now)) return 'Live';
  if (route.departureMinutes > nowMinutes) return 'Scheduled';
  return 'Inactive';
}
