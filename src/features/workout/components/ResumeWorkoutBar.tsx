import { useRouter } from 'expo-router';

import { ResumeBar } from '@/components/ui/ResumeBar';
import { formatDuration } from '@/lib/durations';

import { useActiveWorkout } from '../activeWorkoutStore';
import { useNow } from '../hooks/useNow';

// Sits above the tab bar while a workout is in progress, so it's one tap away
// after Close.
export function ResumeWorkoutBar() {
  const router = useRouter();
  const session = useActiveWorkout((state) => state.session);
  const now = useNow(1000, session !== null);

  if (!session) return null;
  const elapsed = formatDuration((now - session.startedAt) / 1000);

  return (
    <ResumeBar
      title={session.name.trim() || 'Workout'}
      detail={elapsed}
      actionLabel="Resume"
      accessibilityLabel={`Resume ${session.name}, ${elapsed} so far`}
      onPress={() => router.push('/workout')}
    />
  );
}
