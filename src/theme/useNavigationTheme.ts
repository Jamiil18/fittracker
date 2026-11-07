import { DarkTheme, DefaultTheme, type Theme } from 'expo-router';

import { useTheme } from './useTheme';

// Navigation paints its own background and card colours behind and between
// screens, for example at the edges while one screen slides over another.
// Without this it would use React Navigation's built-in light theme even in
// dark mode, which shows as a white flash during transitions.
export function useNavigationTheme(): Theme {
  const { scheme, colors } = useTheme();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      primary: colors.accent,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.separator,
      notification: colors.error,
    },
  };
}
