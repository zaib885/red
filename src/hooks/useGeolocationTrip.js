import { useCallback, useEffect, useRef, useState } from 'react';
import {
  armOnDisconnect,
  cancelOnDisconnect,
  describeFirebaseError,
  isFirebaseConfigured,
  publishBusLocation,
  setBusInactive,
} from '@/firebase';
import { getServerNow } from '@/firebase/serverClock';
import { settings, MIN_MOVE_METERS } from '@/data/settings';
import { distanceMeters } from '@/utils/geo';
import { useOnlineStatus } from './useOnlineStatus';

const GPS_ERROR_MESSAGES = {
  1: 'Location permission denied. Enable location for this site in browser settings.',
  2: 'GPS signal unavailable.',
  3: 'Location request timed out. Retrying…',
};

export function useGeolocationTrip() {
  const online = useOnlineStatus();
  const [tracking, setTracking] = useState(false);
  const [trackingStatus, setTrackingStatus] = useState('Not started');
  const [gpsStatus, setGpsStatus] = useState('Waiting to start');
  const [gpsError, setGpsError] = useState(false);
  const [firebaseStatus, setFirebaseStatus] = useState(isFirebaseConfigured ? 'Not connected yet' : 'Not configured');
  const [lastFix, setLastFix] = useState(null);
  const [lastSentAt, setLastSentAt] = useState(null);
  const [lastWriteResult, setLastWriteResult] = useState(null);

  const activeRef = useRef(false);
  const routeRef = useRef(null);
  const watchIdRef = useRef(null);
  const wakeLockRef = useRef(null);
  const lastSentRef = useRef(null);
  const lastFixRef = useRef(null);
  const pendingRef = useRef(null);

  const sendLocation = useCallback(async (location) => {
    setFirebaseStatus('Sending');
    try {
      const written = await publishBusLocation(location);
      if (!written) {
        setFirebaseStatus('Not configured');
        setLastWriteResult('Not sent: Firebase is not configured');
        return;
      }
      const sentAt = getServerNow();
      lastSentRef.current = { time: sentAt, latitude: location.latitude, longitude: location.longitude };
      setLastSentAt(sentAt);
      setLastWriteResult('Success');
      setFirebaseStatus('Connected');
    } catch (error) {
      setFirebaseStatus('Error');
      setLastWriteResult(`Error: ${describeFirebaseError(error)}`);
    }
  }, []);

  const handleFix = useCallback((position) => {
    const route = routeRef.current;
    if (!route) return;

    const { latitude, longitude, speed, accuracy } = position.coords;
    const location = {
      busId: route.busId,
      routeId: route.id,
      latitude,
      longitude,
      speed: speed != null && speed > 0 ? Math.round(speed * 3.6) : 0,
      accuracy: Math.round(accuracy ?? 0),
      status: 'active',
    };
    lastFixRef.current = location;
    setLastFix(location);
    setGpsError(false);
    setGpsStatus(location.accuracy > 50 ? 'Weak GPS accuracy' : 'Good GPS lock');

    const last = lastSentRef.current;
    const now = getServerNow();
    const moved = last ? distanceMeters([last.latitude, last.longitude], [latitude, longitude]) : Infinity;
    const due = !last || now - last.time >= settings.gpsWriteIntervalSeconds * 1000 || moved > MIN_MOVE_METERS;
    if (!due) return;

    if (!navigator.onLine) {
      pendingRef.current = location;
      setFirebaseStatus('Offline');
      return;
    }
    sendLocation(location);
  }, [sendLocation]);

  const handleGeoError = useCallback((error) => {
    if (error.code === 3) {
      setGpsStatus(GPS_ERROR_MESSAGES[3]);
      return;
    }
    setGpsError(true);
    setGpsStatus(GPS_ERROR_MESSAGES[error.code] ?? 'GPS unavailable.');
  }, []);

  const beginWatch = useCallback(() => {
    if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
    watchIdRef.current = navigator.geolocation.watchPosition(handleFix, handleGeoError, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  }, [handleFix, handleGeoError]);

  const acquireWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator) || wakeLockRef.current) return;
    try {
      const lock = await navigator.wakeLock.request('screen');
      if (!activeRef.current) {
        lock.release().catch(() => {});
        return;
      }
      wakeLockRef.current = lock;
      lock.addEventListener('release', () => {
        if (wakeLockRef.current === lock) wakeLockRef.current = null;
      });
    } catch {
      wakeLockRef.current = null;
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    const lock = wakeLockRef.current;
    wakeLockRef.current = null;
    lock?.release().catch(() => {});
  }, []);

  const startTrip = useCallback((route) => {
    if (activeRef.current) return;
    activeRef.current = true;
    routeRef.current = route;
    setTracking(true);
    setTrackingStatus('Tracking');
    setGpsError(false);
    armOnDisconnect(route.busId, route.id);
    acquireWakeLock();

    if (!window.isSecureContext) {
      setGpsError(true);
      setGpsStatus('GPS needs HTTPS. Open this page through your secure (https) link.');
      return;
    }
    if (!navigator.geolocation) {
      setGpsError(true);
      setGpsStatus('GPS is not available on this device.');
      return;
    }
    setGpsStatus('Acquiring GPS signal…');
    beginWatch();
  }, [acquireWakeLock, beginWatch]);

  const retryGps = useCallback(() => {
    if (!activeRef.current || !navigator.geolocation) return;
    setGpsError(false);
    setGpsStatus('Acquiring GPS signal…');
    beginWatch();
  }, [beginWatch]);

  const stopTrip = useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    activeRef.current = false;
    releaseWakeLock();
    pendingRef.current = null;

    setTracking(false);
    setTrackingStatus('Trip Stopped');
    setGpsStatus('Stopped');
    setGpsError(false);

    const route = routeRef.current;
    routeRef.current = null;
    if (!route) return;

    cancelOnDisconnect(route.busId);
    const last = lastFixRef.current;
    lastFixRef.current = null;
    const write = last
      ? publishBusLocation({ ...last, status: 'inactive' })
      : setBusInactive(route.busId, route.id);
    write
      .then((written) => {
        if (!written) return;
        setLastWriteResult('Trip ended: bus set to inactive');
        setFirebaseStatus('Connected');
      })
      .catch((error) => {
        setFirebaseStatus('Error');
        setLastWriteResult(`Error: ${describeFirebaseError(error)}`);
      });
  }, [releaseWakeLock]);

  useEffect(() => {
    if (online && activeRef.current && pendingRef.current) {
      const pending = pendingRef.current;
      pendingRef.current = null;
      sendLocation(pending);
    }
  }, [online, sendLocation]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && activeRef.current) acquireWakeLock();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [acquireWakeLock]);

  useEffect(() => () => {
    if (activeRef.current) stopTrip();
  }, [stopTrip]);

  return {
    tracking,
    trackingStatus,
    gpsStatus,
    gpsError,
    firebaseStatus,
    lastFix,
    lastSentAt,
    lastWriteResult,
    online,
    wakeLockSupported: 'wakeLock' in navigator,
    startTrip,
    stopTrip,
    retryGps,
  };
}
