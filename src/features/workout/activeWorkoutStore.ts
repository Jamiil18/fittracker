import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { logger } from '@/lib/logger';

import { sessionSchema, type WorkoutSession } from './schemas/sessionSchema';

type ActiveWorkoutState = {
  session: WorkoutSession | null;
  // Whether the explanation before asking for notification permission has
  // been shown, so it isn't shown before every workout.
  notificationPromptSeen: boolean;
  start: (session: WorkoutSession) => void;
  // Applies one of the functions in utils/session.ts to the workout.
  update: (change: (session: WorkoutSession) => WorkoutSession) => void;
  markNotificationPromptSeen: () => void;
  clear: () => void;
};

// The workout in progress lives only on the phone until it is finished.
// Saving it to AsyncStorage after every change is what lets it survive the app
// being closed or the phone restarting.
export const useActiveWorkout = create<ActiveWorkoutState>()(
  persist(
    (set) => ({
      session: null,
      notificationPromptSeen: false,
      start: (session) => set({ session }),
      update: (change) =>
        set((state) => (state.session ? { session: change(state.session) } : state)),
      markNotificationPromptSeen: () => set({ notificationPromptSeen: true }),
      clear: () => set({ session: null }),
    }),
    {
      name: 'fittracker-active-workout',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      partialize: ({ session, notificationPromptSeen }) => ({ session, notificationPromptSeen }),
      // A saved workout is checked before use, so a damaged copy is dropped
      // instead of crashing the app.
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<ActiveWorkoutState>;
        const parsed = sessionSchema.nullable().safeParse(saved.session ?? null);
        if (!parsed.success) logger.error('restore workout', parsed.error);
        return {
          ...current,
          session: parsed.success ? parsed.data : null,
          notificationPromptSeen: saved.notificationPromptSeen === true,
        };
      },
    },
  ),
);
