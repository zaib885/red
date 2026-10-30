const env = import.meta.env;

const positiveNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const settings = {
  demoModePreference: (env.VITE_DEMO_MODE || 'auto').toLowerCase(),
  averageBusSpeedKmh: positiveNumber(env.VITE_AVERAGE_BUS_SPEED_KMH, 20),
  minUsableGpsSpeedKmh: positiveNumber(env.VITE_MIN_USABLE_GPS_SPEED_KMH, 5),
  roadDistanceMultiplier: positiveNumber(env.VITE_ROAD_DISTANCE_MULTIPLIER, 1.35),
  staleAfterSeconds: positiveNumber(env.VITE_STALE_AFTER_SECONDS, 60),
  gpsWriteIntervalSeconds: positiveNumber(env.VITE_GPS_WRITE_INTERVAL_SECONDS, 3),
};

export const DEMO_LIVE_ROUTE_IDS = ['R9', 'R4'];
export const MIN_MOVE_METERS = 10;
export const DEMO_MODE_STORAGE_KEY = 'routvia-demo-mode';
export const BOARDING_STORAGE_KEY = 'routvia-boarding-stop';
export const DESTINATION_STORAGE_KEY = 'routvia-destination-stop';
