import { userEvent } from '@testing-library/react-native';
import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderRouter, screen } from 'expo-router/testing-library';
import type { ReactNode } from 'react';
import { Text } from 'react-native';

import { SignedInNavigator } from '@/components/SignedInNavigator';
import { TabNavigator } from '@/components/TabNavigator';

import OnboardingRoute from '../../../../app/(app)/onboarding';

const userId = '6f1c7a52-8d3e-4b0a-9c55-2e6f1d7b8a90';

// A profile request the test can finish at a chosen moment, to recreate an
// older request returning after the save.
let mockFinishProfileRequest: (row: unknown) => void = () => {};
// Timers and syncing run alongside the screens;
// they're tested on their own and aren't part of choosing which screens exist.
jest.mock('@/features/workout/components/WorkoutBackgroundTasks', () => ({
  WorkoutBackgroundTasks: () => null,
}));
jest.mock('@/features/settings/api/profile', () => {
  const actual = jest.requireActual('@/features/settings/api/profile');
  const { useQuery } = jest.requireActual('@tanstack/react-query');
  return {
    ...actual,
    useProfile: () =>
      useQuery({
        queryKey: ['profile', '6f1c7a52-8d3e-4b0a-9c55-2e6f1d7b8a90'],
        queryFn: () =>
          new Promise((resolve) => {
            mockFinishProfileRequest = resolve;
          }),
        staleTime: Infinity,
      }),
  };
});

const mockSavedRow = {
  id: '6f1c7a52-8d3e-4b0a-9c55-2e6f1d7b8a90',
  weight_unit: 'kg',
  distance_unit: 'km',
  default_rest_seconds: 120,
  onboarding_completed_at: '2026-10-03T12:00:00+00:00',
  display_name: null,
  date_of_birth: null,
  height_cm: null,
  sex: null,
};

let mockSaveError: { message: string } | null = null;

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      upsert: async () => ({ error: null }),
      update: () => ({
        eq: () => ({
          select: () => ({
            single: async () =>
              mockSaveError
                ? { data: null, error: mockSaveError }
                : { data: mockSavedRow, error: null },
          }),
        }),
      }),
    }),
  },
}));

const notOnboarded = {
  id: userId,
  weightUnit: 'kg',
  distanceUnit: 'km',
  defaultRestSeconds: 120,
  onboardingCompleted: false,
  displayName: null,
  dateOfBirth: null,
  heightCm: null,
  sex: null,
};

async function renderOnboarding() {
  const queryClient = new QueryClient();
  queryClient.setQueryData(['profile', userId], notOnboarded);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  await renderRouter(
    {
      '(app)/_layout': SignedInNavigator,
      '(app)/onboarding': OnboardingRoute,
      '(app)/(tabs)/_layout': TabNavigator,
      '(app)/(tabs)/index': () => <Text>Train screen</Text>,
      '(app)/settings': () => <Text>Settings screen</Text>,
    },
    { initialUrl: '/', wrapper },
  );
  return queryClient;
}

describe('onboarding flow', () => {
  afterEach(() => {
    mockSaveError = null;
    onlineManager.setOnline(true);
  });

  it('welcomes the user by name as it is typed', async () => {
    const user = userEvent.setup();
    await renderOnboarding();

    expect(await screen.findByText('Welcome to FitTracker')).toBeOnTheScreen();
    expect(screen.getByText('Your workouts and cardio, all in one place.')).toBeOnTheScreen();
    await user.type(screen.getByLabelText('Name (optional)'), 'Jamiil');
    expect(screen.getByText('Welcome to FitTracker, Jamiil')).toBeOnTheScreen();
  });

  it('asks for height in feet and inches once miles are chosen', async () => {
    const user = userEvent.setup();
    await renderOnboarding();

    expect(await screen.findByLabelText('Height (optional)')).toBeOnTheScreen();
    await user.press(screen.getByRole('radio', { name: 'mi' }));
    expect(screen.getByLabelText('Height, feet')).toBeOnTheScreen();
    expect(screen.getByLabelText('Height, inches')).toBeOnTheScreen();
  });

  it('opens the app after Get started succeeds', async () => {
    const user = userEvent.setup();
    await renderOnboarding();

    await user.press(await screen.findByRole('button', { name: 'Get started' }));

    expect(await screen.findByText('Train screen')).toBeOnTheScreen();
  });

  it('says it is offline, instead of waiting, when Get started is pressed offline', async () => {
    const user = userEvent.setup();
    await renderOnboarding();
    onlineManager.setOnline(false);
    mockSaveError = { message: 'TypeError: Network request failed' };

    await user.press(await screen.findByRole('button', { name: 'Get started' }));

    expect(
      await screen.findByText("You're offline. Connect to the internet and try again."),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Train screen')).not.toBeOnTheScreen();
  });

  it('says why, and saves nothing, when an answer is invalid', async () => {
    const user = userEvent.setup();
    await renderOnboarding();

    await user.type(screen.getByLabelText('Bodyweight (optional)'), '5');
    await user.press(screen.getByRole('button', { name: 'Get started' }));

    expect(
      await screen.findByText(
        'Some answers need changing. Check the messages above, then try again.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('Bodyweight must be from 20 to 400 kg.')).toBeOnTheScreen();
    expect(screen.queryByText('Train screen')).not.toBeOnTheScreen();
  });

  it.each(['50000', '50 000'])(
    'shows the field message for a bodyweight of "%s", and clears both once corrected',
    async (typed) => {
      const user = userEvent.setup();
      await renderOnboarding();
      const summary = 'Some answers need changing. Check the messages above, then try again.';
      const fieldMessage = 'Bodyweight must be from 20 to 400 kg.';
      const bodyweight = screen.getByLabelText('Bodyweight (optional)');

      await user.type(bodyweight, typed);
      await user.press(screen.getByRole('button', { name: 'Get started' }));

      expect(await screen.findByText(fieldMessage)).toBeOnTheScreen();
      expect(screen.getByText(summary)).toBeOnTheScreen();

      await user.clear(bodyweight);
      await user.type(bodyweight, '80');

      expect(screen.queryByText(fieldMessage)).not.toBeOnTheScreen();
      expect(screen.queryByText(summary)).not.toBeOnTheScreen();
      expect(screen.queryByText('Train screen')).not.toBeOnTheScreen();
    },
  );

  it('stays in the app when an older profile request finishes after the save', async () => {
    const user = userEvent.setup();
    const queryClient = await renderOnboarding();

    // A refetch starts before the save, as happens when the app returns to
    // the foreground or reconnects, and reads the row before it changes.
    void queryClient.refetchQueries({ queryKey: ['profile', userId] });
    await user.press(await screen.findByRole('button', { name: 'Get started' }));
    expect(await screen.findByText('Train screen')).toBeOnTheScreen();

    await act(async () => {
      mockFinishProfileRequest(notOnboarded);
    });

    expect(screen.getByText('Train screen')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Get started' })).not.toBeOnTheScreen();
  });
});
