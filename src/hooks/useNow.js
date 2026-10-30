import { useEffect, useState } from 'react';
import { getServerNow } from '@/firebase/serverClock';

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(getServerNow);

  useEffect(() => {
    const id = setInterval(() => setNow(getServerNow()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
