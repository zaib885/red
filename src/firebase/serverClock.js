import { subscribeServerTimeOffset } from './database';

let serverOffsetMs = 0;

export function getServerNow() {
  return Date.now() + serverOffsetMs;
}

export function startServerClock() {
  return subscribeServerTimeOffset((offset) => {
    serverOffsetMs = offset;
  });
}
