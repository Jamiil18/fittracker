import type { ExerciseSummary } from '@/features/exercises/schemas/exerciseSchemas';
import type { Routine } from '@/features/routines/schemas/routineSchemas';

import type { WorkoutSession } from '../schemas/sessionSchema';
import {
  addExercises,
  addSet,
  changeSetValue,
  completeSet,
  createSession,
  moveExercise,
  removeExercise,
  removeSet,
  swapExercise,
} from './session';
import { adjustTimer, attachNotification, startTimer } from './sessionTimer';

let mockIdCount = 0;
jest.mock('@/lib/ids', () => ({ newId: () => `id-${++mockIdCount}` }));

const userId = '6f1c7a52-8d3e-4b0a-9c55-2e6f1d7b8a90';

function exercise(name: string, overrides: Partial<ExerciseSummary> = {}): ExerciseSummary {
  return {
    id: `00000000-0000-4000-8000-00000000000${name.length}`,
    name,
    exerciseType: 'weight_reps',
    primaryMuscles: ['chest'],
    secondaryMuscles: [],
    equipment: 'barbell',
    ...overrides,
  };
}

const routine: Routine = {
  id: '10000000-0000-4000-8000-000000000001',
  name: 'Push A',
  notes: null,
  exercises: [
    {
      id: 'r1',
      position: 0,
      exercise: exercise('Bench press'),
      targetSets: 3,
      targetRepsMin: 8,
      targetRepsMax: 12,
      targetDurationSeconds: null,
      targetWeightKg: 60,
      restSeconds: 150,
    },
    {
      id: 'r2',
      position: 1,
      exercise: exercise('Plank', { exerciseType: 'duration' }),
      targetSets: 2,
      targetRepsMin: null,
      targetRepsMax: null,
      targetDurationSeconds: 45,
      targetWeightKg: null,
      restSeconds: null,
    },
  ],
};

function start(from: Routine | null = routine) {
  return createSession({
    userId,
    routine: from,
    weightUnit: 'kg',
    distanceUnit: 'km',
    defaultRestSeconds: 120,
    now: 1_000,
  });
}

describe('createSession', () => {
  it('fills a workout from a routine: its name, sets, rest times and targets', () => {
    const session = start();

    expect(session).toMatchObject({ name: 'Push A', routineId: routine.id, startedAt: 1_000 });
    expect(session.exercises.map((item) => item.sets.length)).toEqual([3, 2]);
    expect(session.exercises.map((item) => item.restSeconds)).toEqual([150, 120]);
    expect(session.exercises[0]?.targets).toEqual({
      weightKg: 60,
      repsMin: 8,
      durationSeconds: null,
    });
  });

  it('starts an empty workout with no exercises', () => {
    expect(start(null)).toMatchObject({ name: 'Workout', routineId: null, exercises: [] });
  });
});

describe('editing exercises', () => {
  it('adds picked exercises with one set and the default rest', () => {
    const session = addExercises(start(null), [exercise('Dips')], 90);
    expect(session.exercises[0]).toMatchObject({ restSeconds: 90, notes: null });
    expect(session.exercises[0]?.sets).toHaveLength(1);
  });

  it('swaps an exercise in place, keeping its rest time and number of sets', () => {
    const session = start();
    const first = session.exercises[0];
    const withValue = changeSetValue(
      session,
      first?.key ?? '',
      first?.sets[0]?.key ?? '',
      'weight',
      '80',
    );

    const swapped = swapExercise(withValue, first?.key ?? '', exercise('Dumbbell press'));

    expect(swapped.exercises[0]).toMatchObject({
      key: first?.key,
      restSeconds: 150,
      exercise: { name: 'Dumbbell press' },
    });
    expect(swapped.exercises[0]?.sets).toHaveLength(3);
    expect(swapped.exercises[0]?.sets[0]?.weight).toBe('');
  });

  it('moves and removes exercises, stopping a timer that belonged to the removed one', () => {
    const session = start();
    const [bench, plank] = session.exercises;
    const moved = moveExercise(session, 0, 1);
    expect(moved.exercises.map((item) => item.exercise.name)).toEqual(['Plank', 'Bench press']);

    const timed = startTimer(session, {
      kind: 'rest',
      exerciseKey: bench?.key ?? '',
      setKey: null,
      startedAt: 2_000,
      endsAt: 152_000,
    });
    const removed = removeExercise(timed, bench?.key ?? '');
    expect(removed.exercises.map((item) => item.key)).toEqual([plank?.key]);
    expect(removed.timer).toBeNull();
  });
});

describe('editing sets', () => {
  function countSets(session: WorkoutSession) {
    const sets = session.exercises.flatMap((exercise) => exercise.sets);
    return { done: sets.filter((set) => set.done).length, total: sets.length };
  }

  it('adds, completes and removes sets', () => {
    const session = start();
    const bench = session.exercises[0];
    const withSet = addSet(session, bench?.key ?? '');
    expect(countSets(withSet)).toEqual({ done: 0, total: 6 });

    const firstSet = bench?.sets[0]?.key ?? '';
    const completed = completeSet(withSet, bench?.key ?? '', firstSet, { weight: '60', reps: '8' });
    expect(completed.exercises[0]?.sets[0]).toMatchObject({ weight: '60', reps: '8', done: true });
    expect(countSets(completed)).toEqual({ done: 1, total: 6 });

    expect(countSets(removeSet(completed, bench?.key ?? '', firstSet))).toEqual({
      done: 0,
      total: 5,
    });
  });
});

describe('timers', () => {
  const base = () => {
    const session = start();
    return startTimer(session, {
      kind: 'rest',
      exerciseKey: session.exercises[0]?.key ?? '',
      setKey: null,
      startedAt: 2_000,
      endsAt: 152_000,
    });
  };

  it('keeps a scheduled notification only for the timer it was made for', () => {
    const timer = { startedAt: 2_000, endsAt: 152_000 };
    expect(attachNotification(base(), timer, 'n1').timer?.notificationId).toBe('n1');
    expect(
      attachNotification(base(), { ...timer, startedAt: 9_999 }, 'n1').timer?.notificationId,
    ).toBeNull();
    // Scheduled for the end the rest had before it was moved.
    expect(
      attachNotification(base(), { ...timer, endsAt: 137_000 }, 'n1').timer?.notificationId,
    ).toBeNull();
  });

  it('moves the end of the rest, never to before now', () => {
    expect(adjustTimer(base(), 15, 3_000).timer?.endsAt).toBe(167_000);
    expect(adjustTimer(base(), -600, 3_000).timer?.endsAt).toBe(3_000);
  });
});
