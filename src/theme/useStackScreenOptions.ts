import type { Stack } from 'expo-router';
import type { ComponentProps } from 'react';

import { useTheme } from './useTheme';

// The object form of a Stack's screenOptions, taken from Expo Router itself so
// the app doesn't import React Navigation directly.
type StackScreenOptions = Exclude<
  ComponentProps<typeof Stack>['screenOptions'],
  ((...args: never[]) => unknown) | undefined
>;

// Native stack headers styled from the theme, shared by every stack so headers
// look the same everywhere.
export function useStackScreenOptions(): StackScreenOptions {
  const { colors } = useTheme();
  return {
    headerStyle: { backgroundColor: colors.background },
    headerTintColor: colors.accent,
    headerTitleStyle: { color: colors.text },
    headerShadowVisible: false,
    contentStyle: { backgroundColor: colors.background },
    // Android's default zoom and fade stutters on low-end phones. A slide
    // matches iOS, which ignores this option and keeps its own.
    animation: 'slide_from_right',
  };
}
