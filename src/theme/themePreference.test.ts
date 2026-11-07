import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

import { applyThemePreference, loadThemePreference, saveThemePreference } from './themePreference';

describe('theme preference', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  afterEach(() => jest.restoreAllMocks());

  it('follows the phone when nothing has been chosen', async () => {
    expect(await loadThemePreference()).toBe('system');
  });

  it('returns the saved choice', async () => {
    await saveThemePreference('dark');
    expect(await loadThemePreference()).toBe('dark');
  });

  it('follows the phone when the stored value is not a theme', async () => {
    await AsyncStorage.setItem('fittracker-theme', 'sepia');
    expect(await loadThemePreference()).toBe('system');
  });

  it('follows the phone when storage cannot be read', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('storage unavailable'));
    // The failure is logged in development; that output is expected here.
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(await loadThemePreference()).toBe('system');
  });

  it('applies light and dark as overrides and system as no override', () => {
    const setColorScheme = jest.spyOn(Appearance, 'setColorScheme').mockImplementation(() => {});

    applyThemePreference('dark');
    applyThemePreference('light');
    applyThemePreference('system');

    expect(setColorScheme.mock.calls).toEqual([['dark'], ['light'], ['unspecified']]);
  });
});
