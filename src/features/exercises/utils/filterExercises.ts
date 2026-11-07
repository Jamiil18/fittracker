import type { Equipment, ExerciseSummary, MuscleGroup } from '../schemas/exerciseSchemas';

export type ExerciseFilters = {
  query: string;
  muscle: MuscleGroup | null;
  equipment: Equipment | null;
};

// Lower case, with punctuation as spaces, so "pull up", "Pull-Up" and
// "pullup" all find "Pull-Up".
function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function compact(text: string): string {
  return normalise(text).replace(/ /g, '');
}

// Lower is better: an exact name (allowing a plural, so "push up" matches
// "Pushups"), then names that start with the query, then names containing a
// word that starts with it, then any other match.
function rank(name: string, compactQuery: string, firstWord: string): number {
  const compactName = compact(name);
  if ([compactQuery, `${compactQuery}s`, `${compactQuery}es`].includes(compactName)) return 0;
  if (compactName.startsWith(compactQuery)) return 1;
  if (
    normalise(name)
      .split(' ')
      .some((word) => word.startsWith(firstWord))
  ) {
    return 2;
  }
  return 3;
}

// The library (about 900 exercises) is searched on the phone, so results are
// instant and work offline. Every word typed must appear in the name. The closest matches come first, and among equally
// close matches the shorter name, because extra words mean a variation.
export function filterExercises(
  exercises: ExerciseSummary[],
  { query, muscle, equipment }: ExerciseFilters,
): ExerciseSummary[] {
  const words = normalise(query).split(' ').filter(Boolean);
  const compactQuery = compact(query);

  const matches = exercises.filter((exercise) => {
    if (muscle && !exercise.primaryMuscles.includes(muscle)) return false;
    if (equipment && exercise.equipment !== equipment) return false;
    if (words.length === 0) return true;
    const name = normalise(exercise.name);
    return (
      words.every((word) => name.includes(word)) || compact(exercise.name).includes(compactQuery)
    );
  });

  const [firstWord] = words;
  if (firstWord === undefined) return matches;
  return matches
    .map((exercise) => ({ exercise, rank: rank(exercise.name, compactQuery, firstWord) }))
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        a.exercise.name.length - b.exercise.name.length ||
        a.exercise.name.localeCompare(b.exercise.name),
    )
    .map(({ exercise }) => exercise);
}
