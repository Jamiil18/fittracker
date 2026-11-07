import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { Screen } from '@/components/ui/Screen';
import { CardioResumeBar } from '@/features/cardio/components/CardioResumeBar';
import { RoutinesSection } from '@/features/routines/components/RoutinesSection';
import { useActiveWorkout } from '@/features/workout/activeWorkoutStore';
import { ResumeWorkoutBar } from '@/features/workout/components/ResumeWorkoutBar';
import { UnsyncedWorkoutsSection } from '@/features/workout/components/UnsyncedWorkoutsSection';
import { useWorkoutActions } from '@/features/workout/hooks/useWorkoutActions';
import { useWorkoutRestored } from '@/features/workout/hooks/useWorkoutRestored';
import { useIsOffline } from '@/lib/useIsOffline';
import { screenPadding, spacing } from '@/theme/layout';

// Whether this launch has already reopened a workout in progress, so closing
// it doesn't immediately reopen it.
let reopenedThisLaunch = false;

// The Train tab, the app's home once onboarding is done.
export function TrainScreen() {
  const router = useRouter();
  const isOffline = useIsOffline();
  const restored = useWorkoutRestored();
  const { dialog, startWorkout } = useWorkoutActions();

  // A workout still in progress when the app was closed, or the phone
  // restarted, opens again as soon as the app does.
  useEffect(() => {
    if (!restored || reopenedThisLaunch) return;
    reopenedThisLaunch = true;
    if (useActiveWorkout.getState().session) router.push('/workout');
  }, [restored, router]);

  return (
    <Screen padded={false} edges={[]}>
      <ScrollView contentContainerStyle={styles.content}>
        {isOffline ? (
          <OfflineBanner message="You're offline. You can still train and view your routines. Connect to edit routines." />
        ) : null}
        <View style={styles.start}>
          <Button label="Start empty workout" onPress={() => startWorkout(null)} />
          <Button
            label="Record outdoor cardio"
            variant="secondary"
            onPress={() => router.push('/cardio/record')}
          />
        </View>
        <UnsyncedWorkoutsSection />
        <RoutinesSection />
      </ScrollView>
      <CardioResumeBar />
      <ResumeWorkoutBar />
      {dialog}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xl },
  start: {
    paddingHorizontal: screenPadding,
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
});
