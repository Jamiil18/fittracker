import type { ExerciseSummary } from '@/features/exercises/schemas/exerciseSchemas';
import type { Routine } from '@/features/routines/schemas/routineSchemas';
import { newId } from '@/lib/ids';
import type { DistanceUnit, WeightUnit } from '@/lib/units';

import type { SessionExercise, SessionSet, WorkoutSession } from '../schemas/sessionSchema';

// Every change to a workout in progress is one of these functions: each takes
// the session and returns a new one, so they can be tested on their own and
// the store only has to save the result.

const maxNameLength = 60;

function newSet(): SessionSet {
  return { key: newId(), weight: '', reps: '', duration: '', distance: '', done: false };
}

type ExerciseTargets = SessionExercise['targets'];
const noTargets: ExerciseTargets = { weightKg: null, repsMin: null, durationSeconds: null };

function newExercise(
  exercise: Pick<ExerciseSummary, 'id' | 'name' | 'exerciseType'>,
  restSeconds: number,
  setCount: number,
  targets: ExerciseTargets = noTargets,
): SessionExercise {
  return {
    key: newId(),
    exercise: { id: exercise.id, name: exercise.name, exerciseType: exercise.exerciseType },
    notes: null,
    restSeconds,
    targets,
    sets: Array.from({ length: setCount }, () => newSet()),
  };
}

type CreateSessionInput = {
  userId: string;
  routine: Routine | null;
  weightUnit: WeightUnit;
  distanceUnit: DistanceUnit;
  defaultRestSeconds: number;
  now: number;
};

// An empty workout, or one filled from a routine: each exercise with its
// target number of working sets, its rest time and its targets as hints.
export function createSession({
  userId,
  routine,
  weightUnit,
  distanceUnit,
  defaultRestSeconds,
  now,
}: CreateSessionInput): WorkoutSession {
  return {
    id: newId(),
    userId,
    routineId: routine?.id ?? null,
    name: routine?.name ?? 'Workout',
    notes: '',
    startedAt: now,
    weightUnit,
    distanceUnit,
    exercises:
      routine?.exercises.map((item) =>
        newExercise(item.exercise, item.restSeconds ?? defaultRestSeconds, item.targetSets, {
          weightKg: item.targetWeightKg,
          repsMin: item.targetRepsMin,
          durationSeconds: item.targetDurationSeconds,
        }),
      ) ?? [],
    timer: null,
  };
}

function updateExercise(
  session: WorkoutSession,
  exerciseKey: string,
  change: (exercise: SessionExercise) => SessionExercise,
): WorkoutSession {
  return {
    ...session,
    exercises: session.exercises.map((item) => (item.key === exerciseKey ? change(item) : item)),
  };
}

function updateSet(
  session: WorkoutSession,
  exerciseKey: string,
  setKey: string,
  change: (set: SessionSet) => SessionSet,
): WorkoutSession {
  return updateExercise(session, exerciseKey, (exercise) => ({
    ...exercise,
    sets: exercise.sets.map((set) => (set.key === setKey ? change(set) : set)),
  }));
}

// A timer belongs to an exercise, and a set timer to one set; removing either
// stops it.
function withoutTimerFor(session: WorkoutSession, exerciseKey: string, setKey?: string) {
  const { timer } = session;
  if (!timer || timer.exerciseKey !== exerciseKey) return session;
  if (setKey !== undefined && timer.setKey !== setKey) return session;
  return { ...session, timer: null };
}

export function addExercises(
  session: WorkoutSession,
  exercises: ExerciseSummary[],
  defaultRestSeconds: number,
): WorkoutSession {
  return {
    ...session,
    exercises: [
      ...session.exercises,
      ...exercises.map((exercise) => newExercise(exercise, defaultRestSeconds, 1)),
    ],
  };
}

// The new exercise takes the old one's place, rest time and number of sets.
// Logged values are cleared, because they belong to the old exercise.
export function swapExercise(
  session: WorkoutSession,
  exerciseKey: string,
  exercise: ExerciseSummary,
): WorkoutSession {
  const swapped = updateExercise(session, exerciseKey, (old) => ({
    ...newExercise(exercise, old.restSeconds, Math.max(old.sets.length, 1)),
    key: old.key,
    notes: old.notes,
  }));
  return withoutTimerFor(swapped, exerciseKey);
}

export function removeExercise(session: WorkoutSession, exerciseKey: string): WorkoutSession {
  const removed = withoutTimerFor(session, exerciseKey);
  return { ...removed, exercises: removed.exercises.filter((item) => item.key !== exerciseKey) };
}

export function moveExercise(session: WorkoutSession, from: number, to: number): WorkoutSession {
  const exercises = [...session.exercises];
  const [moved] = exercises.splice(from, 1);
  if (moved === undefined || to < 0 || to > exercises.length) return session;
  exercises.splice(to, 0, moved);
  return { ...session, exercises };
}

export function addSet(session: WorkoutSession, exerciseKey: string): WorkoutSession {
  return updateExercise(session, exerciseKey, (exercise) => ({
    ...exercise,
    sets: [...exercise.sets, newSet()],
  }));
}

export function removeSet(
  session: WorkoutSession,
  exerciseKey: string,
  setKey: string,
): WorkoutSession {
  const removed = updateExercise(session, exerciseKey, (exercise) => ({
    ...exercise,
    sets: exercise.sets.filter((set) => set.key !== setKey),
  }));
  return withoutTimerFor(removed, exerciseKey, setKey);
}

export type SetValueField = 'weight' | 'reps' | 'duration' | 'distance';

export function changeSetValue(
  session: WorkoutSession,
  exerciseKey: string,
  setKey: string,
  field: SetValueField,
  value: string,
): WorkoutSession {
  return updateSet(session, exerciseKey, setKey, (set) => ({ ...set, [field]: value }));
}

// Ticks a set, keeping the values it was completed with: the ones typed, or
// the hints shown in empty fields (see resolveSet).
export function completeSet(
  session: WorkoutSession,
  exerciseKey: string,
  setKey: string,
  values: Partial<Pick<SessionSet, SetValueField>>,
): WorkoutSession {
  return updateSet(session, exerciseKey, setKey, (set) => ({ ...set, ...values, done: true }));
}

export function uncompleteSet(
  session: WorkoutSession,
  exerciseKey: string,
  setKey: string,
): WorkoutSession {
  return updateSet(session, exerciseKey, setKey, (set) => ({ ...set, done: false }));
}

export function changeExerciseRest(
  session: WorkoutSession,
  exerciseKey: string,
  restSeconds: number,
): WorkoutSession {
  return updateExercise(session, exerciseKey, (exercise) => ({ ...exercise, restSeconds }));
}

// Null removes the note.
export function changeExerciseNotes(
  session: WorkoutSession,
  exerciseKey: string,
  notes: string | null,
): WorkoutSession {
  return updateExercise(session, exerciseKey, (exercise) => ({ ...exercise, notes }));
}

export function renameWorkout(session: WorkoutSession, name: string): WorkoutSession {
  return { ...session, name: name.slice(0, maxNameLength) };
}

export function changeWorkoutNotes(session: WorkoutSession, notes: string): WorkoutSession {
  return { ...session, notes };
}
