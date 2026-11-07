// The exercise library comes from free-exercise-db, released under the
// Unlicense (public domain). It is pinned to one commit so the data and images
// can never change underneath the app.
export const datasetCommit = 'f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5';

const datasetBaseUrl = `https://raw.githubusercontent.com/yuhonas/free-exercise-db/${datasetCommit}`;

export const datasetJsonUrl = `${datasetBaseUrl}/dist/exercises.json`;

// Library exercises store image paths relative to the dataset's exercises
// folder, for example "Plank/0.jpg".
export function exerciseImageUrl(imagePath: string): string {
  return `${datasetBaseUrl}/exercises/${imagePath}`;
}
