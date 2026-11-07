import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ErrorState } from '@/components/ui/ErrorState';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { useProfile } from '@/features/settings/api/profile';
import { WorkoutBackgroundTasks } from '@/features/workout/components/WorkoutBackgroundTasks';
import { errorMessage, toAppError } from '@/lib/errors';
import { spacing } from '@/theme/layout';
import { useStackScreenOptions } from '@/theme/useStackScreenOptions';

// Signed-in users who haven't finished onboarding only have the onboarding
// screen; everyone else has the tabs, with Settings pushed on top of them. The profile decides which, and comes from
// the cache saved on the phone when there's no connection.
export function SignedInNavigator() {
  const profile = useProfile();
  const screenOptions = useStackScreenOptions();

  if (profile.data === undefined) {
    if (profile.isError) {
      return (
        <Screen>
          <ErrorState
            title="Couldn't load your settings"
            message={errorMessage(toAppError(profile.error))}
            onRetry={() => void profile.refetch()}
          />
        </Screen>
      );
    }
    return (
      <Screen>
        <View accessible accessibilityLabel="Loading" style={styles.loading}>
          <Skeleton width="40%" height={22} />
          <Skeleton width="100%" height={48} radius="sm" />
          <Skeleton width="100%" height={48} radius="sm" />
          <Skeleton width="70%" height={18} />
        </View>
      </Screen>
    );
  }

  const onboarded = profile.data.onboardingCompleted;

  return (
    <>
      <WorkoutBackgroundTasks />
      <Stack screenOptions={screenOptions}>
        <Stack.Protected guard={!onboarded}>
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={onboarded}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Train' }} />
          <Stack.Screen name="settings" options={{ title: 'Settings' }} />
          <Stack.Screen name="delete-account" options={{ title: 'Delete account' }} />
          <Stack.Screen name="exercises/[id]/index" options={{ title: '' }} />
          <Stack.Screen
            name="exercises/pick"
            options={{ title: 'Add exercises', presentation: 'modal' }}
          />
          <Stack.Screen name="routines/new" options={{ title: 'New routine' }} />
          <Stack.Screen name="routines/reorder" options={{ title: 'Reorder routines' }} />
          <Stack.Screen name="routines/[id]/index" options={{ title: '' }} />
          <Stack.Screen name="routines/[id]/edit" options={{ title: 'Edit routine' }} />
          <Stack.Screen name="records" options={{ title: 'All records' }} />
          <Stack.Screen name="profile/edit" options={{ title: 'Edit profile' }} />
          <Stack.Screen
            name="body/log"
            options={{ title: 'Log bodyweight', presentation: 'modal' }}
          />
          <Stack.Screen name="body/entries" options={{ title: 'All entries' }} />
          <Stack.Screen
            name="cardio/record"
            options={{ title: 'Outdoor cardio', presentation: 'fullScreenModal' }}
          />
          <Stack.Screen name="cardio/[id]" options={{ title: '' }} />
          <Stack.Screen name="workouts/[id]/index" options={{ title: '' }} />
          <Stack.Screen name="workouts/pending/[id]" options={{ title: '' }} />
          <Stack.Screen
            name="workout"
            options={{ title: 'Workout', presentation: 'fullScreenModal' }}
          />
          <Stack.Screen
            name="workout-reorder"
            options={{ title: 'Reorder exercises', presentation: 'modal' }}
          />
          <Stack.Screen
            name="workout-summary"
            options={{ title: 'Summary', presentation: 'fullScreenModal' }}
          />
        </Stack.Protected>
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  loading: { gap: spacing.lg },
});
