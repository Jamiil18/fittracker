import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { LineChart } from '@/components/ui/LineChart';
import { ListRow } from '@/components/ui/ListRow';
import { ListSection } from '@/components/ui/ListSection';
import { Text } from '@/components/ui/Text';
import { dayKeyToTime, dayMonth, shortDate } from '@/features/history/utils/historyDates';
import { bodyMassIndex } from '@/features/profile/utils/profileDetails';
import type { Units } from '@/features/workout/utils/setValues';
import { toLocalDateString } from '@/lib/dates';
import { formatWeight, fromKilograms, roundTo } from '@/lib/units';
import { screenPadding, spacing } from '@/theme/layout';

import { useShownBodyEntries } from '../hooks/useShownBodyEntries';
import { weightSeries } from '../utils/bodyEntries';

const trendDays = 90;

type BodySectionProps = {
  heightCm: number | null;
  units: Units;
};

function dateLine(measuredOn: string, pending: boolean): string {
  return pending
    ? `${shortDate(dayKeyToTime(measuredOn))}, not synced yet`
    : shortDate(dayKeyToTime(measuredOn));
}

// Bodyweight with BMI and its 90-day trend. Log works offline; values logged without a connection show
// "not synced yet" until they reach the server.
export function BodySection({ heightCm, units }: BodySectionProps) {
  const router = useRouter();
  const { entries } = useShownBodyEntries();
  const [since] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - trendDays);
    return toLocalDateString(date);
  });

  const latest = entries[0];
  const bmi = latest && heightCm ? bodyMassIndex(latest.entry.weight_kg, heightCm) : null;
  const series = weightSeries(entries, since);
  const bmiNote =
    bmi === null
      ? `BMI needs your height and bodyweight.${heightCm ? '' : ' Add your height with Edit above.'}`
      : "BMI uses only weight and height, so it doesn't account for muscle mass.";

  return (
    <>
      <ListSection
        title="Body"
        footer={bmiNote}
        actions={
          <Button
            label="Log"
            variant="plain"
            accessibilityHint="Logs your bodyweight"
            onPress={() => router.push('/body/log')}
          />
        }
      >
        <ListRow
          title="Bodyweight"
          subtitle={latest ? dateLine(latest.entry.measured_on, latest.pending) : undefined}
          value={latest ? formatWeight(latest.entry.weight_kg, units.weightUnit) : 'Not logged'}
        />
        <ListRow title="BMI" value={bmi === null ? '–' : String(bmi)} />
        <ListRow title="All entries" showChevron onPress={() => router.push('/body/entries')} />
      </ListSection>
      <View style={styles.chart}>
        {series.length >= 2 ? (
          <LineChart
            points={series.map((point) => ({
              x: dayKeyToTime(point.measuredOn),
              y: roundTo(fromKilograms(point.weightKg, units.weightUnit), 1),
            }))}
            formatX={dayMonth}
            formatTick={(value) => String(roundTo(value, 1))}
            formatValue={(value) => `${roundTo(value, 1)} ${units.weightUnit}`}
            accessibilityLabel={`Bodyweight over the last ${trendDays} days, ${series.length} entries.`}
          />
        ) : (
          <Text variant="secondary" tone="textMuted">
            Log your bodyweight on two days to see its trend.
          </Text>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  chart: {
    paddingHorizontal: screenPadding,
    paddingTop: spacing.lg,
  },
});
