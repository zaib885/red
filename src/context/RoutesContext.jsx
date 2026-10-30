import { createContext, useContext, useMemo } from 'react';
import { useRoutes } from '@/hooks/useRoutes';

const RoutesContext = createContext(null);

export function RoutesProvider({ children }) {
  const { routes, error } = useRoutes();
  const value = useMemo(() => ({ routes, error }), [routes, error]);
  return <RoutesContext.Provider value={value}>{children}</RoutesContext.Provider>;
}

export function useRoutesContext() {
  const value = useContext(RoutesContext);
  if (!value) throw new Error('useRoutesContext must be used inside RoutesProvider');
  return value;
}
