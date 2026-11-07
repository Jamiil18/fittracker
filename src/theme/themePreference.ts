import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
import { z } from 'zod';

import { logger } from '@/lib/logger';

const storageKey = 'fittracker-theme';

const themePreferenceSchema = z.enum(['system', 'light', 'dark']);

export type ThemePreference = z.infer<typeof themePreferenceSchema>;

// Anything missing, unreadable or unexpected falls back to following the phone.
export async function loadThemePreference(): Promise<ThemePreference> {
  try {
    const stored = themePreferenceSchema.safeParse(await AsyncStorage.getItem(storageKey));
    return stored.success ? stored.data : 'system';
  } catch (error) {
    logger.error('load theme', error);
    return 'system';
  }
}

export async function saveThemePreference(preference: ThemePreference): Promise<void> {
  await AsyncStorage.setItem(storageKey, preference);
}

// Overrides the colour scheme for the whole app, so useColorScheme (and with
// it useTheme) and native parts such as the keyboard all follow the choice.
export function applyThemePreference(preference: ThemePreference): void {
  Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
}
