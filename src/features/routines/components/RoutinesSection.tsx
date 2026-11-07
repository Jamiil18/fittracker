import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ListRow } from '@/components/ui/ListRow';
import { ListSection } from '@/components/ui/ListSection';
import { Skeleton } from '@/components/ui/Skeleton';
import { SwipeableRow, type SwipeAction } from '@/components/ui/SwipeableRow';
import { useDialog } from '@/components/ui/useDialog';
import { errorMessage, toAppError } from '@/lib/errors';
import { useIsOffline } from '@/lib/useIsOffline';
import { screenPadding, spacing } from '@/theme/layout';

import { useDeleteRoutine, useRoutines } from '../api/routines';
import type { Routine } from '../schemas/routineSchemas';
import { exerciseNamesSummary } from '../utils/routineLabels';

// The user's routines on the Train tab. Swiping a row left offers Delete;
// screen readers get it as a row action.
export function RoutinesSection() {
  const router = useRouter();
  const isOffline = useIsOffline();
  const routines = useRoutines();
  const deleteRoutine = useDeleteRoutine();
  const { dialog, showDialog } = useDialog();

  function showError(title: string) {
    return (error: unknown) =>
      showDialog({ title, message: errorMessage(toAppError(error)), actions: [{ label: 'OK' }] });
  }

  function confirmDelete(routine: Routine) {
    showDialog({
      title: 'Delete routine?',
      message: `"${routine.name}" will be deleted. The exercises in it stay in your library.`,
      actions: [
        { label: 'Cancel' },
        {
          label: 'Delete routine',
          destructive: true,
          onPress: () =>
            deleteRoutine.mutate(routine.id, { onError: showError("Couldn't delete routine") }),
        },
      ],
    });
  }

  const count = routines.data?.length ?? 0;
  const actions = (
    <>
      {count >= 2 ? (
        <Button
          label="Reorder"
          variant="plain"
          disabled={isOffline}
          onPress={() => router.push('/routines/reorder')}
        />
      ) : null}
      <Button
        label="New"
        variant="plain"
        disabled={isOffline}
        accessibilityHint="Creates a routine"
        onPress={() => router.push('/routines/new')}
      />
    </>
  );

  if (routines.data === undefined) {
    return (
      <ListSection title="Routines" actions={actions}>
        {routines.isError ? (
          <ErrorState
            title="Couldn't load your routines"
            message={errorMessage(toAppError(routines.error))}
            onRetry={() => void routines.refetch()}
          />
        ) : (
          <View accessible accessibilityLabel="Loading" style={styles.loading}>
            <Skeleton width="40%" height={17} />
            <Skeleton width="70%" height={14} />
          </View>
        )}
      </ListSection>
    );
  }

  if (count === 0) {
    return (
      <ListSection title="Routines" actions={actions}>
        <EmptyState
          title="No routines yet"
          message={
            isOffline
              ? 'Connect to the internet to create your first routine.'
              : 'Save the exercises you do each session, with your target sets, reps and rest times.'
          }
          actionLabel={isOffline ? undefined : 'New routine'}
          onAction={() => router.push('/routines/new')}
        />
      </ListSection>
    );
  }

  return (
    <>
      <ListSection title="Routines" actions={actions}>
        {routines.data.map((routine) => {
          const rowActions: SwipeAction[] = [
            { label: 'Delete', destructive: true, onPress: () => confirmDelete(routine) },
          ];
          return (
            <SwipeableRow key={routine.id} actions={rowActions} enabled={!isOffline}>
              <ListRow
                title={routine.name}
                subtitle={exerciseNamesSummary(routine.exercises.map((item) => item.exercise.name))}
                showChevron
                onPress={() =>
                  router.push({ pathname: '/routines/[id]', params: { id: routine.id } })
                }
                accessibilityActions={
                  isOffline ? [] : rowActions.map(({ label }) => ({ name: label, label }))
                }
                onAccessibilityAction={(event) =>
                  rowActions.find(({ label }) => label === event.nativeEvent.actionName)?.onPress()
                }
              />
            </SwipeableRow>
          );
        })}
      </ListSection>
      {dialog}
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    paddingHorizontal: screenPadding,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
});
