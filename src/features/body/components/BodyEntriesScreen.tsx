import { EmptyState } from '@/components/ui/EmptyState';
import { ListRow } from '@/components/ui/ListRow';
import { ListSection } from '@/components/ui/ListSection';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { Screen } from '@/components/ui/Screen';
import { useDialog } from '@/components/ui/useDialog';
import { dayKeyToTime, shortDate } from '@/features/history/utils/historyDates';
import { useUnits } from '@/features/settings/hooks/useUnits';
import { errorMessage, toAppError } from '@/lib/errors';
import { formatWeight } from '@/lib/units';
import { useIsOffline } from '@/lib/useIsOffline';

import { useDeleteBodyEntry } from '../api/body';
import { useShownBodyEntries } from '../hooks/useShownBodyEntries';

// Every logged day, newest first. Tapping a saved day offers to delete it,
// which needs a connection.
export function BodyEntriesScreen() {
  const units = useUnits();
  const isOffline = useIsOffline();
  const { entries } = useShownBodyEntries();
  const deleteEntry = useDeleteBodyEntry();
  const { dialog, showDialog } = useDialog();

  function confirmDelete(measuredOn: string) {
    const day = shortDate(dayKeyToTime(measuredOn));
    showDialog({
      title: 'Delete this entry?',
      message: `Your bodyweight for ${day} will be deleted.`,
      actions: [
        { label: 'Cancel' },
        {
          label: 'Delete entry',
          destructive: true,
          onPress: () =>
            deleteEntry.mutate(measuredOn, {
              onError: (error) =>
                showDialog({
                  title: "Couldn't delete the entry",
                  message: errorMessage(toAppError(error)),
                  actions: [{ label: 'OK' }],
                }),
            }),
        },
      ],
    });
  }

  if (entries.length === 0) {
    return (
      <Screen padded={false} edges={['bottom']}>
        <EmptyState title="No entries yet" message="Log your bodyweight from the Profile tab." />
      </Screen>
    );
  }

  return (
    <Screen scroll padded={false} edges={['bottom']}>
      {isOffline ? <OfflineBanner message="You're offline. Connect to delete entries." /> : null}
      <ListSection footer="Tap a day to delete it.">
        {entries.map(({ entry, pending }) => (
          <ListRow
            key={entry.measured_on}
            title={shortDate(dayKeyToTime(entry.measured_on))}
            subtitle={
              pending
                ? `${formatWeight(entry.weight_kg, units.weightUnit)}. Not synced yet`
                : formatWeight(entry.weight_kg, units.weightUnit)
            }
            onPress={pending || isOffline ? undefined : () => confirmDelete(entry.measured_on)}
            accessibilityHint={pending || isOffline ? undefined : 'Offers to delete this entry'}
          />
        ))}
      </ListSection>
      {dialog}
    </Screen>
  );
}
