import { useCallback, useEffect, useState } from 'react';
import { isFirebaseConfigured, subscribeToLostFound } from '@/firebase';
import { demoItems } from '@/data/demoItems';

export function useLostFound() {
  const [remoteItems, setRemoteItems] = useState([]);
  const [localItems, setLocalItems] = useState([]);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isFirebaseConfigured) return undefined;
    return subscribeToLostFound(
      (value) => {
        const items = Object.entries(value).map(([id, item]) => ({ id, ...item }));
        setRemoteItems(items.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)));
        setError(null);
        setLoading(false);
      },
      (listenError) => {
        setError(listenError);
        setLoading(false);
      },
    );
  }, []);

  const addLocalReport = useCallback((report) => {
    setLocalItems((current) => [report, ...current]);
  }, []);

  const items = isFirebaseConfigured ? remoteItems : [...localItems, ...demoItems];
  return { items, loading, error, addLocalReport };
}
