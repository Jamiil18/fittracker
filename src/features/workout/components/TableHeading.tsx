import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import type { ExerciseType } from '@/features/exercises/schemas/exerciseSchemas';
import { spacing } from '@/theme/layout';

import { weightHeading, type Units } from '../utils/setValues';
import { columnWidth, tableFontScale, valueColumns, type ValueColumn } from './tableColumns';

type TableHeadingProps = {
  exerciseType: ExerciseType;
  units: Units;
};

// The column headings above an exercise's sets. Hidden from screen readers:
// each input is labelled with its own column instead.
export function TableHeading({ exerciseType, units }: TableHeadingProps) {
  const headings: Record<ValueColumn, string> = {
    weight: weightHeading(exerciseType, units.weightUnit),
    reps: 'Reps',
    distance: units.distanceUnit,
    duration: 'Time',
  };

  function heading(text: string, width: number | undefined, key?: string) {
    return (
      <Text
        maxFontSizeMultiplier={tableFontScale}
        key={key}
        variant="caption"
        tone="textMuted"
        style={width === undefined ? styles.previous : [styles.centered, { width }]}
      >
        {text}
      </Text>
    );
  }

  return (
    <View style={styles.row} importantForAccessibility="no-hide-descendants">
      {heading('Set', columnWidth.set)}
      {heading('Previous', undefined)}
      {valueColumns(exerciseType).map((column) =>
        heading(headings[column], columnWidth.value, column),
      )}
      {exerciseType === 'duration' ? <View style={{ width: columnWidth.start }} /> : null}
      {heading('Done', columnWidth.done)}
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
    paddingTop: spacing.xs,
  },
  previous: { flex: 1 },
  centered: { textAlign: 'center' },
});
