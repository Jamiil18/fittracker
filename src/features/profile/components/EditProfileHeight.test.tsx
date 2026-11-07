import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Appearance } from 'react-native';

import { OnboardingScreen } from '@/features/auth/components/OnboardingScreen';
import type { Profile } from '@/features/settings/api/profile';
import { SettingsScreen } from '@/features/settings/components/SettingsScreen';
import { ThemePreferenceProvider } from '@/theme/ThemePreferenceProvider';

import { EditProfileForm } from './EditProfileForm';
import { ProfileScreen } from './ProfileScreen';

const userId = '6f1c7a52-8d3e-4b0a-9c55-2e6f1d7b8a90';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
  useNavigation: () => ({ addListener: () => () => undefined, dispatch: jest.fn() }),
}));
jest.mock('@/features/auth/api/auth', () => ({ signOut: jest.fn() }));
jest.mock('@/features/auth/components/SessionProvider', () => ({
  useSession: () => ({ user: { id: '6f1c7a52-8d3e-4b0a-9c55-2e6f1d7b8a90' } }),
}));

// One profiles row, written and read the way the database does it. The
// height column is numeric(4, 1), so it keeps one decimal place.
const mockRow: Record<string, unknown> = {
  id: '6f1c7a52-8d3e-4b0a-9c55-2e6f1d7b8a90',
  weight_unit: 'kg',
  distance_unit: 'km',
  default_rest_seconds: 120,
  onboarding_completed_at: null,
  display_name: null,
  date_of_birth: null,
  height_cm: null,
  sex: null,
};
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      upsert: async () => ({ error: null }),
      update: (changes: Record<string, unknown>) => {
        for (const [column, value] of Object.entries(changes)) {
          if (value === undefined) continue;
          mockRow[column] =
            column === 'height_cm' && typeof value === 'number'
              ? Math.round(value * 10) / 10
              : value;
        }
        return {
          eq: () => ({
            select: () => ({ single: async () => ({ data: { ...mockRow }, error: null }) }),
          }),
        };
      },
    }),
  },
}));

function cachedProfile(queryClient: QueryClient): Profile {
  const profile = queryClient.getQueryData<Profile>(['profile', userId]);
  if (!profile) throw new Error('No profile in the cache');
  return profile;
}

describe('height through onboarding, Settings and Edit profile', () => {
  beforeEach(() => {
    jest.spyOn(Appearance, 'setColorScheme').mockImplementation(() => {});
  });

  it('still shows 180 cm after saving Edit profile in miles and switching back to km', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { gcTime: Infinity, staleTime: Infinity, retry: false },
        mutations: { gcTime: Infinity },
      },
    });
    queryClient.setQueryData(['body-entries', userId], []);
    queryClient.setQueryData(['training-history', userId], []);
    queryClient.setQueryData(['cardio-sessions', userId], []);
    queryClient.setQueryData(['exercises', userId], []);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <ThemePreferenceProvider>{children}</ThemePreferenceProvider>
      </QueryClientProvider>
    );

    // Onboarding: 180 cm with kilometres.
    const onboarding = await render(
      <OnboardingScreen
        profile={{
          id: userId,
          weightUnit: 'kg',
          distanceUnit: 'km',
          defaultRestSeconds: 120,
          onboardingCompleted: false,
          displayName: null,
          dateOfBirth: null,
          heightCm: null,
          sex: null,
        }}
      />,
      { wrapper },
    );
    await user.type(screen.getByLabelText('Height (optional)'), '180');
    await user.press(screen.getByRole('button', { name: 'Get started' }));
    expect(cachedProfile(queryClient).heightCm).toBe(180);
    await onboarding.unmount();

    // Settings: distances in miles.
    let settings = await render(<SettingsScreen profile={cachedProfile(queryClient)} />, {
      wrapper,
    });
    await user.press(screen.getByRole('radio', { name: 'mi' }));
    expect(cachedProfile(queryClient).distanceUnit).toBe('mi');
    await settings.unmount();

    // Edit profile: only the name changes.
    const editProfile = await render(<EditProfileForm profile={cachedProfile(queryClient)} />, {
      wrapper,
    });
    expect(screen.getByLabelText('Height, feet')).toHaveDisplayValue('5');
    expect(screen.getByLabelText('Height, inches')).toHaveDisplayValue('11');
    await user.type(screen.getByLabelText('Name (optional)'), 'Jamiil');
    await user.press(screen.getByRole('button', { name: 'Save profile' }));
    expect(cachedProfile(queryClient).displayName).toBe('Jamiil');
    await editProfile.unmount();

    // Settings: back to kilometres.
    settings = await render(<SettingsScreen profile={cachedProfile(queryClient)} />, { wrapper });
    await user.press(screen.getByRole('radio', { name: 'km' }));
    await settings.unmount();

    await render(<ProfileScreen />, { wrapper });
    expect(screen.getByText('180 cm')).toBeOnTheScreen();
    expect(mockRow.height_cm).toBe(180);
  });
});
