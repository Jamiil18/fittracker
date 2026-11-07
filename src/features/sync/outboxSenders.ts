import { sendBodyLog } from '@/features/body/api/body';
import { sendCardioSession } from '@/features/cardio/api/cardio';
import { saveWorkout } from '@/features/workout/api/workoutApi';
import type { OutboxSenders } from '@/lib/outbox/flushOutbox';

// How each kind of queued write is sent. Defined once, outside any component,
// so the sync hook isn't restarted on every render.
export const outboxSenders: OutboxSenders = {
  workout: saveWorkout,
  body: sendBodyLog,
  cardio: sendCardioSession,
};
