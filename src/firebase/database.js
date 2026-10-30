import { onDisconnect, onValue, push, ref, serverTimestamp, set, update } from 'firebase/database';
import { database } from './config';
import { waitForAuth } from './auth';

export function describeFirebaseError(error) {
  const code = error?.code ?? '';
  if (code.includes('admin-restricted-operation') || code.includes('operation-not-allowed'))
    return 'Anonymous sign-in is disabled. Enable it in Firebase Console > Authentication > Sign-in method.';
  if (code.includes('PERMISSION_DENIED') || code.includes('permission-denied') || /permission_denied/i.test(error?.message ?? ''))
    return 'Firebase denied access. Check the database rules and that Anonymous sign-in is enabled.';
  if (code.includes('network')) return 'Network problem while contacting Firebase.';
  return error?.message ?? 'Unknown Firebase error.';
}

function listen(path, onData, onError) {
  if (!database) return () => undefined;
  let cancelled = false;
  let detach = () => undefined;
  waitForAuth()
    .then(() => {
      if (cancelled) return;
      detach = onValue(ref(database, path), (snapshot) => onData(snapshot.val()), (error) => onError?.(error));
    })
    .catch((error) => onError?.(error));
  return () => {
    cancelled = true;
    detach();
  };
}

export async function publishBusLocation(location) {
  if (!database) return false;
  await waitForAuth();
  await set(ref(database, `buses/${location.busId}`), { ...location, lastUpdated: serverTimestamp() });
  return true;
}

export async function setBusInactive(busId, routeId) {
  if (!database) return false;
  await waitForAuth();
  await update(ref(database, `buses/${busId}`), {
    busId,
    routeId,
    status: 'inactive',
    lastUpdated: serverTimestamp(),
  });
  return true;
}

export function armOnDisconnect(busId, routeId) {
  if (!database) return;
  waitForAuth()
    .then(() => {
      onDisconnect(ref(database, `buses/${busId}`)).update({
        busId,
        routeId,
        status: 'inactive',
        lastUpdated: serverTimestamp(),
      });
    })
    .catch(() => {});
}

export function cancelOnDisconnect(busId) {
  if (!database) return;
  waitForAuth()
    .then(() => {
      onDisconnect(ref(database, `buses/${busId}`)).cancel();
    })
    .catch(() => {});
}

export async function publishLostFoundReport(report) {
  if (!database) return false;
  await waitForAuth();
  await set(push(ref(database, 'lostFound')), report);
  return true;
}

export function subscribeToLostFound(onReports, onError) {
  return listen('lostFound', (value) => onReports(value ?? {}), onError);
}

export function subscribeToBus(busId, onLocation, onError) {
  return listen(`buses/${busId}`, (value) => {
    if (value) onLocation(value);
  }, onError);
}

export function subscribeToAllBuses(onBuses, onError) {
  return listen('buses', (value) => onBuses(value ?? {}), onError);
}

export function subscribeToRoutes(onRoutes, onError) {
  return listen('routes', (value) => onRoutes(value ?? {}), onError);
}

export function subscribeServerTimeOffset(onOffset) {
  if (!database) return () => undefined;
  return onValue(ref(database, '.info/serverTimeOffset'), (snapshot) => onOffset(snapshot.val() ?? 0));
}
