import type { Units } from '@/features/workout/utils/setValues';
import { formatRecordValue } from '@/features/workout/utils/records';
import { formatDuration } from '@/lib/durations';
import { fromKilograms, fromMetres, roundTo } from '@/lib/units';

import type { ChartMetric } from './exerciseProgress';

const weightMetrics: ReadonlySet<ChartMetric> = new Set([
  'estimated_1rm',
  'best_set',
  'volume',
  'least_assistance',
]);

// A stored chart value in the user's units, as the number the chart plots:
// kilograms or pounds, kilometres or miles, seconds per km or mile.
export function displayValue(metric: ChartMetric, value: number, units: Units): number {
  if (weightMetrics.has(metric)) return roundTo(fromKilograms(value, units.weightUnit), 1);
  if (metric === 'longest_distance') return roundTo(fromMetres(value, units.distanceUnit), 2);
  if (metric === 'best_pace') return value / 1000 / fromMetres(1, units.distanceUnit);
  return value;
}

// A stored chart value as text: "103.6 kg", "12 reps", "2:10", "5 km", "5:00 /km".
export function formatMetricValue(metric: ChartMetric, value: number, units: Units): string {
  switch (metric) {
    case 'estimated_1rm':
    case 'best_set':
    case 'volume':
    case 'least_assistance':
      return formatRecordValue('heaviest_weight', value, units);
    case 'most_reps':
    case 'total_reps':
      return formatRecordValue('most_reps', value, units);
    case 'longest_time':
      return formatRecordValue('longest_time', value, units);
    case 'longest_distance':
      return formatRecordValue('longest_distance', value, units);
    case 'best_pace':
      return formatRecordValue('best_pace', value, units);
  }
}

const numberFormat = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 });

// Times (and paces, which are times per km or mile) read as m:ss; the rest
// as plain numbers.
function isTime(metric: ChartMetric): boolean {
  return metric === 'longest_time' || metric === 'best_pace';
}

// An axis label for a value already in display units (see displayValue):
// "80", "1,200" or "1:10". The unit is left to the full value above the chart.
export function formatTick(metric: ChartMetric, value: number): string {
  return isTime(metric) ? formatDuration(value) : numberFormat.format(value);
}

// A value already in display units, in full with its unit: "82.5 kg",
// "12 reps", "1:20", "5.2 km" or "5:00 /km".
export function formatDisplayValue(metric: ChartMetric, value: number, units: Units): string {
  if (weightMetrics.has(metric))
    return `${numberFormat.format(roundTo(value, 1))} ${units.weightUnit}`;
  if (metric === 'longest_time') return formatDuration(value);
  if (metric === 'best_pace') return `${formatDuration(value)} /${units.distanceUnit}`;
  if (metric === 'longest_distance') return `${numberFormat.format(value)} ${units.distanceUnit}`;
  return `${numberFormat.format(value)} reps`;
}
