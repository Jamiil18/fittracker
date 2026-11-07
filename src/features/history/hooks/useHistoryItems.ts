import { useMemo } from 'react';

import { useCardioSessions } from '@/features/cardio/api/cardio';
import { usePendingCardio } from '@/features/cardio/hooks/usePendingCardio';
import { useExerciseLibrary } from '@/features/exercises/api/exercises';
import { useSession } from '@/features/auth/components/SessionProvider';
import { savePayloadSchema } from '@/features/workout/schemas/savePayloadSchema';
import { useOutbox } from '@/lib/outbox/outboxStore';

import { useTrainingHistory } from '../api/history';
import type { PastWorkout } from '../schemas/historySchemas';
import { cardioItem, workoutItem, type HistoryItem } from '../utils/historyList';
import { pendingWorkout } from '../utils/pastWorkout';

// Finished workouts still in the outbox, shaped like saved ones.
export function usePendingWorkouts(): PastWorkout[] {
  const { user } = useSession();
  const items = useOutbox((state) => state.items);
  const library = useExerciseLibrary().data;
  return useMemo(() => {
    const exercises = new Map((library ?? []).map((exercise) => [exercise.id, exercise]));
    return items.flatMap((item) => {
      if (item.kind !== 'workout' || item.userId !== user?.id) return [];
      const parsed = savePayloadSchema.safeParse(item.payload);
      return parsed.success ? [pendingWorkout(parsed.data, exercises)] : [];
    });
  }, [items, library, user?.id]);
}

// Saved workouts and cardio sessions, and those waiting to sync, for the
// History list. One that has just synced but not yet left the outbox is
// listed once, as saved.
export function useHistoryItems() {
  const history = useTrainingHistory();
  const pending = usePendingWorkouts();
  const cardio = useCardioSessions().data;
  const pendingCardio = usePendingCardio();
  const items = useMemo<HistoryItem[]>(() => {
    const saved = history.data ?? [];
    const savedCardio = cardio ?? [];
    const savedIds = new Set([...saved, ...savedCardio].map((item) => item.id));
    return [
      ...pending
        .filter((workout) => !savedIds.has(workout.id))
        .map((workout) => workoutItem(workout, true)),
      ...saved.map((workout) => workoutItem(workout, false)),
      ...pendingCardio
        .filter((item) => !savedIds.has(item.session.id))
        .map((item) => cardioItem(item.session, true)),
      ...savedCardio.map((session) => cardioItem(session, false)),
    ];
  }, [history.data, pending, cardio, pendingCardio]);
  return { ...history, items };
}
