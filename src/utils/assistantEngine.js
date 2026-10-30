import { estimateEta } from './eta';
import { getRouteProgress, nearestStopName } from './geo';
import { findRouteById } from './routes';
import { minutesOfDay } from './time';

const DEMO_PREFIX = '(Demo Mode — simulated data) ';
const UNAVAILABLE = 'Sorry, live bus location is currently unavailable.';
const HELP =
  'I can help with bus locations, arrival times, active buses, next stops, and route info (R9, R4, R2). Try asking "Where is my bus?" or "When will it arrive?".';

const INTENT_PATTERNS = [
  ['next', /next stop|agla stop|next station|which stop/],
  ['eta', /\beta\b|arriv|when|how long|kab|kitni der|minutes? away/],
  ['location', /where|location|kahan|kidhar|near|track/],
  ['active', /active|available|running|chali|which buses|list/],
  ['routeInfo', /route|stops/],
];

function detectIntent(text) {
  return INTENT_PATTERNS.find(([, pattern]) => pattern.test(text))?.[0] ?? null;
}

function readMentions(text) {
  const route = text.match(/\br\s?(\d{1,2})\b/);
  const bus = text.match(/\bbus\s?(\d{2,4})\b/);
  return {
    routeId: route ? `R${route[1]}` : null,
    busId: bus ? `BUS${bus[1].padStart(3, '0')}` : null,
  };
}

function pickBus(ctx, mentions) {
  const { activeBuses, lastBus } = ctx;
  if (mentions.busId) {
    const bus = activeBuses.find((item) => item.busId === mentions.busId);
    return bus ? { bus } : { message: `Bus ${mentions.busId} is not active right now.` };
  }
  if (mentions.routeId) {
    const bus = activeBuses.find((item) => item.routeId === mentions.routeId);
    return bus ? { bus } : { message: `Route ${mentions.routeId} has no live bus right now.` };
  }
  const remembered = activeBuses.find((item) => item.busId === lastBus);
  if (remembered) return { bus: remembered };
  if (activeBuses.length === 1) return { bus: activeBuses[0] };
  const list = activeBuses.map((item) => `${item.busId} (${item.routeId})`).join(', ');
  return { message: `${list} are active. Which route do you mean? Try "R9" or "BUS001".` };
}

function describeActiveBuses({ routes, activeBuses, now }) {
  const nowMinutes = minutesOfDay(now);
  const liveRouteIds = new Set(activeBuses.map((bus) => bus.routeId));
  const notLive = routes.filter((route) => !liveRouteIds.has(route.id));
  const scheduled = notLive.filter((route) => route.departureMinutes > nowMinutes);
  const inactive = notLive.filter((route) => route.departureMinutes <= nowMinutes);

  const parts = [
    activeBuses.length > 0
      ? `${activeBuses.length} bus${activeBuses.length > 1 ? 'es' : ''} active: ${activeBuses.map((bus) => `${bus.busId} (${bus.routeId})`).join(', ')}.`
      : 'No buses are live right now.',
  ];
  if (scheduled.length > 0) {
    parts.push(`Scheduled, not live yet: ${scheduled.map((route) => `${route.busId} (${route.id}, ${route.departure})`).join(', ')}.`);
  }
  if (inactive.length > 0) {
    parts.push(`Not running: ${inactive.map((route) => `${route.busId} (${route.id})`).join(', ')}.`);
  }
  return parts.join(' ');
}

function describeEta({ bus, route, progress, savedBoarding, demoMode }) {
  const nextStop = route.stops[progress.nextStopIndex];
  const saved = route.stops.find((stop) => stop.name === savedBoarding);
  const savedIndex = saved ? route.stops.indexOf(saved) : -1;
  const passedSaved = saved && savedIndex < progress.nextStopIndex;
  const target = saved && !passedSaved ? saved : nextStop;

  const eta = estimateEta({
    busPosition: [bus.latitude, bus.longitude],
    stopPosition: [target.lat, target.lng],
    gpsSpeedKmh: bus.speed,
    routeMultiplier: route.roadMultiplier,
  });
  const speedNote = eta.usedFallbackSpeed
    ? 'based on average bus speed'
    : demoMode ? 'based on simulated speed' : 'based on current GPS speed';

  const notes = [];
  if (savedBoarding && !saved) notes.push(`Your saved stop ${savedBoarding} is not on this route, so the next stop is shown.`);
  if (passedSaved) notes.push(`Bus ${bus.busId} has already passed ${saved.name}.`);

  return [
    `Bus ${bus.busId} is approximately ${eta.etaMinutes} minutes away from ${target.name} (${speedNote}, road distance about ${eta.distanceKm.toFixed(1)} km).`,
    ...notes,
  ].join(' ');
}

export function answerQuestion(question, ctx) {
  const text = question.toLowerCase().trim();
  const prefix = ctx.demoMode ? DEMO_PREFIX : '';
  const reply = (body, extra = {}) => ({ text: `${prefix}${body}`, ...extra });

  if (/^(hi|hello|hey|salam|assalam)\b/.test(text)) {
    return reply('Hi! I can help with bus locations, ETA, active buses, next stops, and route info.');
  }
  if (/\bthank|shukria/.test(text)) {
    return reply("You're welcome! Let me know if you need anything else.");
  }

  const intent = detectIntent(text);
  if (!intent) return reply(HELP);

  const mentions = readMentions(text);

  if (intent === 'routeInfo') {
    const route = findRouteById(ctx.routes, mentions.routeId ?? ctx.lastRoute);
    if (!route) return reply('Tell me which route you mean, for example "What is the R9 route?"');
    const stops = route.stops.map((stop) => stop.name).join(' → ');
    return reply(`Route ${route.id} — ${route.name}. Runs from ${route.start} to ${route.destination}. Stops: ${stops}.`, { routeId: route.id });
  }

  if (intent === 'active') return reply(describeActiveBuses(ctx));

  if (ctx.activeBuses.length === 0 && !mentions.busId && !mentions.routeId) return { text: UNAVAILABLE };

  const pick = pickBus(ctx, mentions);
  if (!pick.bus) return reply(pick.message);

  const { bus } = pick;
  const memo = { busId: bus.busId, routeId: bus.routeId };
  const route = findRouteById(ctx.routes, bus.routeId);
  if (!route) return reply(`Bus ${bus.busId} is active on Route ${bus.routeId}, but its route details are unavailable.`, memo);

  const position = [bus.latitude, bus.longitude];
  const progress = getRouteProgress(route.stops, position);

  if (intent === 'next') {
    return reply(`The next stop for bus ${bus.busId} on route ${route.id} is ${route.stops[progress.nextStopIndex].name}.`, memo);
  }
  if (intent === 'location') {
    const nearest = nearestStopName(route.stops, position);
    const next = route.stops[progress.nextStopIndex].name;
    return reply(`Bus ${bus.busId} on Route ${route.id} is near ${nearest} and heading to ${next}.`, memo);
  }
  return reply(describeEta({ bus, route, progress, savedBoarding: ctx.savedBoarding, demoMode: ctx.demoMode }), memo);
}
