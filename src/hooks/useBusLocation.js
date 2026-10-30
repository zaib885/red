import { useEffect, useState } from 'react';
import { subscribeToBus } from '@/firebase';
import { useNow } from './useNow';

export function useBusLocation(busId) {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLocation(null);
    setError(null);
    return subscribeToBus(busId, setLocation, setError);
  }, [busId]);

  const now = useNow();
  return { location, error, now };
}
