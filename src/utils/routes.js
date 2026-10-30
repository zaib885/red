export function findRouteById(routes, routeId) {
  return routes.find((route) => route.id === routeId) ?? null;
}

export function findRouteByBusId(routes, busId) {
  return routes.find((route) => route.busId === busId) ?? null;
}

export function allStopNames(routes) {
  return [...new Set(routes.flatMap((route) => route.stops.map((stop) => stop.name)))];
}

export function knownBusIds(routes) {
  return [...new Set(routes.map((route) => route.busId))];
}
