import { equipmentFor, exerciseTypeFor, toSeedRow, toSqlValues } from './mapping.ts';

function typeOf(name: string, category = 'strength', equipment: string | null = 'barbell') {
  return exerciseTypeFor({ name, category, equipment });
}

describe('exerciseTypeFor', () => {
  it('logs loaded lifts as weight and reps', () => {
    expect(typeOf('Barbell Squat')).toBe('weight_reps');
    expect(typeOf('Dumbbell Bench Press', 'strength', 'dumbbell')).toBe('weight_reps');
  });

  it('logs bodyweight movements as reps only, including those needing a bar or bench', () => {
    expect(typeOf('Push-Up Wide', 'strength', 'body only')).toBe('bodyweight_reps');
    expect(typeOf('Mountain Climbers', 'plyometrics', null)).toBe('bodyweight_reps');
    expect(typeOf('Dips - Chest Version', 'strength', 'other')).toBe('bodyweight_reps');
    expect(typeOf('Inverted Row with Straps', 'strength', 'other')).toBe('bodyweight_reps');
  });

  it('keeps "other" equipment that is not a bodyweight movement as weight and reps', () => {
    expect(typeOf('Front Plate Raise', 'strength', 'other')).toBe('weight_reps');
  });

  it('recognises weighted and assisted bodyweight variants', () => {
    expect(typeOf('Weighted Pull Ups', 'strength', 'other')).toBe('weighted_bodyweight');
    expect(typeOf('Band Assisted Pull-Up', 'strength', 'other')).toBe('assisted_bodyweight');
  });

  it('logs stretches and static holds by time', () => {
    expect(typeOf("Child's Pose", 'stretching', null)).toBe('duration');
    expect(typeOf('Plank', 'strength', 'body only')).toBe('duration');
    expect(typeOf('Push Up to Side Plank', 'strength', 'body only')).toBe('bodyweight_reps');
    expect(typeOf('Hang Clean', 'olympic weightlifting', 'barbell')).toBe('weight_reps');
  });

  it('logs travelling cardio by distance and time, and the rest by time', () => {
    expect(typeOf('Rowing, Stationary', 'cardio', 'machine')).toBe('distance_duration');
    expect(typeOf('Running, Treadmill', 'cardio', 'machine')).toBe('distance_duration');
    expect(typeOf('Rope Jumping', 'cardio', 'other')).toBe('duration');
    expect(typeOf('Stairmaster', 'cardio', 'machine')).toBe('duration');
  });
});

describe('equipmentFor', () => {
  it('maps dataset names to the database enum, treating no equipment as body only', () => {
    expect(equipmentFor('e-z curl bar')).toBe('ez_bar');
    expect(equipmentFor('kettlebells')).toBe('kettlebell');
    expect(equipmentFor(null)).toBe('body_only');
  });

  it('refuses equipment the database does not know', () => {
    expect(() => equipmentFor('trampoline')).toThrow('Unknown equipment "trampoline"');
  });
});

describe('toSeedRow and toSqlValues', () => {
  const entry = {
    id: "Farmer's_Walk",
    name: "Farmer's Walk ",
    category: 'strongman',
    equipment: 'other',
    primaryMuscles: ['forearms'],
    secondaryMuscles: ['lower back', 'traps'],
    instructions: ['Grab the handles.', ' ', 'Walk.'],
    images: ["Farmer's_Walk/0.jpg"],
  };

  it('trims the name, converts muscle names and drops empty instructions', () => {
    expect(toSeedRow(entry)).toMatchObject({
      name: "Farmer's Walk",
      secondaryMuscles: ['lower_back', 'traps'],
      instructions: ['Grab the handles.', 'Walk.'],
    });
  });

  it('escapes quotes and casts every value to its column type', () => {
    const sql = toSqlValues(toSeedRow(entry));
    expect(sql).toContain("'Farmer''s Walk'");
    expect(sql).toContain("array['lower_back', 'traps']::public.muscle_group[]");
    expect(sql).toContain("'other'::public.equipment");
  });

  it('writes an empty array literal when a list is empty', () => {
    const sql = toSqlValues(toSeedRow({ ...entry, secondaryMuscles: [] }));
    expect(sql).toContain("'{}'::public.muscle_group[]");
  });
});
