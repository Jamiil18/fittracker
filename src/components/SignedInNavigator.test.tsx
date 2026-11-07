import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderRouter, screen } from 'expo-router/testing-library';
import type { ReactNode } from 'react';
import { Text } from 'react-native';

import { SignedInNavigator } from './SignedInNavigator';
import { TabNavigator } from './TabNavigator';

const profileKey = ['profile', 'user-1'];

// The real hook reads the profile from the query cache; this stand-in reads
// the same cache without a network request.
// Timers and syncing run alongside the screens;
// they're tested on their own and aren't part of choosing which screens exist.
jest.mock('@/features/workout/components/WorkoutBackgroundTasks', () => ({
  WorkoutBackgroundTasks: () => null,
}));
jest.mock('@/features/settings/api/profile', () => {
  const { useQuery } = jest.requireActual('@tanstack/react-query');
  return {
    useProfile: () =>
      useQuery({ queryKey: ['profile', 'user-1'], queryFn: () => new Promise(() => {}) }),
  };
});

function profile(onboardingCompleted: boolean) {
  return {
    id: 'user-1',
    weightUnit: 'kg',
    distanceUnit: 'km',
    defaultRestSeconds: 120,
    onboardingCompleted,
    displayName: null,
    dateOfBirth: null,
    heightCm: null,
    sex: null,
  };
}

describe('SignedInNavigator', () => {
  it('moves from onboarding to the app once the saved profile is in the cache', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(profileKey, profile(false));
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    await renderRouter(
      {
        '(app)/_layout': SignedInNavigator,
        '(app)/onboarding': () => <Text>Onboarding screen</Text>,
        '(app)/(tabs)/_layout': TabNavigator,
        '(app)/(tabs)/index': () => <Text>Train screen</Text>,
        '(app)/settings': () => <Text>Settings screen</Text>,
      },
      { initialUrl: '/', wrapper },
    );
    expect(await screen.findByText('Onboarding screen')).toBeOnTheScreen();

    await act(async () => {
      queryClient.setQueryData(profileKey, profile(true));
    });

    expect(await screen.findByText('Train screen')).toBeOnTheScreen();
    expect(screen.queryByText('Onboarding screen')).not.toBeOnTheScreen();
  });
});
