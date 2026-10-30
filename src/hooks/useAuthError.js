import { useSyncExternalStore } from 'react';
import { getAuthError, subscribeAuthError } from '@/firebase/auth';

export function useAuthError() {
  return useSyncExternalStore(subscribeAuthError, getAuthError, getAuthError);
}
