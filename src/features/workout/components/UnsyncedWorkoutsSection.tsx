import { ListRow } from '@/components/ui/ListRow';
import { ListSection } from '@/components/ui/ListSection';
import { useDialog } from '@/components/ui/useDialog';
import { useSession } from '@/features/auth/components/SessionProvider';
import { AppError, errorMessage } from '@/lib/errors';
import { flushOutbox } from '@/lib/outbox/flushOutbox';
import { useOutbox, type OutboxItem } from '@/lib/outbox/outboxStore';

import { outboxSenders } from '@/features/sync/outboxSenders';
import { savePayloadSchema } from '../schemas/savePayloadSchema';

function workoutName(item: OutboxItem): string {
  const parsed = savePayloadSchema.safeParse(item.payload);
  return parsed.success ? parsed.data.name : 'Workout';
}

// Finished workouts still waiting to reach the server, shown on the Train tab
// until they sync. History marks them the same way.
export function UnsyncedWorkoutsSection() {
  const { user } = useSession();
  const userId = user?.id ?? '';
  const allItems = useOutbox((state) => state.items);
  const items = allItems.filter((item) => item.userId === userId && item.kind === 'workout');
  const { dialog, showDialog } = useDialog();

  if (items.length === 0) return null;

  function showOptions(item: OutboxItem) {
    const name = workoutName(item);
    showDialog({
      title: 'Not synced yet',
      message: item.failure
        ? `"${name}" couldn't be saved. ${errorMessage(new AppError(item.failure))}`
        : `"${name}" is saved on this phone and will sync when you're online.`,
      actions: [
        {
          label: 'Delete workout',
          destructive: true,
          onPress: () =>
            showDialog({
              title: 'Delete this workout?',
              message: `"${name}" hasn't reached your account, so deleting it here removes it for good.`,
              actions: [
                { label: 'Keep it' },
                {
                  label: 'Delete workout',
                  destructive: true,
                  onPress: () => useOutbox.getState().remove(item.id),
                },
              ],
            }),
        },
        { label: 'Try again', onPress: () => void flushOutbox(userId, outboxSenders) },
      ],
    });
  }

  return (
    <>
      <ListSection title="Not synced yet">
        {items.map((item) => (
          <ListRow
            key={item.id}
            title={workoutName(item)}
            subtitle={
              item.failure ? "Couldn't be saved. Tap for options." : "Syncs when you're online"
            }
            tone={item.failure ? 'error' : 'text'}
            onPress={() => showOptions(item)}
          />
        ))}
      </ListSection>
      {dialog}
    </>
  );
}
