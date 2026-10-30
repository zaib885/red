import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { isFirebaseConfigured } from '@/firebase';
import { settings, DEMO_MODE_STORAGE_KEY } from '@/data/settings';

const DemoModeContext = createContext(null);

function defaultDemoMode() {
  if (settings.demoModePreference === 'on') return true;
  if (settings.demoModePreference === 'off') return false;
  return !isFirebaseConfigured;
}

function readStoredDemoMode() {
  const stored = localStorage.getItem(DEMO_MODE_STORAGE_KEY);
  if (stored === 'on') return true;
  if (stored === 'off') return false;
  return defaultDemoMode();
}

export function DemoModeProvider({ children }) {
  const [demoMode, setDemoModeState] = useState(readStoredDemoMode);

  const setDemoMode = useCallback((enabled) => {
    localStorage.setItem(DEMO_MODE_STORAGE_KEY, enabled ? 'on' : 'off');
    setDemoModeState(enabled);
  }, []);

  const value = useMemo(() => ({ demoMode, setDemoMode }), [demoMode, setDemoMode]);
  return <DemoModeContext.Provider value={value}>{children}</DemoModeContext.Provider>;
}

export function useDemoMode() {
  const value = useContext(DemoModeContext);
  if (!value) throw new Error('useDemoMode must be used inside DemoModeProvider');
  return value;
}
