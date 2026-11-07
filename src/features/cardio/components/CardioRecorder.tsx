import { useKeepAwake } from 'expo-keep-awake';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { ListRow } from '@/components/ui/ListRow';
import { ListSection } from '@/components/ui/ListSection';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Text } from '@/components/ui/Text';
import { useDialog } from '@/components/ui/useDialog';
import { useSession } from '@/features/auth/components/SessionProvider';
import { useUnits } from '@/features/settings/hooks/useUnits';
import { useNow } from '@/features/workout/hooks/useNow';
import { formatDuration } from '@/lib/durations';
import { formatDistance } from '@/lib/units';
import { screenPadding, spacing } from '@/theme/layout';
import { useTheme } from '@/theme/useTheme';

import { finishRecording } from '../finishRecording';
import { useLocationTracking } from '../hooks/useLocationTracking';
import { useCardioRecording } from '../recordingStore';
import { activityLabels, formatPace } from '../utils/cardioFormat';
import {
  allPoints,
  elapsedSeconds,
  pauseRecording,
  resumeRecording,
  startRecording,
} from '../utils/recording';
import {
  activities,
  averagePace,
  currentPace,
  movingSeconds,
  routeDistance,
  type Activity,
} from '../utils/route';
import { RouteMap } from './RouteMap';

// Choosing the activity, then recording: the map, distance, time and paces,
// with Pause and Finish. The screen stays on while recording, and leaving the
// screen pauses the recording, since location is only followed while it is open.
export function CardioRecorder() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useSession();
  const units = useUnits();
  const recording = useCardioRecording((state) => state.recording);
  const update = useCardioRecording((state) => state.update);
  const [activity, setActivity] = useState<Activity>('run');
  const { dialog, showDialog } = useDialog();
  const recordingNow = recording !== null && recording.pausedAt === null;
  const problem = useLocationTracking(recordingNow);
  const now = useNow(1000, recording !== null);
  useKeepAwake();

  // Leaving the screen stops location updates, so the recording pauses too.
  useEffect(
    () => () =>
      useCardioRecording.getState().update((current) => pauseRecording(current, Date.now())),
    [],
  );

  if (!recording) {
    return (
      <View style={styles.start}>
        <Text variant="title" accessibilityRole="header">
          Record outdoor cardio
        </Text>
        <SegmentedControl
          options={activities.map((value) => ({ value, label: activityLabels[value] }))}
          value={activity}
          onChange={setActivity}
          accessibilityLabel="Activity"
        />
        <Text variant="secondary" tone="textMuted">
          Keep FitTracker open while you record: the screen stays on, and your location is only
          followed while this screen is showing.
        </Text>
        <Button
          label="Start recording"
          onPress={() =>
            user &&
            useCardioRecording.getState().start(startRecording(user.id, activity, Date.now()))
          }
        />
      </View>
    );
  }

  const shown = recording;
  const label = activityLabels[shown.activity];
  const distance = routeDistance(shown.segments);
  const elapsed = elapsedSeconds(shown, now);

  function save() {
    if (!user) return;
    const id = finishRecording(user.id);
    if (id) router.replace({ pathname: '/cardio/[id]', params: { id } });
  }

  function discard() {
    useCardioRecording.getState().clear();
    router.back();
  }

  function confirmFinish() {
    if (distance < 10) {
      showDialog({
        title: 'Nothing to save yet',
        message: `No distance has been recorded for this ${label.toLowerCase()}. Keep going, or discard it.`,
        actions: [
          { label: 'Keep going' },
          { label: 'Discard', destructive: true, onPress: discard },
        ],
      });
      return;
    }
    showDialog({
      title: `Finish ${label.toLowerCase()}?`,
      message: `${formatDistance(distance, units.distanceUnit)} in ${formatDuration(elapsed)}.`,
      actions: [
        { label: 'Keep going' },
        { label: 'Discard', destructive: true, onPress: discard },
        { label: 'Save', onPress: save },
      ],
    });
  }

  return (
    <>
      <View style={styles.map}>
        <RouteMap
          points={allPoints(shown)}
          follow
          accessibilityLabel={`Map of your ${label.toLowerCase()} so far`}
        />
      </View>
      <View style={styles.status} accessibilityLiveRegion="polite">
        <View
          style={[styles.dot, { backgroundColor: recordingNow ? colors.error : colors.textMuted }]}
        />
        <Text variant="bodyStrong">
          {recordingNow ? `Recording ${label.toLowerCase()}` : 'Paused'}
        </Text>
      </View>
      {problem ? (
        <Text variant="secondary" tone="error" style={styles.problem} accessibilityRole="alert">
          {problem}
        </Text>
      ) : null}
      <View style={styles.headline}>
        <Text variant="display">{formatDistance(distance, units.distanceUnit)}</Text>
        <Text variant="title" tone="textMuted">
          {formatDuration(elapsed)}
        </Text>
      </View>
      <ListSection>
        <ListRow
          title="Current pace"
          value={recordingNow ? formatPace(currentPace(shown.segments), units.distanceUnit) : '–'}
        />
        <ListRow
          title="Average pace"
          value={formatPace(
            averagePace(distance, movingSeconds(shown.segments)),
            units.distanceUnit,
          )}
        />
      </ListSection>
      <View style={styles.buttons}>
        <View style={styles.button}>
          <Button
            label={recordingNow ? 'Pause' : 'Resume'}
            variant="secondary"
            onPress={() =>
              update((current) =>
                recordingNow
                  ? pauseRecording(current, Date.now())
                  : resumeRecording(current, Date.now()),
              )
            }
          />
        </View>
        <View style={styles.button}>
          <Button label="Finish" onPress={confirmFinish} />
        </View>
      </View>
      {dialog}
    </>
  );
}

const styles = StyleSheet.create({
  start: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  map: { flex: 1, minHeight: 200 },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: screenPadding,
    paddingTop: spacing.md,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  problem: { paddingHorizontal: screenPadding, paddingTop: spacing.sm },
  headline: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: screenPadding,
    paddingTop: spacing.sm,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: screenPadding,
  },
  button: { flex: 1 },
});
