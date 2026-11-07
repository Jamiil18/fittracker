import { create } from 'zustand';

import type { WorkoutSummary } from './utils/finishWorkout';

type FinishedWorkoutState = {
  summary: WorkoutSummary | null;
  show: (summary: WorkoutSummary) => void;
};

// Hands the summary of the workout just finished to the summary screen. It is
// kept in memory only: once that screen is closed it isn't needed again.
export const useFinishedWorkout = create<FinishedWorkoutState>()((set) => ({
  summary: null,
  show: (summary) => set({ summary }),
}));
