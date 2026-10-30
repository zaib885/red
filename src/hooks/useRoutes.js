import { useEffect, useState } from 'react';
import { subscribeToRoutes } from '@/firebase';
import { fallbackRoutes } from '@/data/routes';
import { settings } from '@/data/settings';

const isValidStop = (stop) =>
  stop && typeof stop.name === 'string' && Number.isFinite(stop.lat) && Number.isFinite(stop.lng);

export function mergeRemoteRoutes(remote) {
  return Object.entries(remote)
    .map(([id, data]) => {
      const local = fallbackRoutes.find((route) => route.id === id);
      const stops = Object.values(data?.stops ?? {}).filter(isValidStop);
      return {
        id,
        name: data?.routeName ?? local?.name ?? id,
        busId: data?.busId ?? local?.busId ?? null,
        departure: data?.departure ?? local?.departure ?? '—',
        departureMinutes: data?.departureMinutes ?? local?.departureMinutes ?? 0,
        roadMultiplier: data?.roadMultiplier ?? local?.roadMultiplier ?? settings.roadDistanceMultiplier,
        start: data?.startPoint ?? local?.start ?? '',
        destination: data?.endPoint ?? local?.destination ?? '',
        stops: stops.length > 0 ? stops : (local?.stops ?? []),
      };
    })
    .filter((route) => route.busId && route.stops.length >= 2);
}

export function useRoutes() {
  const [routes, setRoutes] = useState(fallbackRoutes);
  const [error, setError] = useState(null);

  useEffect(
    () =>
      subscribeToRoutes((remote) => {
        const merged = mergeRemoteRoutes(remote);
        setRoutes(merged.length > 0 ? merged : fallbackRoutes);
        setError(null);
      }, setError),
    [],
  );

  return { routes, error };
}
