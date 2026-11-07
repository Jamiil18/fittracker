import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { logger } from '@/lib/logger';

import {
  applyThemePreference,
  loadThemePreference,
  saveThemePreference,
  type ThemePreference,
} from './themePreference';

type ThemePreferenceContextValue = {
  preference: ThemePreference;
  // True until the saved choice has been read and applied; the splash screen
  // stays up meanwhile so the app never opens in one theme and flips.
  isLoading: boolean;
  setPreference: (preference: ThemePreference) => void;
};

const ThemePreferenceContext = createContext<ThemePreferenceContextValue | null>(null);

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const [preference, setStoredPreference] = useState<ThemePreference>('system');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    // loadThemePreference never rejects; it falls back to "system".
    void loadThemePreference().then((saved) => {
      if (!active) return;
      applyThemePreference(saved);
      setStoredPreference(saved);
      setIsLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  function setPreference(next: ThemePreference) {
    applyThemePreference(next);
    setStoredPreference(next);
    // If saving fails the theme still changes now; it just won't be
    // remembered next launch.
    saveThemePreference(next).catch((error: unknown) => logger.error('save theme', error));
  }

  return (
    <ThemePreferenceContext.Provider value={{ preference, isLoading, setPreference }}>
      {children}
    </ThemePreferenceContext.Provider>
  );
}

export function useThemePreference(): ThemePreferenceContextValue {
  const context = useContext(ThemePreferenceContext);
  if (!context) {
    throw new Error('useThemePreference must be used inside ThemePreferenceProvider');
  }
  return context;
}
