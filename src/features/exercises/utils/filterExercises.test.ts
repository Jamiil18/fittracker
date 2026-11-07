import type { ExerciseSummary } from '../schemas/exerciseSchemas';
import { filterExercises } from './filterExercises';
import { exerciseSubtitle } from './labels';

function exercise(name: string, overrides: Partial<ExerciseSummary> = {}): ExerciseSummary {
  return {
    id: name,
    name,
    exerciseType: 'weight_reps',
    primaryMuscles: ['chest'],
    secondaryMuscles: [],
    equipment: 'barbell',
    ...overrides,
  };
}

const library = [
  exercise('Barbell Bench Press - Medium Grip'),
  exercise('Dumbbell Bench Press', { equipment: 'dumbbell' }),
  exercise('Pull-Up', {
    primaryMuscles: ['lats'],
    equipment: 'body_only',
    exerciseType: 'bodyweight_reps',
  }),
  exercise('Wide-Grip Lat Pulldown', { primaryMuscles: ['lats'], equipment: 'cable' }),
  exercise('Barbell Squat', { primaryMuscles: ['quadriceps'] }),
];

const none = { query: '', muscle: null, equipment: null };

function names(result: ExerciseSummary[]) {
  return result.map((item) => item.name);
}

describe('filterExercises', () => {
  it('returns everything when nothing is typed or chosen', () => {
    expect(filterExercises(library, none)).toHaveLength(library.length);
  });

  it('matches every typed word, in any order and any case, shorter names first', () => {
    expect(names(filterExercises(library, { ...none, query: 'press bench' }))).toEqual([
      'Dumbbell Bench Press',
      'Barbell Bench Press - Medium Grip',
    ]);
  });

  it('ranks an exact name first, then names that start with the query', () => {
    const pushUps = [
      exercise('Push Up to Side Plank'),
      exercise('Push-Up Wide'),
      exercise('Pushups'),
      exercise('Incline Push-Up'),
    ];
    expect(names(filterExercises(pushUps, { ...none, query: 'push up' }))).toEqual([
      'Pushups',
      'Push-Up Wide',
      'Push Up to Side Plank',
      'Incline Push-Up',
    ]);
  });

  it('ignores punctuation and spacing differences', () => {
    expect(names(filterExercises(library, { ...none, query: 'pullup' }))).toEqual(['Pull-Up']);
    expect(names(filterExercises(library, { ...none, query: 'pull up' }))).toEqual(['Pull-Up']);
  });

  it('lists names that start with the query first', () => {
    expect(names(filterExercises(library, { ...none, query: 'pull' }))).toEqual([
      'Pull-Up',
      'Wide-Grip Lat Pulldown',
    ]);
  });

  it('filters by main muscle and by equipment, together with the search', () => {
    expect(names(filterExercises(library, { ...none, muscle: 'lats' }))).toEqual([
      'Pull-Up',
      'Wide-Grip Lat Pulldown',
    ]);
    expect(
      names(filterExercises(library, { query: 'press', muscle: 'chest', equipment: 'dumbbell' })),
    ).toEqual(['Dumbbell Bench Press']);
  });

  it('returns nothing when no name matches', () => {
    expect(filterExercises(library, { ...none, query: 'zercher' })).toEqual([]);
  });
});

describe('exerciseSubtitle', () => {
  it('names the main muscle and the equipment', () => {
    expect(exerciseSubtitle(['chest'], 'barbell')).toBe('Chest, barbell');
    expect(exerciseSubtitle(['lower_back'], 'body_only')).toBe('Lower back, bodyweight');
  });
});
