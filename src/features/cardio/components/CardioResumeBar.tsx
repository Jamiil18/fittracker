import { useRouter } from 'expo-router';

import { ResumeBar } from '@/components/ui/ResumeBar';
import { useUnits } from '@/features/settings/hooks/useUnits';
import { formatDistance } from '@/lib/units';

import { useCardioRecording } from '../recordingStore';
import { activityLabels } from '../utils/cardioFormat';
import { routeDistance } from '../utils/route';

// Shown on the Train tab while a recording is paused away from its screen (for
// example after the app was closed), one tap from carrying on or finishing it.
export function CardioResumeBar() {
  const router = useRouter();
  const units = useUnits();
  const recording = useCardioRecording((state) => state.recording);
  if (!recording) return null;

  const label = activityLabels[recording.activity];
  const distance = formatDistance(routeDistance(recording.segments), units.distanceUnit);

  return (
    <ResumeBar
      title={`${label}, paused`}
      detail={distance}
      actionLabel="Open"
      accessibilityLabel={`${label} paused at ${distance}. Open to resume or finish.`}
      onPress={() => router.push('/cardio/record')}
    />
  );
}
