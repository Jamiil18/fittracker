import type { PastSet, PastWorkout } from '@/features/history/schemas/historySchemas';
import { estimatedOneRepMax } from '@/features/workout/utils/records';

import {
  allRecords,
  chartMetricsFor,
  exerciseRecords,
  exerciseSeries,
  exerciseSessions,
  weekStart,
} from './exerciseProgress';
import { displayValue, formatDisplayValue, formatMetricValue, formatTick } from './metricValues';

const benchId = '00000000-0000-4000-8000-000000000001';
const pullupId = '00000000-0000-4000-8000-000000000002';

function at(month: number, day: number) {
  return new Date(2026, month - 1, day, 18).getTime();
}

function set(weightKg: number | null, reps: number): PastSet {
  return {
    id: `${weightKg}-${reps}`,
    position: 0,
    weightKg,
    reps,
    durationSeconds: null,
    distanceM: null,
  };
}

function workout(
  id: string,
  startedAt: number,
  bench: PastSet[],
  pullups: PastSet[] = [],
): PastWorkout {
  return {
    id,
    routineId: null,
    name: `Workout ${id}`,
    notes: null,
    startedAt,
    endedAt: startedAt + 3600_000,
    exercises: [
      {
        id: `${id}-1`,
        position: 0,
        notes: null,
        exercise: {
          id: benchId,
          name: 'Bench press',
          exerciseType: 'weight_reps',
          primaryMuscles: ['chest'],
        },
        sets: bench,
      },
      {
        id: `${id}-2`,
        position: 1,
        notes: null,
        exercise: {
          id: pullupId,
          name: 'Pull-up',
          exerciseType: 'bodyweight_reps',
          primaryMuscles: ['lats'],
        },
        sets: pullups,
      },
    ],
  };
}

const history = [
  workout('a', at(9, 14), [set(60, 10), set(80, 8)], [set(null, 10)]),
  workout('b', at(9, 21), [set(85, 5)], [set(null, 12), set(null, 9)]),
  workout('c', at(9, 28), [set(82.5, 8)]),
];

describe('exerciseSessions', () => {
  it("lists a workout's sets of the exercise, newest first", () => {
    const sessions = exerciseSessions(history, pullupId);
    expect(sessions.map((session) => session.workoutId)).toEqual(['b', 'a']);
  });
});

describe('exerciseRecords', () => {
  it('finds each record with the date it was first reached', () => {
    const records = exerciseRecords('weight_reps', exerciseSessions(history, benchId));
    expect(records).toEqual([
      { kind: 'estimated_1rm', value: estimatedOneRepMax(82.5, 8), achievedAt: at(9, 28) },
      { kind: 'heaviest_weight', value: 85, achievedAt: at(9, 21) },
    ]);
  });

  it('collects records for every exercise, by name', () => {
    const records = allRecords(history);
    expect(records.map((item) => item.exercise.name)).toEqual(['Bench press', 'Pull-up']);
    expect(records[1]?.records).toEqual([{ kind: 'most_reps', value: 12, achievedAt: at(9, 21) }]);
  });
});

describe('exerciseSeries', () => {
  const sessions = exerciseSessions(history, benchId);

  it('gives one point per workout, oldest first, from the chosen date', () => {
    expect(exerciseSeries('weight_reps', sessions, 'best_set', 0)).toEqual([
      { time: at(9, 14), value: 80 },
      { time: at(9, 21), value: 85 },
      { time: at(9, 28), value: 82.5 },
    ]);
    expect(exerciseSeries('weight_reps', sessions, 'best_set', at(9, 20))).toHaveLength(2);
  });

  it('adds every set to the volume', () => {
    expect(exerciseSeries('weight_reps', sessions, 'volume', 0)[0]?.value).toBe(600 + 640);
  });

  it('offers the charts that fit each type', () => {
    expect(chartMetricsFor('weight_reps')).toEqual(['estimated_1rm', 'best_set', 'volume']);
    expect(chartMetricsFor('duration')).toEqual(['longest_time']);
  });
});

describe('weekStart', () => {
  it('starts the week on Monday', () => {
    // 21 September 2026 is a Monday.
    expect(new Date(weekStart(at(9, 24))).getDate()).toBe(21);
  });
});

describe('metric values', () => {
  const lb = { weightUnit: 'lb', distanceUnit: 'mi' } as const;

  it("converts and formats values in the user's units", () => {
    expect(displayValue('best_set', 61.235, lb)).toBe(135);
    expect(formatMetricValue('best_set', 61.235, lb)).toBe('135 lb');
    expect(formatMetricValue('total_reps', 21, lb)).toBe('21 reps');
  });

  it('labels the chart in m:ss for times and paces, with units in the full value', () => {
    const kg = { weightUnit: 'kg', distanceUnit: 'km' } as const;
    expect(formatTick('longest_time', 70)).toBe('1:10');
    expect(formatDisplayValue('longest_time', 80, kg)).toBe('1:20');
    expect(formatTick('best_pace', 300)).toBe('5:00');
    expect(formatDisplayValue('best_pace', 300, kg)).toBe('5:00 /km');
    expect(formatTick('volume', 1200)).toBe('1,200');
    expect(formatDisplayValue('estimated_1rm', 103.6, kg)).toBe('103.6 kg');
    expect(formatDisplayValue('longest_distance', 5.2, kg)).toBe('5.2 km');
    expect(formatDisplayValue('most_reps', 12, kg)).toBe('12 reps');
  });
});
