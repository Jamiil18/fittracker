import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { DateButton } from '@/components/ui/DateButton';
import { ListRow } from '@/components/ui/ListRow';
import { ListSection } from '@/components/ui/ListSection';
import { NumberField } from '@/components/ui/NumberField';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useConfirmLeave } from '@/components/ui/useConfirmLeave';
import { useSession } from '@/features/auth/components/SessionProvider';
import { shortDate } from '@/features/history/utils/historyDates';
import { useUnits } from '@/features/settings/hooks/useUnits';
import { outboxSenders } from '@/features/sync/outboxSenders';
import { toLocalDateString } from '@/lib/dates';
import { newId } from '@/lib/ids';
import { flushOutbox } from '@/lib/outbox/flushOutbox';
import { useOutbox } from '@/lib/outbox/outboxStore';
import { screenPadding, spacing } from '@/theme/layout';

import {
  createBodyLogSchema,
  type BodyLogInput,
  type BodyLogPayload,
} from '../schemas/bodySchemas';

// The earliest day that can be logged; older entries aren't useful for trends.
const earliestDay = new Date(2000, 0, 1);

// Log a day's bodyweight. Works offline: the log goes into the outbox and is
// sent when there's a connection.
export function BodyLogScreen() {
  const router = useRouter();
  const { user } = useSession();
  const units = useUnits();
  const [today] = useState(() => new Date());
  const schema = useMemo(() => createBodyLogSchema(units.weightUnit), [units.weightUnit]);
  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<BodyLogInput, unknown, BodyLogPayload>({
    resolver: zodResolver(schema),
    defaultValues: { measuredOn: toLocalDateString(today), weight: '' },
  });
  const { allowLeave, dialog } = useConfirmLeave(isDirty, "This log hasn't been saved.");

  const save = handleSubmit((payload) => {
    if (!user) return;
    useOutbox.getState().add({ id: newId(), kind: 'body', userId: user.id, payload });
    void flushOutbox(user.id, outboxSenders);
    allowLeave();
    router.back();
  });

  return (
    <Screen scroll padded={false} edges={['bottom']}>
      <Controller
        control={control}
        name="measuredOn"
        render={({ field }) => (
          <ListSection>
            <ListRow
              title="Date"
              trailing={
                <DateButton
                  value={field.value}
                  onChange={field.onChange}
                  minimumDate={earliestDay}
                  maximumDate={today}
                  label="Date"
                  formatDate={(date) => shortDate(date.getTime())}
                />
              }
            />
          </ListSection>
        )}
      />
      <View style={styles.fields}>
        <Controller
          control={control}
          name="weight"
          render={({ field }) => (
            <NumberField
              label="Bodyweight"
              unit={units.weightUnit}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.weight?.message}
              maxLength={6}
            />
          )}
        />
        <Text variant="secondary" tone="textMuted">
          Logging a day again replaces its bodyweight.
        </Text>
      </View>
      <View style={styles.actions}>
        <Button label="Save log" onPress={save} />
      </View>
      {dialog}
    </Screen>
  );
}

const styles = StyleSheet.create({
  fields: {
    paddingHorizontal: screenPadding,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  actions: {
    padding: screenPadding,
    paddingTop: spacing.xl,
  },
});
