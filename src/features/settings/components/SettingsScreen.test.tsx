import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { render, screen, userEvent } from '@testing-library/react-native';
import { Appearance } from 'react-native';

import { useOutbox } from '@/lib/outbox/outboxStore';
import { useIsOffline } from '@/lib/useIsOffline';
import { ThemePreferenceProvider } from '@/theme/ThemePreferenceProvider';

import type { Profile } from '../api/profile';
import { SettingsScreen } from './SettingsScreen';

const userId = '6f1c7a52-8d3e-4b0a-9c55-2e6f1d7b8a90';
const profileKey = ['profile', userId];

jest.mock('@/lib/useIsOffline', () => ({ useIsOffline: jest.fn(() => false) }));
jest.mock('@/features/auth/api/auth', () => ({ signOut: jest.fn() }));
jest.mock('@/features/auth/components/SessionProvider', () => ({
  useSession: () => ({ user: { id: 'user-1', email: 'lifter@example.com' } }),
}));

// The result of the next profile update, set by each test.
let mockUpdateResult: { data: object | null; error: object | null };
const mockUpdate = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      update: (changes: object) => {
        mockUpdate(changes);
        return { eq: () => ({ select: () => ({ single: async () => mockUpdateResult }) }) };
      },
    }),
  },
}));

const profile: Profile = {
  id: userId,
  weightUnit: 'kg',
  distanceUnit: 'km',
  defaultRestSeconds: 120,
  onboardingCompleted: true,
  displayName: null,
  dateOfBirth: null,
  heightCm: null,
  sex: null,
};

const savedRow = {
  id: userId,
  weight_unit: 'lb',
  distance_unit: 'km',
  default_rest_seconds: 120,
  onboarding_completed_at: '2026-10-03T12:00:00+00:00',
  display_name: null,
  date_of_birth: null,
  height_cm: null,
  sex: null,
};

// Reads the profile from the cache the way the route does, without a request,
// so the screen re-renders when a save changes it.
function SettingsFromCache() {
  const { data } = useQuery({
    queryKey: profileKey,
    queryFn: () => profile,
    staleTime: Infinity,
  });
  return data ? <SettingsScreen profile={data} /> : null;
}

async function renderSettings() {
  // No clean-up timers: a finished save would otherwise keep Jest waiting for
  // five minutes after the tests end.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { gcTime: Infinity }, mutations: { gcTime: 0 } },
  });
  queryClient.setQueryData(profileKey, profile);
  await render(
    <QueryClientProvider client={queryClient}>
      <ThemePreferenceProvider>
        <SettingsFromCache />
      </ThemePreferenceProvider>
    </QueryClientProvider>,
  );
}

function weightUnit(label: string) {
  return screen.getByRole('radio', { name: label });
}

describe('SettingsScreen', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    useOutbox.setState({ items: [] });
    jest.spyOn(Appearance, 'setColorScheme').mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  it('saves a changed weight unit and keeps the distance unit', async () => {
    mockUpdateResult = { data: savedRow, error: null };
    const user = userEvent.setup();
    await renderSettings();

    await user.press(weightUnit('lb'));

    expect(mockUpdate).toHaveBeenCalledWith({ weight_unit: 'lb' });
    expect(weightUnit('lb')).toBeChecked();
    expect(screen.getByRole('radio', { name: 'km' })).toBeChecked();
  });

  it('puts the old unit back and says why when the save fails', async () => {
    mockUpdateResult = { data: null, error: { message: 'TypeError: Network request failed' } };
    const user = userEvent.setup();
    await renderSettings();

    await user.press(weightUnit('lb'));

    expect(
      await screen.findByText(
        "Your units weren't changed. You're offline. Connect to the internet and try again.",
      ),
    ).toBeOnTheScreen();
    expect(weightUnit('kg')).toBeChecked();
  });

  it('turns the unit controls off when offline, but not the theme', async () => {
    (useIsOffline as jest.Mock).mockReturnValue(true);
    await renderSettings();

    expect(
      screen.getByText(
        "You're offline. Connect to the internet to change units or the default rest.",
      ),
    ).toBeOnTheScreen();
    expect(weightUnit('lb')).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'mi' })).toBeDisabled();
    expect(await screen.findByRole('radio', { name: 'Dark' })).toBeEnabled();

    (useIsOffline as jest.Mock).mockReturnValue(false);
  });

  it.each([
    [1, "Signing out deletes 1 finished workout that hasn't synced yet from this phone."],
    [2, "Signing out deletes 2 finished workouts that haven't synced yet from this phone."],
  ])('warns about %i unsynced workouts in a correct sentence', async (count, warning) => {
    for (let index = 0; index < count; index += 1) {
      useOutbox
        .getState()
        .add({ id: `workout-${index}`, kind: 'workout', userId: 'user-1', payload: {} });
    }
    const user = userEvent.setup();
    await renderSettings();

    await user.press(screen.getByText('Sign out'));

    expect(await screen.findByText(warning)).toBeOnTheScreen();
  });

  it('applies a chosen theme and remembers it on the phone', async () => {
    const user = userEvent.setup();
    await renderSettings();

    await user.press(await screen.findByRole('radio', { name: 'Dark' }));

    expect(Appearance.setColorScheme).toHaveBeenLastCalledWith('dark');
    expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked();
    expect(await AsyncStorage.getItem('fittracker-theme')).toBe('dark');
  });
});
