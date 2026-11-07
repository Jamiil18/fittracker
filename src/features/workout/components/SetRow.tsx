import { Pressable, StyleSheet, View } from 'react-native';

import { Checkbox } from '@/components/ui/Checkbox';
import { TableInput } from '@/components/ui/TableInput';
import { Text } from '@/components/ui/Text';
import type { ExerciseType } from '@/features/exercises/schemas/exerciseSchemas';
import { formatDuration } from '@/lib/durations';
import { spacing } from '@/theme/layout';
import { useTheme } from '@/theme/useTheme';

import type { SessionSet } from '../schemas/sessionSchema';
import type { SetValueField } from '../utils/session';
import { durationDigitsFromInput, formatDurationDigits, type SetHints } from '../utils/setValues';
import { columnWidth, tableFontScale, valueColumns, type ValueColumn } from './tableColumns';

type SetRowProps = {
  exerciseName: string;
  exerciseType: ExerciseType;
  set: SessionSet;
  number: number;
  previous: string;
  hints: SetHints;
  // Seconds left while this set's timer runs, otherwise null.
  secondsLeft: number | null;
  onChange: (field: SetValueField, value: string) => void;
  onToggleDone: () => void;
  onRemove: () => void;
  onStartTimer: () => void;
  onStopTimer: () => void;
};

const columnNames: Record<ValueColumn, string> = {
  weight: 'weight',
  reps: 'reps',
  distance: 'distance',
  duration: 'time',
};

// One row of the logging table. Empty fields show the hint in grey; ticking
// the set uses those hints for any field left empty.
export function SetRow({
  exerciseName,
  exerciseType,
  set,
  number,
  previous,
  hints,
  secondsLeft,
  onChange,
  onToggleDone,
  onRemove,
  onStartTimer,
  onStopTimer,
}: SetRowProps) {
  const { colors } = useTheme();
  const rowName = `${exerciseName} set ${number}`;
  const timed = exerciseType === 'duration';

  function valueInput(column: ValueColumn) {
    if (column === 'duration') {
      if (secondsLeft !== null) {
        return (
          <Text
            maxFontSizeMultiplier={tableFontScale}
            key={column}
            variant="bodyStrong"
            tone="accent"
            style={[styles.countdown, { width: columnWidth.value }]}
            accessibilityLiveRegion="polite"
          >
            {formatDuration(secondsLeft)}
          </Text>
        );
      }
      return (
        <TableInput
          maxFontSizeMultiplier={tableFontScale}
          key={column}
          width={columnWidth.value}
          accessibilityLabel={`${rowName} time`}
          keyboardType="number-pad"
          value={formatDurationDigits(set.duration)}
          placeholder={formatDurationDigits(hints.duration)}
          onChangeText={(text) => onChange('duration', durationDigitsFromInput(text))}
          maxLength={8}
        />
      );
    }
    return (
      <TableInput
        maxFontSizeMultiplier={tableFontScale}
        key={column}
        width={columnWidth.value}
        accessibilityLabel={`${rowName} ${columnNames[column]}`}
        keyboardType={column === 'reps' ? 'number-pad' : 'decimal-pad'}
        value={set[column]}
        placeholder={hints[column]}
        onChangeText={(text) => onChange(column, text)}
        maxLength={column === 'reps' ? 4 : 7}
      />
    );
  }

  return (
    <View style={[styles.row, { backgroundColor: colors.surface }]}>
      <View
        accessible
        accessibilityLabel={`Set ${number}`}
        // Swiping to delete is out of reach for screen readers, so the same
        // action is offered here.
        accessibilityActions={[{ name: 'delete', label: 'Delete set' }]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'delete') onRemove();
        }}
        style={styles.setCell}
      >
        <Text maxFontSizeMultiplier={tableFontScale} variant="bodyStrong">
          {number}
        </Text>
      </View>
      <Text
        maxFontSizeMultiplier={tableFontScale}
        variant="secondary"
        tone="textMuted"
        numberOfLines={1}
        style={styles.previous}
      >
        {previous || '–'}
      </Text>
      {valueColumns(exerciseType).map(valueInput)}
      {timed && !set.done ? (
        <Pressable
          onPress={secondsLeft === null ? onStartTimer : onStopTimer}
          accessibilityRole="button"
          accessibilityLabel={`${secondsLeft === null ? 'Start' : 'Stop'} ${rowName} timer`}
          android_ripple={{ color: colors.separator }}
          style={styles.startCell}
        >
          <Text maxFontSizeMultiplier={tableFontScale} variant="bodyStrong" tone="accent">
            {secondsLeft === null ? 'Start' : 'Stop'}
          </Text>
        </Pressable>
      ) : timed ? (
        <View style={{ width: columnWidth.start }} />
      ) : null}
      <Checkbox checked={set.done} onPress={onToggleDone} accessibilityLabel={`${rowName} done`} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingLeft: spacing.sm,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
  },
  setCell: {
    width: columnWidth.set,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previous: { flex: 1 },
  countdown: { textAlign: 'center' },
  startCell: {
    width: columnWidth.start,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
