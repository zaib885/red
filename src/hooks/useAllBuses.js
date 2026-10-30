import { useEffect, useState } from 'react';
import { subscribeToAllBuses } from '@/firebase';
import { useNow } from './useNow';

export function useAllBuses() {
  const [buses, setBuses] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => subscribeToAllBuses(setBuses, setError), []);

  const now = useNow();
  return { buses, error, now };
}
