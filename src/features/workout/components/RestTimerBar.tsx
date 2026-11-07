import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { formatDuration } from '@/lib/durations';
import { screenPadding, spacing } from '@/theme/layout';
import { useTheme } from '@/theme/useTheme';

import type { WorkoutTimer } from '../schemas/sessionSchema';
import { millisecondsLeft } from '../utils/sessionTimer';
import { adjustRest, stopTimer } from '../workoutTimers';

type RestTimerBarProps = {
  timer: WorkoutTimer;
  now: number;
};

// The rest countdown, fixed to the bottom of the workout. The thin line along
// the top shrinks as rest runs out.
export function RestTimerBar({ timer, now }: RestTimerBarProps) {
  const { colors } = useTheme();
  const total = Math.max(1, timer.endsAt - timer.startedAt);
  const left = millisecondsLeft(timer, now);
  const secondsLeft = Math.ceil(left / 1000);

  return (
    <View style={[styles.bar, { backgroundColor: colors.surface, borderColor: colors.separator }]}>
      <View
        style={[
          styles.progress,
          { backgroundColor: colors.accent, width: `${(left / total) * 100}%` },
        ]}
      />
      <View style={styles.content}>
        <View
          style={styles.time}
          accessible
          accessibilityLabel={`Rest, ${secondsLeft} seconds left`}
        >
          <Text variant="caption" tone="textMuted">
            Rest
          </Text>
          <Text variant="title">{formatDuration(secondsLeft)}</Text>
        </View>
        <Button
          label="−15s"
          variant="plain"
          onPress={() => adjustRest(-15)}
          accessibilityHint="Shortens the rest by 15 seconds"
        />
        <Button
          label="+15s"
          variant="plain"
          onPress={() => adjustRest(15)}
          accessibilityHint="Lengthens the rest by 15 seconds"
        />
        <Button
          label="Skip"
          variant="plain"
          onPress={stopTimer}
          accessibilityHint="Ends the rest now"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { borderTopWidth: StyleSheet.hairlineWidth },
  progress: { height: 3 },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: screenPadding,
    paddingVertical: spacing.xs,
  },
  time: { flex: 1 },
});
