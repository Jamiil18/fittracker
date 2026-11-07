import type { Equipment, ExerciseType, MuscleGroup } from '../schemas/exerciseSchemas';

export const exerciseTypeLabels: Record<ExerciseType, string> = {
  weight_reps: 'Weight and reps',
  bodyweight_reps: 'Bodyweight reps',
  weighted_bodyweight: 'Weighted bodyweight',
  assisted_bodyweight: 'Assisted bodyweight',
  duration: 'Time',
  distance_duration: 'Distance and time',
};

export const muscleLabels: Record<MuscleGroup, string> = {
  abdominals: 'Abdominals',
  abductors: 'Abductors',
  adductors: 'Adductors',
  biceps: 'Biceps',
  calves: 'Calves',
  chest: 'Chest',
  forearms: 'Forearms',
  glutes: 'Glutes',
  hamstrings: 'Hamstrings',
  lats: 'Lats',
  lower_back: 'Lower back',
  middle_back: 'Middle back',
  neck: 'Neck',
  quadriceps: 'Quadriceps',
  shoulders: 'Shoulders',
  traps: 'Traps',
  triceps: 'Triceps',
};

export const equipmentLabels: Record<Equipment, string> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbell',
  kettlebell: 'Kettlebell',
  cable: 'Cable',
  machine: 'Machine',
  bands: 'Bands',
  body_only: 'Bodyweight',
  ez_bar: 'EZ bar',
  medicine_ball: 'Medicine ball',
  exercise_ball: 'Exercise ball',
  foam_roll: 'Foam roller',
  other: 'Other',
};

// The second line of a list row, for example "Chest, barbell".
export function exerciseSubtitle(primaryMuscles: MuscleGroup[], equipment: Equipment): string {
  const muscle = primaryMuscles[0] ? muscleLabels[primaryMuscles[0]] : null;
  const kit = equipmentLabels[equipment].toLowerCase();
  return muscle ? `${muscle}, ${kit}` : equipmentLabels[equipment];
}
