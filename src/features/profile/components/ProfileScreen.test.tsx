import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { Profile } from '@/features/settings/api/profile';

import { ProfileScreen } from './ProfileScreen';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/features/auth/components/SessionProvider', () => ({
  useSession: () => ({ user: { id: '6f1c7a52-8d3e-4b0a-9c55-2e6f1d7b8a90' } }),
}));

const userId = '6f1c7a52-8d3e-4b0a-9c55-2e6f1d7b8a90';

const profile: Profile = {
  id: userId,
  weightUnit: 'kg',
  distanceUnit: 'km',
  defaultRestSeconds: 120,
  onboardingCompleted: true,
  displayName: 'Jamiil Nohur',
  dateOfBirth: '2002-03-14',
  heightCm: 178,
  sex: null,
};

function entry(measuredOn: string, weightKg: number) {
  return {
    measured_on: measuredOn,
    weight_kg: weightKg,
  };
}

async function renderProfile(details: Partial<Profile>, bodyweight: unknown[]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { gcTime: Infinity, staleTime: Infinity, retry: false } },
  });
  queryClient.setQueryData(['profile', userId], { ...profile, ...details });
  queryClient.setQueryData(['body-entries', userId], bodyweight);
  queryClient.setQueryData(['training-history', userId], []);
  queryClient.setQueryData(['cardio-sessions', userId], []);
  queryClient.setQueryData(['exercises', userId], []);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  await render(<ProfileScreen />, { wrapper });
}

describe('ProfileScreen', () => {
  it('shows initials, details, bodyweight and BMI with its note', async () => {
    await renderProfile({}, [entry('2026-10-02', 81.4)]);

    // Hidden from screen readers: the name next to it says the same.
    expect(screen.getByText('JN', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByText('0 workouts, 0 this week')).toBeOnTheScreen();
    expect(screen.getByText('178 cm')).toBeOnTheScreen();
    expect(screen.getByText('81.4 kg')).toBeOnTheScreen();
    expect(screen.getByText('25.7')).toBeOnTheScreen();
    expect(
      screen.getByText("BMI uses only weight and height, so it doesn't account for muscle mass."),
    ).toBeOnTheScreen();
  });

  it('says what is missing for BMI', async () => {
    await renderProfile({ heightCm: null, displayName: null }, []);

    expect(screen.getByText('Your profile')).toBeOnTheScreen();
    expect(screen.getByText('Not logged')).toBeOnTheScreen();
    expect(
      screen.getByText('BMI needs your height and bodyweight. Add your height with Edit above.'),
    ).toBeOnTheScreen();
  });

  it('shows height in feet and inches when distances are in miles', async () => {
    await renderProfile({ distanceUnit: 'mi' }, []);
    expect(screen.getByText('5 ft 10 in')).toBeOnTheScreen();
  });
});
