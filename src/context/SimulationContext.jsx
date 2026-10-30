import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useDemoMode } from './DemoModeContext';
import { useRoutesContext } from './RoutesContext';
import { buildSegments, interpolateAlongRoute } from '@/utils/geo';
import { settings } from '@/data/settings';
import { getServerNow } from '@/firebase/serverClock';

const SIMULATION_TICK_MS = 1000;

const SimulationContext = createContext(null);

export function SimulationProvider({ children }) {
  const { demoMode } = useDemoMode();
  const { routes } = useRoutesContext();
  const [positions, setPositions] = useState({});
  const progressRef = useRef({});

  const routeMetrics = useMemo(
    () => Object.fromEntries(routes.map((route) => [route.id, buildSegments(route.stops)])),
    [routes],
  );

  useEffect(() => {
    if (!demoMode) {
      setPositions({});
      return undefined;
    }

    let lastTick = performance.now();
    const tick = () => {
      const current = performance.now();
      const elapsedSeconds = (current - lastTick) / 1000;
      lastTick = current;

      const next = {};
      for (const route of routes) {
        const metrics = routeMetrics[route.id];
        if (!metrics || metrics.totalDistance <= 0) continue;

        const previous = progressRef.current[route.id] ?? 0;
        const progressKm = (previous + (settings.averageBusSpeedKmh / 3600) * elapsedSeconds) % metrics.totalDistance;
        progressRef.current[route.id] = progressKm;

        const [latitude, longitude] = interpolateAlongRoute(metrics.segments, metrics.totalDistance, progressKm);
        next[route.id] = {
          busId: route.busId,
          routeId: route.id,
          latitude,
          longitude,
          speed: settings.averageBusSpeedKmh,
          accuracy: 15,
          status: 'active',
          lastUpdated: getServerNow(),
        };
      }
      setPositions(next);
    };

    tick();
    const id = setInterval(tick, SIMULATION_TICK_MS);
    return () => clearInterval(id);
  }, [demoMode, routes, routeMetrics]);

  const value = useMemo(() => ({ positions }), [positions]);
  return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>;
}

export function useSimulation() {
  const value = useContext(SimulationContext);
  if (!value) throw new Error('useSimulation must be used inside SimulationProvider');
  return value;
}
