const EARTH_RADIUS_KM = 6371;
const KM_PER_DEG_LAT = 110.574;
const KM_PER_DEG_LNG_AT_EQUATOR = 111.32;

export function haversineDistance(from, to) {
  const latDelta = ((to[0] - from[0]) * Math.PI) / 180;
  const lngDelta = ((to[1] - from[1]) * Math.PI) / 180;
  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos((from[0] * Math.PI) / 180) * Math.cos((to[0] * Math.PI) / 180) * Math.sin(lngDelta / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function distanceMeters(from, to) {
  return haversineDistance(from, to) * 1000;
}

export function buildSegments(stops) {
  const segments = [];
  const stopDistances = [0];
  let cumulative = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    const from = [stops[i].lat, stops[i].lng];
    const to = [stops[i + 1].lat, stops[i + 1].lng];
    const dist = haversineDistance(from, to);
    segments.push({ from, to, dist, cumulative });
    cumulative += dist;
    stopDistances.push(cumulative);
  }
  return { segments, totalDistance: cumulative, stopDistances };
}

export function interpolateAlongRoute(segments, totalDistance, progressKm) {
  const target = Math.max(0, Math.min(progressKm, totalDistance));
  for (const seg of segments) {
    const segEnd = seg.cumulative + seg.dist;
    if (target <= segEnd) {
      const frac = seg.dist > 0 ? (target - seg.cumulative) / seg.dist : 0;
      return [
        seg.from[0] + (seg.to[0] - seg.from[0]) * frac,
        seg.from[1] + (seg.to[1] - seg.from[1]) * frac,
      ];
    }
  }
  const last = segments[segments.length - 1];
  return last ? last.to : [0, 0];
}

function projectOntoSegment(segment, position, cosLat) {
  const [fromLat, fromLng] = segment.from;
  const vx = (segment.to[1] - fromLng) * cosLat * KM_PER_DEG_LNG_AT_EQUATOR;
  const vy = (segment.to[0] - fromLat) * KM_PER_DEG_LAT;
  const px = (position[1] - fromLng) * cosLat * KM_PER_DEG_LNG_AT_EQUATOR;
  const py = (position[0] - fromLat) * KM_PER_DEG_LAT;
  const lengthSq = vx * vx + vy * vy;
  const t = lengthSq > 0 ? Math.min(1, Math.max(0, (px * vx + py * vy) / lengthSq)) : 0;
  return { t, distance: Math.hypot(px - t * vx, py - t * vy) };
}

export function getRouteProgress(stops, position) {
  const { segments, stopDistances } = buildSegments(stops);
  if (segments.length === 0) return { nextStopIndex: 0, passedCount: 0, progressKm: 0, offRouteKm: 0 };

  const cosLat = Math.cos((position[0] * Math.PI) / 180);
  let best = { distance: Infinity, progressKm: 0 };
  for (const segment of segments) {
    const { t, distance } = projectOntoSegment(segment, position, cosLat);
    if (distance < best.distance) {
      best = { distance, progressKm: segment.cumulative + t * segment.dist };
    }
  }

  const found = stopDistances.findIndex((distance) => distance > best.progressKm);
  const nextStopIndex = found === -1 ? stops.length - 1 : found;
  return {
    nextStopIndex,
    passedCount: nextStopIndex,
    progressKm: best.progressKm,
    offRouteKm: best.distance,
  };
}

export function nearestStopName(stops, position) {
  let nearest = stops[0];
  let minDist = Infinity;
  for (const stop of stops) {
    const dist = haversineDistance(position, [stop.lat, stop.lng]);
    if (dist < minDist) {
      minDist = dist;
      nearest = stop;
    }
  }
  return nearest.name;
}
