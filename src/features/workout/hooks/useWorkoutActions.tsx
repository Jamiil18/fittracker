import { useRouter } from 'expo-router';

import { useDialog } from '@/components/ui/useDialog';
import { useSession } from '@/features/auth/components/SessionProvider';
import type { Routine } from '@/features/routines/schemas/routineSchemas';
import { useProfile } from '@/features/settings/api/profile';
import { flushOutbox } from '@/lib/outbox/flushOutbox';
import { useOutbox } from '@/lib/outbox/outboxStore';

import { useActiveWorkout } from '../activeWorkoutStore';
import { useFinishedWorkout } from '../finishedWorkoutStore';
import { outboxSenders } from '@/features/sync/outboxSenders';
import {
  finishedExercises,
  toSavePayload,
  unsavedSetCount,
  workoutSummary,
} from '../utils/finishWorkout';
import { createSession } from '../utils/session';
import type { HistorySet } from '../utils/setValues';
import { stopTimer } from '../workoutTimers';

function discardActiveWorkout() {
  stopTimer();
  useActiveWorkout.getState().clear();
}

// Starting, finishing and discarding a workout, with their confirmations.
// The screen using this renders the returned `dialog`.
export function useWorkoutActions() {
  const router = useRouter();
  const { user } = useSession();
  const profile = useProfile().data;
  const { dialog, showDialog } = useDialog();

  function begin(routine: Routine | null) {
    if (!user || !profile) return;
    useActiveWorkout.getState().start(
      createSession({
        userId: user.id,
        routine,
        weightUnit: profile.weightUnit,
        distanceUnit: profile.distanceUnit,
        defaultRestSeconds: profile.defaultRestSeconds,
        now: Date.now(),
      }),
    );
    router.push('/workout');
  }

  // Only one workout can be in progress; starting another asks first.
  function startWorkout(routine: Routine | null) {
    const current = useActiveWorkout.getState().session;
    if (!current) {
      begin(routine);
      return;
    }
    showDialog({
      title: 'Workout in progress',
      message: `"${current.name}" is still in progress. Resume it, or discard it and start a new one.`,
      actions: [
        {
          label: 'Discard and start new',
          destructive: true,
          onPress: () => {
            discardActiveWorkout();
            begin(routine);
          },
        },
        { label: 'Resume', onPress: () => router.push('/workout') },
      ],
    });
  }

  function confirmDiscard() {
    showDialog({
      title: 'Discard workout?',
      message: "The sets you've logged in this workout will be deleted.",
      actions: [
        { label: 'Keep going' },
        {
          label: 'Discard workout',
          destructive: true,
          onPress: () => {
            discardActiveWorkout();
            router.back();
          },
        },
      ],
    });
  }

  // The workout goes into the outbox before it leaves the phone's workout
  // store, so it can't be lost between the two; the outbox then sends it now
  // or when the connection returns.
  function finish(historyByExercise: ReadonlyMap<string, HistorySet[]>) {
    const session = useActiveWorkout.getState().session;
    if (!session || !user) return;
    const endedAt = Date.now();
    useOutbox.getState().add({
      id: session.id,
      kind: 'workout',
      userId: user.id,
      payload: toSavePayload(session, endedAt),
    });
    useFinishedWorkout.getState().show(workoutSummary(session, endedAt, historyByExercise));
    discardActiveWorkout();
    router.replace('/workout-summary');
    void flushOutbox(user.id, outboxSenders);
  }

  function confirmFinish(historyByExercise: ReadonlyMap<string, HistorySet[]>) {
    const session = useActiveWorkout.getState().session;
    if (!session) return;
    if (finishedExercises(session).length === 0) {
      showDialog({
        title: 'Nothing to save yet',
        message: 'Tick at least one set to save this workout, or discard it.',
        actions: [
          { label: 'Keep going' },
          { label: 'Discard workout', destructive: true, onPress: confirmDiscard },
        ],
      });
      return;
    }
    const unsaved = unsavedSetCount(session);
    if (unsaved === 0) {
      finish(historyByExercise);
      return;
    }
    showDialog({
      title: 'Finish workout?',
      message: `${unsaved} ${unsaved === 1 ? "set isn't" : "sets aren't"} ticked and won't be saved.`,
      actions: [
        { label: 'Keep going' },
        { label: 'Finish workout', onPress: () => finish(historyByExercise) },
      ],
    });
  }

  return { dialog, startWorkout, confirmFinish, confirmDiscard };
}
