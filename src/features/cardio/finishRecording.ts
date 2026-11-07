import { outboxSenders } from '@/features/sync/outboxSenders';
import { flushOutbox } from '@/lib/outbox/flushOutbox';
import { useOutbox } from '@/lib/outbox/outboxStore';

import { useCardioRecording } from './recordingStore';
import { toCardioPayload } from './utils/recording';

// Ends the recording now: it goes into the outbox before it leaves the
// recording store, so it can't be lost between the two, and is sent straight
// away or when the connection returns. Returns the session's id.
export function finishRecording(userId: string): string | null {
  const recording = useCardioRecording.getState().recording;
  if (!recording) return null;
  useOutbox.getState().add({
    id: recording.id,
    kind: 'cardio',
    userId,
    payload: toCardioPayload(recording, Date.now()),
  });
  useCardioRecording.getState().clear();
  void flushOutbox(userId, outboxSenders);
  return recording.id;
}
