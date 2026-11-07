import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { reorderItems } from 'react-native-reorderable-list';

import { Button } from '@/components/ui/Button';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { ReorderableNameList } from '@/components/ui/ReorderableNameList';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useConfirmLeave } from '@/components/ui/useConfirmLeave';
import { errorMessage, toAppError } from '@/lib/errors';
import { useIsOffline } from '@/lib/useIsOffline';
import { screenPadding, spacing } from '@/theme/layout';

import { useReorderRoutines } from '../api/routines';
import type { Routine } from '../schemas/routineSchemas';

type ReorderRoutinesListProps = {
  routines: Routine[];
};

// The new order is kept on this screen until Save, so one request saves it
// and leaving without saving changes nothing.
export function ReorderRoutinesList({ routines }: ReorderRoutinesListProps) {
  const router = useRouter();
  const isOffline = useIsOffline();
  const reorderRoutines = useReorderRoutines();
  const [order, setOrder] = useState(routines);
  const changed = order.some((routine, index) => routine.id !== routines[index]?.id);
  const { allowLeave, dialog } = useConfirmLeave(
    changed,
    "The new order of your routines hasn't been saved.",
  );

  function move(from: number, to: number) {
    setOrder((current) => reorderItems(current, from, to));
  }

  function save() {
    reorderRoutines.mutate(
      order.map((routine) => routine.id),
      {
        onSuccess: () => {
          allowLeave();
          router.back();
        },
      },
    );
  }

  return (
    <Screen padded={false} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Button
              label="Save"
              variant="plain"
              disabled={!changed || isOffline}
              loading={reorderRoutines.isPending}
              onPress={save}
            />
          ),
        }}
      />
      {isOffline ? <OfflineBanner message="You're offline. Connect to edit routines." /> : null}
      <Text variant="secondary" tone="textMuted" style={styles.hint}>
        Drag the handles to change the order on the Train tab.
      </Text>
      {reorderRoutines.error ? (
        <Text tone="error" accessibilityRole="alert" style={styles.hint}>
          {errorMessage(toAppError(reorderRoutines.error))}
        </Text>
      ) : null}
      <ReorderableNameList
        items={order.map((routine) => ({ key: routine.id, name: routine.name }))}
        onMove={move}
      />
      {dialog}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: {
    paddingHorizontal: screenPadding,
    paddingVertical: spacing.md,
  },
});
