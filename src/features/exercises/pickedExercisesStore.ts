import { create } from 'zustand';

import type { ExerciseSummary } from './schemas/exerciseSchemas';

type PickedExercisesState = {
  picked: ExerciseSummary[] | null;
  setPicked: (exercises: ExerciseSummary[]) => void;
  // Returns the picked exercises once and clears them, so they are added only once.
  takePicked: () => ExerciseSummary[] | null;
};

// Hands the exercises chosen in the picker back to the screen that opened it.
// The picker is its own screen, and Expo Router has no way to return a value
// from one screen to another, so the choice waits here until the opening
// screen is shown again.
export const usePickedExercises = create<PickedExercisesState>((set, get) => ({
  picked: null,
  setPicked: (exercises) => set({ picked: exercises }),
  takePicked: () => {
    const { picked } = get();
    set({ picked: null });
    return picked;
  },
}));
