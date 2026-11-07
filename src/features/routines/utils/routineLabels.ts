import type { ExerciseType } from '@/features/exercises/schemas/exerciseSchemas';
import { hasDuration } from '@/features/workout/utils/setValues';
import { formatDuration } from '@/lib/durations';
import { formatWeight, type WeightUnit } from '@/lib/units';

type Targets = {
  targetSets: number;
  targetRepsMin: number | null;
  targetRepsMax: number | null;
  targetDurationSeconds: number | null;
  targetWeightKg: number | null;
};

// "3 sets × 8–12 reps", "4 sets × 5 reps", "3 sets × 0:45", or "3 sets" when
// only the sets are set, followed by any target weight: "@ 60 kg", "@ +10 kg"
// for added weight, or "@ 20 kg assistance".
export function targetSummary(
  exerciseType: ExerciseType,
  targets: Targets,
  weightUnit: WeightUnit,
): string {
  const summary = setsAndRepsSummary(exerciseType, targets);
  if (targets.targetWeightKg === null) return summary;
  const weight = formatWeight(targets.targetWeightKg, weightUnit);
  if (exerciseType === 'weight_reps') return `${summary} @ ${weight}`;
  if (exerciseType === 'weighted_bodyweight') return `${summary} @ +${weight}`;
  if (exerciseType === 'assisted_bodyweight') return `${summary} @ ${weight} assistance`;
  return summary;
}

function setsAndRepsSummary(exerciseType: ExerciseType, targets: Targets): string {
  const sets = `${targets.targetSets} ${targets.targetSets === 1 ? 'set' : 'sets'}`;
  if (hasDuration(exerciseType)) {
    return targets.targetDurationSeconds === null
      ? sets
      : `${sets} × ${formatDuration(targets.targetDurationSeconds)}`;
  }
  if (targets.targetRepsMin === null) return sets;
  const reps =
    targets.targetRepsMax === null || targets.targetRepsMax === targets.targetRepsMin
      ? `${targets.targetRepsMin}`
      : `${targets.targetRepsMin}–${targets.targetRepsMax}`;
  const unit = targets.targetRepsMin === 1 && targets.targetRepsMax === null ? 'rep' : 'reps';
  return `${sets} × ${reps} ${unit}`;
}

// The rest time a routine exercise actually uses, for the end of a summary
// line: "rest 2:30", or "no rest timer" when it is switched off.
export function restSummary(restSeconds: number | null, defaultRestSeconds: number): string {
  const seconds = restSeconds ?? defaultRestSeconds;
  return seconds === 0 ? 'no rest timer' : `rest ${formatDuration(seconds)}`;
}

// The choices in the rest time picker: every 15 seconds up to 3 minutes, then
// longer steps up to the database's 15 minute limit.
export const restChoices = [
  0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 210, 240, 300, 360, 420, 480, 600, 900,
];

export function restChoiceLabel(restSeconds: number | null, defaultRestSeconds: number): string {
  if (restSeconds === null) return `Default (${formatDuration(defaultRestSeconds)})`;
  if (restSeconds === 0) return 'No rest timer';
  return formatDuration(restSeconds);
}

// The second line of a routine in a list: "Bench press, Incline press, +4 more".
export function exerciseNamesSummary(names: string[], shown = 2): string {
  const listed = names.slice(0, shown).join(', ');
  const remaining = names.length - shown;
  return remaining > 0 ? `${listed}, +${remaining} more` : listed;
}
