import { signInAnonymously } from 'firebase/auth';
import { auth } from './config';

let authPromise = null;
let authError = null;
const errorListeners = new Set();

function setAuthError(error) {
  authError = error;
  errorListeners.forEach((listener) => listener());
}

export function getAuthError() {
  return authError;
}

export function subscribeAuthError(listener) {
  errorListeners.add(listener);
  return () => {
    errorListeners.delete(listener);
  };
}

export function dismissAuthError() {
  setAuthError(null);
}

export function getAuthUid() {
  return auth?.currentUser?.uid ?? null;
}

export function waitForAuth() {
  if (!auth) return Promise.resolve(null);
  if (!authPromise) {
    authPromise = (auth.currentUser
      ? Promise.resolve(auth.currentUser)
      : signInAnonymously(auth).then((cred) => cred.user))
      .then((user) => {
        if (authError) setAuthError(null);
        return user;
      })
      .catch((error) => {
        authPromise = null;
        setAuthError(error);
        throw error;
      });
  }
  return authPromise;
}
