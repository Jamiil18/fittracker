import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { LineChart } from '@/components/ui/LineChart';
import { ListRow } from '@/components/ui/ListRow';
import { ListSection } from '@/components/ui/ListSection';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SelectSheet } from '@/components/ui/SelectSheet';
import { Text } from '@/components/ui/Text';
import type { PastWorkout } from '@/features/history/schemas/historySchemas';
import { dayMonth, shortDate } from '@/features/history/utils/historyDates';
import { useUnits } from '@/features/settings/hooks/useUnits';
import { screenPadding, spacing } from '@/theme/layout';

import {
  chartMetricLabels,
  chartMetricsFor,
  exerciseSeries,
  exerciseSessions,
  type ChartMetric,
  type ExerciseInfo,
} from '../utils/exerciseProgress';
import {
  displayValue,
  formatDisplayValue,
  formatMetricValue,
  formatTick,
} from '../utils/metricValues';

type Range = '3M' | '6M' | '1Y' | 'All';
const ranges: { value: Range; label: string; months: number | null; phrase: string }[] = [
  { value: '3M', label: '3M', months: 3, phrase: 'over 3 months' },
  { value: '6M', label: '6M', months: 6, phrase: 'over 6 months' },
  { value: '1Y', label: '1Y', months: 12, phrase: 'over a year' },
  { value: 'All', label: 'All', months: null, phrase: 'over all time' },
];

function rangeStart(range: Range): number {
  const months = ranges.find((item) => item.value === range)?.months ?? null;
  if (months === null) return 0;
  const start = new Date();
  start.setMonth(start.getMonth() - months);
  return start.getTime();
}

type ExerciseChartSectionProps = {
  history: PastWorkout[];
};

// One exercise's progress over time: the chart type and range are chosen
// above the chart, and the change over the range is written below it.
export function ExerciseChartSection({ history }: ExerciseChartSectionProps) {
  const units = useUnits();
  const exercises = useMemo(() => {
    const byId = new Map<string, ExerciseInfo>();
    for (const workout of history) {
      for (const item of workout.exercises) {
        if (!byId.has(item.exercise.id)) byId.set(item.exercise.id, item.exercise);
      }
    }
    return [...byId.values()];
  }, [history]);
  // The first exercise found is from the most recent workout.
  const [exerciseId, setExerciseId] = useState(exercises[0]?.id ?? '');
  const [metricChoice, setMetricChoice] = useState<ChartMetric | null>(null);
  const [range, setRange] = useState<Range>('3M');
  const [picking, setPicking] = useState(false);
  const [showValues, setShowValues] = useState(false);

  const exercise = exercises.find((item) => item.id === exerciseId) ?? exercises[0];
  if (!exercise) return null;

  const metrics = chartMetricsFor(exercise.exerciseType);
  const metric = metricChoice && metrics.includes(metricChoice) ? metricChoice : metrics[0];
  if (!metric) return null;

  const points = exerciseSeries(
    exercise.exerciseType,
    exerciseSessions(history, exercise.id),
    metric,
    rangeStart(range),
  );
  const first = points[0];
  const last = points[points.length - 1];
  const change = first && last ? last.value - first.value : 0;
  const phrase = ranges.find((item) => item.value === range)?.phrase ?? '';
  const changeText =
    change === 0
      ? 'No change'
      : `${change > 0 ? '+' : '−'}${formatMetricValue(metric, Math.abs(change), units)}`;

  return (
    <>
      <ListSection title="Exercise progress">
        <ListRow
          title="Exercise"
          value={exercise.name}
          showChevron
          onPress={() => setPicking(true)}
        />
      </ListSection>
      <View style={styles.controls}>
        {metrics.length > 1 ? (
          <SegmentedControl
            options={metrics.map((value) => ({ value, label: chartMetricLabels[value] }))}
            value={metric}
            onChange={setMetricChoice}
            accessibilityLabel="Chart"
          />
        ) : null}
        <SegmentedControl
          options={ranges}
          value={range}
          onChange={setRange}
          accessibilityLabel="Time range"
        />
        {points.length >= 2 && first && last ? (
          <>
            <LineChart
              points={points.map((point) => ({
                x: point.time,
                y: displayValue(metric, point.value, units),
              }))}
              formatX={dayMonth}
              formatTick={(value) => formatTick(metric, value)}
              formatValue={(value) => formatDisplayValue(metric, value, units)}
              accessibilityLabel={`${chartMetricLabels[metric]} for ${exercise.name} ${phrase}: from ${formatMetricValue(metric, first.value, units)} to ${formatMetricValue(metric, last.value, units)}, ${points.length} workouts.`}
            />
            <View style={styles.change}>
              <Text variant="secondary" tone="textMuted">
                Change {phrase}
              </Text>
              <Text variant="bodyStrong">{changeText}</Text>
            </View>
          </>
        ) : (
          <Text variant="secondary" tone="textMuted" style={styles.empty}>
            Log this exercise in two workouts{range === 'All' ? '' : ' in this range'} to see a
            trend.
          </Text>
        )}
      </View>
      {points.length >= 2 ? (
        <View style={styles.valuesToggle}>
          <Button
            label={showValues ? 'Hide values' : 'Show values'}
            variant="plain"
            onPress={() => setShowValues((current) => !current)}
          />
        </View>
      ) : null}
      {showValues && points.length >= 2 ? (
        <ListSection title={`${chartMetricLabels[metric]}, ${exercise.name}`}>
          {[...points].reverse().map((point) => (
            <ListRow
              key={point.time}
              title={shortDate(point.time)}
              value={formatMetricValue(metric, point.value, units)}
            />
          ))}
        </ListSection>
      ) : null}
      <SelectSheet
        visible={picking}
        onClose={() => setPicking(false)}
        title="Exercise"
        options={[...exercises]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((item) => ({ value: item.id, label: item.name }))}
        selected={exercise.id}
        onSelect={(value) => value && setExerciseId(value)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  controls: {
    paddingHorizontal: screenPadding,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  change: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  empty: { paddingVertical: spacing.xl, textAlign: 'center' },
  valuesToggle: { alignItems: 'flex-start' },
});
