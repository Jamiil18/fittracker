import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { ListRow } from '@/components/ui/ListRow';
import { ListSection } from '@/components/ui/ListSection';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useDialog } from '@/components/ui/useDialog';
import { signOut } from '@/features/auth/api/auth';
import { useSession } from '@/features/auth/components/SessionProvider';
import { useCardioRecording } from '@/features/cardio/recordingStore';
import { useActiveWorkout } from '@/features/workout/activeWorkoutStore';
import { errorMessage, toAppError, type AppError } from '@/lib/errors';
import { useOutbox } from '@/lib/outbox/outboxStore';
import { useIsOffline } from '@/lib/useIsOffline';
import { screenPadding, spacing } from '@/theme/layout';

import type { Profile } from '../api/profile';
import { ThemeSection } from './ThemeSection';
import { TrainingSection } from './TrainingSection';
import { UnitsSection } from './UnitsSection';

type SettingsScreenProps = {
  profile: Profile;
};

export function SettingsScreen({ profile }: SettingsScreenProps) {
  const router = useRouter();
  const { user } = useSession();
  const isOffline = useIsOffline();
  const [signOutError, setSignOutError] = useState<AppError | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { dialog, showDialog } = useDialog();

  // Signing out clears this user's data from the phone, including a workout in
  // progress and anything that hasn't synced, so it asks first.
  function confirmSignOut() {
    const mine = useOutbox.getState().items.filter((item) => item.userId === user?.id);
    const workouts = mine.filter((item) => item.kind === 'workout').length;
    const bodyLogs = mine.filter((item) => item.kind === 'body').length;
    const cardio = mine.filter((item) => item.kind === 'cardio').length;
    const inProgress = useActiveWorkout.getState().session !== null;
    const recording = useCardioRecording.getState().recording !== null;
    if (mine.length === 0 && !inProgress && !recording) {
      void handleSignOut();
      return;
    }
    const losses = [
      inProgress ? 'your workout in progress' : null,
      recording ? 'your cardio recording' : null,
      workouts > 0 ? `${workouts} finished ${workouts === 1 ? 'workout' : 'workouts'}` : null,
      bodyLogs > 0 ? `${bodyLogs} body ${bodyLogs === 1 ? 'log' : 'logs'}` : null,
      cardio > 0 ? `${cardio} cardio ${cardio === 1 ? 'session' : 'sessions'}` : null,
    ].filter((loss) => loss !== null);
    const unsyncedNote =
      mine.length === 0
        ? ''
        : mine.length === 1
          ? " that hasn't synced yet"
          : " that haven't synced yet";
    showDialog({
      title: 'Sign out?',
      message: `Signing out deletes ${losses.join(', ')}${unsyncedNote} from this phone.`,
      actions: [
        { label: 'Cancel' },
        { label: 'Sign out', destructive: true, onPress: () => void handleSignOut() },
      ],
    });
  }

  async function handleSignOut() {
    if (isSigningOut) return;
    setSignOutError(null);
    setIsSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      setSignOutError(toAppError(error));
      setIsSigningOut(false);
    }
  }

  return (
    <Screen scroll padded={false} edges={['bottom']}>
      {isOffline ? (
        <OfflineBanner message="You're offline. Connect to the internet to change units or the default rest." />
      ) : null}
      <UnitsSection profile={profile} disabled={isOffline} />
      <TrainingSection profile={profile} disabled={isOffline} />
      <ThemeSection />
      <ListSection title="Account">
        <ListRow title="Email" value={user?.email} />
        <ListRow
          title={isSigningOut ? 'Signing out' : 'Sign out'}
          tone="accent"
          onPress={confirmSignOut}
        />
        <ListRow
          title="Delete account"
          tone="error"
          onPress={isOffline ? undefined : () => router.push('/delete-account')}
          accessibilityHint={
            isOffline ? 'Connect to the internet to delete your account' : undefined
          }
        />
      </ListSection>
      {signOutError ? (
        <Text tone="error" accessibilityRole="alert" style={styles.error}>
          {errorMessage(signOutError)}
        </Text>
      ) : null}
      {dialog}
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: {
    paddingHorizontal: screenPadding,
    paddingTop: spacing.sm,
  },
});
