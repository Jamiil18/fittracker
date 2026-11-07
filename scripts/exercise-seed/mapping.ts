// Turns free-exercise-db entries into rows for the exercises table. Pure, so
// the rules that decide how each exercise is logged are unit-tested.

export type DatasetExercise = {
  id: string;
  name: string;
  category: string;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  images: string[];
};

export type ExerciseType =
  | 'weight_reps'
  | 'bodyweight_reps'
  | 'weighted_bodyweight'
  | 'assisted_bodyweight'
  | 'duration'
  | 'distance_duration';

export type SeedRow = {
  sourceId: string;
  name: string;
  exerciseType: ExerciseType;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string;
  instructions: string[];
  imagePaths: string[];
};

const equipmentNames: Record<string, string> = {
  barbell: 'barbell',
  dumbbell: 'dumbbell',
  kettlebells: 'kettlebell',
  cable: 'cable',
  machine: 'machine',
  bands: 'bands',
  'body only': 'body_only',
  'e-z curl bar': 'ez_bar',
  'medicine ball': 'medicine_ball',
  'exercise ball': 'exercise_ball',
  'foam roll': 'foam_roll',
  other: 'other',
};

// Every dataset entry without equipment is a bodyweight movement (stretches,
// drills, push-ups), so a missing value means body only.
export function equipmentFor(equipment: string | null): string {
  if (equipment === null || equipment === '') return 'body_only';
  const mapped = equipmentNames[equipment];
  if (!mapped) throw new Error(`Unknown equipment "${equipment}"`);
  return mapped;
}

export function muscleFor(muscle: string): string {
  return muscle.replace(/ /g, '_');
}

// Cardio that is measured by how far you went, rather than only for how long.
const distanceCardio = /bicycl|bike|jogging|running|walking|rowing|skating|sprint/i;

// Static holds and continuous efforts logged by time, not repetitions.
const timedByName = /^plank$|^isometric (chest|neck)|^one handed hang$|battling ropes/i;

// Bodyweight movements the dataset files under "other" equipment because
// they need a bar, rings or a bench.
const bodyweightByName =
  /bodyweight|dips?\b|chin|pull-?ups?|push-?ups?|muscle up|hyperextension|inverted row|leg raise|knee\/hip raise|sit-?ups?|crunch/i;

// Decides how sets of a library exercise are logged. The rules are checked
// in order; the first that matches wins.
export function exerciseTypeFor(
  entry: Pick<DatasetExercise, 'name' | 'category' | 'equipment'>,
): ExerciseType {
  const equipment = equipmentFor(entry.equipment);
  const bodyweightEquipment = equipment === 'body_only' || equipment === 'other';

  if (entry.category === 'stretching') return 'duration';
  if (entry.category === 'cardio') {
    return distanceCardio.test(entry.name) ? 'distance_duration' : 'duration';
  }
  if (timedByName.test(entry.name)) return 'duration';
  if (/assisted/i.test(entry.name)) return 'assisted_bodyweight';
  if (/^weighted/i.test(entry.name)) return 'weighted_bodyweight';
  if (equipment === 'body_only') return 'bodyweight_reps';
  if (bodyweightEquipment && bodyweightByName.test(entry.name)) return 'bodyweight_reps';
  return 'weight_reps';
}

export function toSeedRow(entry: DatasetExercise): SeedRow {
  return {
    sourceId: entry.id,
    name: entry.name.trim(),
    exerciseType: exerciseTypeFor(entry),
    primaryMuscles: entry.primaryMuscles.map(muscleFor),
    secondaryMuscles: entry.secondaryMuscles.map(muscleFor),
    equipment: equipmentFor(entry.equipment),
    instructions: entry.instructions.map((step) => step.trim()).filter((step) => step !== ''),
    imagePaths: entry.images,
  };
}

function sqlText(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function sqlArray(values: string[], type: string): string {
  if (values.length === 0) return `'{}'::${type}`;
  return `array[${values.map(sqlText).join(', ')}]::${type}`;
}

export function toSqlValues(row: SeedRow): string {
  return `(${[
    sqlText(row.sourceId),
    sqlText(row.name),
    `${sqlText(row.exerciseType)}::public.exercise_type`,
    sqlArray(row.primaryMuscles, 'public.muscle_group[]'),
    sqlArray(row.secondaryMuscles, 'public.muscle_group[]'),
    `${sqlText(row.equipment)}::public.equipment`,
    sqlArray(row.instructions, 'text[]'),
    sqlArray(row.imagePaths, 'text[]'),
  ].join(', ')})`;
}
