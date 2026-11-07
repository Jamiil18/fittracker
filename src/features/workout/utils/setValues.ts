import type { ExerciseType } from '@/features/exercises/schemas/exerciseSchemas';
import { formatDuration } from '@/lib/durations';
import {
  fromKilograms,
  fromMetres,
  parseDecimalInput,
  roundTo,
  toKilograms,
  toMetres,
  type DistanceUnit,
  type WeightUnit,
} from '@/lib/units';

import type { SessionExercise, SessionSet } from '../schemas/sessionSchema';

export type Units = { weightUnit: WeightUnit; distanceUnit: DistanceUnit };

// A set as stored on the server: kilograms, metres and seconds.
export type SavedSetValues = {
  weightKg: number | null;
  reps: number | null;
  durationSeconds: number | null;
  distanceM: number | null;
};

// A set from an earlier workout, from the exercise_set_history view.
export type HistorySet = SavedSetValues & {
  workoutId: string;
  startedAt: string;
  exercisePosition: number;
  setPosition: number;
};

// The columns of the logging table follow the exercise type.
export function hasWeight(type: ExerciseType): boolean {
  return type === 'weight_reps' || type === 'weighted_bodyweight' || type === 'assisted_bodyweight';
}

export function hasReps(type: ExerciseType): boolean {
  return type !== 'duration' && type !== 'distance_duration';
}

export function hasDistance(type: ExerciseType): boolean {
  return type === 'distance_duration';
}

export function hasDuration(type: ExerciseType): boolean {
  return type === 'duration' || type === 'distance_duration';
}

// The weight column's heading: the load, the added load, or the assistance.
export function weightHeading(type: ExerciseType, unit: WeightUnit): string {
  if (type === 'weighted_bodyweight') return `+${unit}`;
  if (type === 'assisted_bodyweight') return `−${unit}`;
  return unit;
}

// Times are typed like a microwave timer: digits fill from the right, so
// "130" is 1:30 and "13000" is 1:30:00. Seconds above 59 are allowed ("90"
// is 90 seconds), which is what people expect when typing a short time.
export function durationDigitsToSeconds(digits: string): number | null {
  if (!/^\d+$/.test(digits)) return null;
  const padded = digits.padStart(6, '0');
  const hours = Number(padded.slice(0, -4));
  const minutes = Number(padded.slice(-4, -2));
  const seconds = Number(padded.slice(-2));
  return hours * 3600 + minutes * 60 + seconds;
}

export function secondsToDurationDigits(totalSeconds: number): string {
  return formatDuration(totalSeconds)
    .replace(/:/g, '')
    .replace(/^0+(?=\d)/, '');
}

// Shows typed digits as a time while they are being typed: "130" is "1:30".
export function formatDurationDigits(digits: string): string {
  if (digits === '') return '';
  const padded = digits.padStart(3, '0');
  const seconds = padded.slice(-2);
  const rest = padded.slice(0, -2);
  if (rest.length <= 2) return `${Number(rest)}:${seconds}`;
  return `${Number(rest.slice(0, -2))}:${rest.slice(-2)}:${seconds}`;
}

// Keeps only digits from what the time field received, up to h:mm:ss.
export function durationDigitsFromInput(text: string): string {
  return text.replace(/\D/g, '').replace(/^0+/, '').slice(0, 6);
}

function numberText(value: number | null, decimals: number): string {
  return value === null ? '' : String(roundTo(value, decimals));
}

function weightText(weightKg: number | null, unit: WeightUnit) {
  return numberText(weightKg === null ? null : fromKilograms(weightKg, unit), 2);
}

// What the Previous column shows for a set from the last workout, in the
// units of this workout: "82.5 × 8", "+10 × 8", "−20 × 8", "12", "0:45",
// or "1.5 km 6:00".
export function previousText(type: ExerciseType, set: SavedSetValues, units: Units): string {
  const time = set.durationSeconds === null ? '' : formatDuration(set.durationSeconds);
  if (hasDistance(type)) {
    const distance =
      set.distanceM === null ? '' : roundTo(fromMetres(set.distanceM, units.distanceUnit), 2);
    return `${distance} ${units.distanceUnit} ${time}`.trim();
  }
  if (hasDuration(type)) return time;
  if (!hasWeight(type)) return set.reps === null ? '' : String(set.reps);
  const weight = weightText(set.weightKg, units.weightUnit);
  const sign = type === 'weighted_bodyweight' ? '+' : type === 'assisted_bodyweight' ? '−' : '';
  return `${sign}${weight} × ${set.reps ?? ''}`;
}

export type SetHints = Pick<SessionSet, 'weight' | 'reps' | 'duration' | 'distance'>;

const noHints: SetHints = { weight: '', reps: '', duration: '', distance: '' };

// The grey hint in each empty field, and the value used if the set is ticked
// without typing. In order: the same set in the last workout with this
// exercise, then the routine's targets, then the set above in this workout.
export function exerciseHints(
  exercise: SessionExercise,
  previous: SavedSetValues[],
  units: Units,
): SetHints[] {
  const { targets } = exercise;
  const hints: SetHints[] = [];
  let above: SetHints = noHints;
  exercise.sets.forEach((set, index) => {
    const last = previous[index];
    const seconds = last?.durationSeconds ?? targets.durationSeconds;
    const metres = last?.distanceM ?? null;
    const hint: SetHints = {
      weight: weightText(last?.weightKg ?? targets.weightKg, units.weightUnit) || above.weight,
      reps: numberText(last?.reps ?? targets.repsMin, 0) || above.reps,
      duration: seconds === null ? above.duration : secondsToDurationDigits(seconds),
      distance:
        numberText(metres === null ? null : fromMetres(metres, units.distanceUnit), 2) ||
        above.distance,
    };
    hints.push(hint);
    above = {
      weight: set.weight || hint.weight,
      reps: set.reps || hint.reps,
      duration: set.duration || hint.duration,
      distance: set.distance || hint.distance,
    };
  });
  return hints;
}

type ResolvedSet =
  { ok: true; values: SetHints; saved: SavedSetValues } | { ok: false; message: string };

// Checks a set before it is ticked, using the typed value or else the hint for
// each field the type needs. The limits match the checks on the sets table.
export function resolveSet(
  type: ExerciseType,
  set: SessionSet,
  hints: SetHints,
  units: Units,
): ResolvedSet {
  const values = {
    weight: hasWeight(type) ? set.weight || hints.weight : '',
    reps: hasReps(type) ? set.reps || hints.reps : '',
    duration: hasDuration(type) ? set.duration || hints.duration : '',
    distance: hasDistance(type) ? set.distance || hints.distance : '',
  };

  const missing = [
    hasWeight(type) && values.weight === '' ? 'weight' : null,
    hasDistance(type) && values.distance === '' ? 'distance' : null,
    hasReps(type) && values.reps === '' ? 'reps' : null,
    hasDuration(type) && values.duration === '' ? 'time' : null,
  ].filter((field) => field !== null);
  if (missing.length > 0) return { ok: false, message: `Enter the ${missing.join(' and ')}.` };

  const weight = hasWeight(type) ? parseDecimalInput(values.weight) : null;
  const weightKg = weight === null ? null : roundTo(toKilograms(weight, units.weightUnit), 3);
  if (hasWeight(type) && (weightKg === null || weightKg > 1000)) {
    return {
      ok: false,
      message: `Weight must be from 0 to ${units.weightUnit === 'kg' ? 1000 : 2200} ${units.weightUnit}.`,
    };
  }

  const reps = hasReps(type) && /^\d+$/.test(values.reps) ? Number(values.reps) : null;
  if (hasReps(type) && (reps === null || reps < 1 || reps > 1000)) {
    return { ok: false, message: 'Reps must be from 1 to 1000.' };
  }

  const durationSeconds = hasDuration(type) ? durationDigitsToSeconds(values.duration) : null;
  if (
    hasDuration(type) &&
    (durationSeconds === null || durationSeconds < 1 || durationSeconds > 86400)
  ) {
    return { ok: false, message: 'Time must be from 0:01 to 24:00:00.' };
  }

  const distance = hasDistance(type) ? parseDecimalInput(values.distance) : null;
  const distanceM = distance === null ? null : roundTo(toMetres(distance, units.distanceUnit), 1);
  if (hasDistance(type) && (distanceM === null || distanceM <= 0 || distanceM > 1_000_000)) {
    return { ok: false, message: 'Enter a distance above 0.' };
  }

  return { ok: true, values, saved: { weightKg, reps, durationSeconds, distanceM } };
}
