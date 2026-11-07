import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { logger } from '@/lib/logger';

import { recordingSchema, type Recording } from './utils/recording';

type RecordingState = {
  recording: Recording | null;
  start: (recording: Recording) => void;
  update: (change: (recording: Recording) => Recording) => void;
  clear: () => void;
};

// The cardio recording in progress, saved on the phone as it goes so a route
// isn't lost if the app closes. Location is only tracked while the recording
// screen is open (foreground tracking), so a recording restored after the app
// closed comes back paused, from the moment its last point was recorded.
export const useCardioRecording = create<RecordingState>()(
  persist(
    (set) => ({
      recording: null,
      start: (recording) => set({ recording }),
      update: (change) =>
        set((state) => (state.recording ? { recording: change(state.recording) } : state)),
      clear: () => set({ recording: null }),
    }),
    {
      name: 'fittracker-cardio-recording',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      partialize: ({ recording }) => ({ recording }),
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as { recording?: unknown };
        const parsed = recordingSchema.nullable().safeParse(saved.recording ?? null);
        if (!parsed.success) logger.error('restore cardio recording', parsed.error);
        const recording = parsed.success ? parsed.data : null;
        if (recording && recording.pausedAt === null) {
          const lastPoint = recording.segments.flat().pop();
          recording.pausedAt = lastPoint?.[2] ?? recording.startedAt;
        }
        return { ...current, recording };
      },
    },
  ),
);
