import type { ExerciseType } from '@/features/exercises/schemas/exerciseSchemas';
import type { PastSet, PastWorkout } from '@/features/history/schemas/historySchemas';
import { bestsFor, estimatedOneRepMax, type RecordKind } from '@/features/workout/utils/records';
import { volumeKg } from '@/features/workout/utils/volume';

// One workout's sets of an exercise. If the exercise was done twice in a
// workout, both lots of sets count.
type ExerciseSession = {
  workoutId: string;
  workoutName: string;
  startedAt: number;
  sets: PastSet[];
};

export type ExerciseInfo = PastWorkout['exercises'][number]['exercise'];

// Every workout with the exercise, newest first.
export function exerciseSessions(history: PastWorkout[], exerciseId: string): ExerciseSession[] {
  return history
    .map((workout) => ({
      workoutId: workout.id,
      workoutName: workout.name,
      startedAt: workout.startedAt,
      sets: workout.exercises
        .filter((item) => item.exercise.id === exerciseId)
        .flatMap((item) => item.sets),
    }))
    .filter((session) => session.sets.length > 0)
    .sort((a, b) => b.startedAt - a.startedAt);
}

type DatedRecord = { kind: RecordKind; value: number; achievedAt: number };

// The order records are listed in for each type; the first is the headline.
const recordOrder: RecordKind[] = [
  'estimated_1rm',
  'heaviest_weight',
  'most_reps',
  'least_assistance',
  'longest_time',
  'longest_distance',
  'best_pace',
];

// Each record for the exercise with the date it was first reached. A later
// workout that only equals a record doesn't move its date.
export function exerciseRecords(type: ExerciseType, sessions: ExerciseSession[]): DatedRecord[] {
  const best = new Map<RecordKind, DatedRecord>();
  const oldestFirst = [...sessions].sort((a, b) => a.startedAt - b.startedAt);
  for (const session of oldestFirst) {
    const sessionBests = bestsFor(type, session.sets);
    for (const [kind, value] of Object.entries(sessionBests) as [RecordKind, number][]) {
      const current = best.get(kind);
      const lowerIsBetter = kind === 'least_assistance' || kind === 'best_pace';
      const beaten =
        current === undefined || (lowerIsBetter ? value < current.value : value > current.value);
      if (beaten) best.set(kind, { kind, value, achievedAt: session.startedAt });
    }
  }
  return recordOrder.flatMap((kind) => {
    const record = best.get(kind);
    return record ? [record] : [];
  });
}

type ExerciseRecords = { exercise: ExerciseInfo; records: DatedRecord[] };

// Records for every exercise the user has logged, by exercise name.
export function allRecords(history: PastWorkout[]): ExerciseRecords[] {
  const exercises = new Map<string, ExerciseInfo>();
  for (const workout of history) {
    for (const item of workout.exercises) exercises.set(item.exercise.id, item.exercise);
  }
  return [...exercises.values()]
    .map((exercise) => ({
      exercise,
      records: exerciseRecords(exercise.exerciseType, exerciseSessions(history, exercise.id)),
    }))
    .filter((item) => item.records.length > 0)
    .sort((a, b) => a.exercise.name.localeCompare(b.exercise.name));
}

export type ChartMetric =
  | 'estimated_1rm'
  | 'best_set'
  | 'volume'
  | 'most_reps'
  | 'total_reps'
  | 'least_assistance'
  | 'longest_time'
  | 'longest_distance'
  | 'best_pace';

export const chartMetricLabels: Record<ChartMetric, string> = {
  estimated_1rm: 'Est. 1RM',
  best_set: 'Best set',
  volume: 'Volume',
  most_reps: 'Most reps',
  total_reps: 'Total reps',
  least_assistance: 'Assistance',
  longest_time: 'Longest time',
  longest_distance: 'Distance',
  best_pace: 'Pace',
};

// The charts that mean something for each exercise type.
export function chartMetricsFor(type: ExerciseType): ChartMetric[] {
  switch (type) {
    case 'weight_reps':
    case 'weighted_bodyweight':
      return ['estimated_1rm', 'best_set', 'volume'];
    case 'bodyweight_reps':
      return ['most_reps', 'total_reps'];
    case 'assisted_bodyweight':
      return ['least_assistance', 'most_reps'];
    case 'duration':
      return ['longest_time'];
    case 'distance_duration':
      return ['longest_distance', 'best_pace'];
  }
}

// One workout's value for a chart, or null if it has none (for example an
// estimated 1RM when every set was at 0 kg). "Best set" is the heaviest
// weight lifted in the workout.
function sessionValue(type: ExerciseType, metric: ChartMetric, sets: PastSet[]): number | null {
  const values = (pick: (set: PastSet) => number | null) =>
    sets.map(pick).filter((value): value is number => value !== null);
  const max = (list: number[]) => (list.length > 0 ? Math.max(...list) : null);
  const min = (list: number[]) => (list.length > 0 ? Math.min(...list) : null);
  switch (metric) {
    case 'estimated_1rm':
      return max(
        values((set) =>
          set.weightKg !== null && set.weightKg > 0 && set.reps !== null
            ? estimatedOneRepMax(set.weightKg, set.reps)
            : null,
        ),
      );
    case 'best_set':
      return max(values((set) => set.weightKg));
    case 'volume':
      return volumeKg([{ type, sets }]) || null;
    case 'most_reps':
      return max(values((set) => set.reps));
    case 'total_reps':
      return values((set) => set.reps).reduce((sum, reps) => sum + reps, 0) || null;
    case 'least_assistance':
      return min(values((set) => set.weightKg));
    case 'longest_time':
      return max(values((set) => set.durationSeconds));
    case 'longest_distance':
      return max(values((set) => set.distanceM));
    case 'best_pace':
      return min(
        values((set) =>
          set.distanceM && set.durationSeconds
            ? (set.durationSeconds / set.distanceM) * 1000
            : null,
        ),
      );
  }
}

type ChartPoint = { time: number; value: number };

// The chart's points, oldest first, from workouts on or after `since`.
export function exerciseSeries(
  type: ExerciseType,
  sessions: ExerciseSession[],
  metric: ChartMetric,
  since: number,
): ChartPoint[] {
  return sessions
    .filter((session) => session.startedAt >= since)
    .map((session) => ({
      time: session.startedAt,
      value: sessionValue(type, metric, session.sets),
    }))
    .filter((point): point is ChartPoint => point.value !== null)
    .sort((a, b) => a.time - b.time);
}

// Monday 00:00 of the week a time falls in, where the user is.
export function weekStart(time: number): number {
  const date = new Date(time);
  const daysSinceMonday = (date.getDay() + 6) % 7;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - daysSinceMonday).getTime();
}
