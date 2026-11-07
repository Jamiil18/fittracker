import { zodResolver } from '@hookform/resolvers/zod';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { StyleSheet, View, type FlatList } from 'react-native';
import ReorderableList from 'react-native-reorderable-list';

import { Button } from '@/components/ui/Button';
import { KeyboardScrollContext } from '@/components/ui/KeyboardScrollContext';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { Screen } from '@/components/ui/Screen';
import { SelectSheet } from '@/components/ui/SelectSheet';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { usePickedExercises } from '@/features/exercises/pickedExercisesStore';
import { useProfile } from '@/features/settings/api/profile';
import { errorMessage, toAppError, type AppError } from '@/lib/errors';
import { useIsOffline } from '@/lib/useIsOffline';
import { screenPadding, spacing } from '@/theme/layout';

import { useConfirmLeave } from '@/components/ui/useConfirmLeave';
import { useKeyboardAwareScroll } from '@/components/ui/useKeyboardAwareScroll';
import {
  maxRoutineExercises,
  maxRoutineNameLength,
  maxRoutineNotesLength,
  createRoutineFormSchema,
  type RoutineFormInput,
  type RoutineValues,
} from '../schemas/routineSchemas';
import { newRoutineExercise } from '../utils/routineForm';
import { restChoiceLabel, restChoices } from '../utils/routineLabels';
import { RoutineExerciseEditor } from './RoutineExerciseEditor';

// The rest picker's values are strings, as SelectSheet needs; "default"
// stands for null, the profile's default rest time.
type RestChoice = 'default' | `${number}`;

type RoutineFormProps = {
  defaultValues: RoutineFormInput;
  submitLabel: string;
  // Called after a successful save, to leave the screen.
  onSubmit: (values: RoutineValues) => Promise<unknown>;
};

export function RoutineForm({ defaultValues, submitLabel, onSubmit }: RoutineFormProps) {
  const router = useRouter();
  const isOffline = useIsOffline();
  const profile = useProfile().data;
  const defaultRestSeconds = profile?.defaultRestSeconds ?? 120;
  const weightUnit = profile?.weightUnit ?? 'kg';
  const schema = useMemo(() => createRoutineFormSchema(weightUnit), [weightUnit]);
  const [restSheetIndex, setRestSheetIndex] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<AppError | null>(null);
  const {
    control,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<RoutineFormInput, unknown, RoutineValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });
  const { fields, append, remove, move } = useFieldArray({ control, name: 'exercises' });
  const listRef = useRef<FlatList<(typeof fields)[number]>>(null);
  const getScrollView = useCallback(() => listRef.current?.getNativeScrollRef(), []);
  const { keyboardHeight, inputEvents } = useKeyboardAwareScroll(getScrollView);
  const { allowLeave, dialog } = useConfirmLeave(
    isDirty,
    "Your changes to this routine haven't been saved.",
  );

  // Exercises chosen in the picker arrive when this screen is shown again.
  useFocusEffect(
    useCallback(() => {
      const picked = usePickedExercises.getState().takePicked();
      if (picked) append(picked.map(newRoutineExercise), { shouldFocus: false });
    }, [append]),
  );

  const submit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await onSubmit(values);
    } catch (error) {
      setSubmitError(toAppError(error));
      return;
    }
    allowLeave();
    router.back();
  });

  const restOptions = restChoices.map((seconds) => ({
    value: `${seconds}` as const,
    label: restChoiceLabel(seconds, defaultRestSeconds),
  }));
  const restValue =
    restSheetIndex === null ? null : getValues(`exercises.${restSheetIndex}.restSeconds`);
  const listError = errors.exercises?.root?.message ?? errors.exercises?.message;

  const header = (
    <>
      {isOffline ? <OfflineBanner message="You're offline. Connect to edit routines." /> : null}
      <View style={styles.details}>
        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <TextField
              label="Name"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.name?.message}
              maxLength={maxRoutineNameLength}
              autoCapitalize="sentences"
              placeholder="For example, Push day"
            />
          )}
        />
        <Controller
          control={control}
          name="notes"
          render={({ field }) => (
            <TextField
              label="Notes (optional)"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.notes?.message}
              maxLength={maxRoutineNotesLength}
              multiline
            />
          )}
        />
      </View>
      <Text variant="caption" tone="textMuted" accessibilityRole="header" style={styles.heading}>
        Exercises
      </Text>
    </>
  );

  const footer = (
    <View style={styles.actions}>
      {fields.length === 0 ? (
        <Text variant="secondary" tone="textMuted">
          Add the exercises you do in this session, in the order you do them.
        </Text>
      ) : null}
      <Button
        label="Add exercises"
        variant="secondary"
        disabled={fields.length >= maxRoutineExercises}
        onPress={() => router.push('/exercises/pick')}
      />
      {listError ? (
        <Text variant="secondary" tone="error" accessibilityLiveRegion="polite">
          {listError}
        </Text>
      ) : null}
      {submitError ? (
        <Text tone="error" accessibilityRole="alert" accessibilityLiveRegion="polite">
          {errorMessage(submitError)}
        </Text>
      ) : null}
      <Button label={submitLabel} onPress={submit} loading={isSubmitting} disabled={isOffline} />
    </View>
  );

  return (
    // The bottom edge keeps the list above Android's navigation bar, so
    // scrolled content never shows behind its buttons.
    <Screen padded={false} edges={['bottom']}>
      <KeyboardScrollContext.Provider value={inputEvents}>
        <ReorderableList
          ref={listRef}
          data={fields}
          keyExtractor={(item) => item.id}
          onReorder={({ from, to }) => move(from, to)}
          // A dragged exercise stays solid; only its slight lift shows it moving.
          cellAnimations={{ opacity: 1 }}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={header}
          ListFooterComponent={
            <>
              {footer}
              {keyboardHeight > 0 ? <View style={{ height: keyboardHeight }} /> : null}
            </>
          }
          renderItem={({ item, index }) => (
            <RoutineExerciseEditor
              control={control}
              index={index}
              count={fields.length}
              exerciseName={item.exerciseName}
              exerciseType={item.exerciseType}
              errors={errors.exercises?.[index]}
              defaultRestSeconds={defaultRestSeconds}
              weightUnit={weightUnit}
              onRemove={() => remove(index)}
              onMove={move}
              onChooseRest={() => setRestSheetIndex(index)}
            />
          )}
        />
      </KeyboardScrollContext.Provider>
      <SelectSheet<RestChoice>
        visible={restSheetIndex !== null}
        onClose={() => setRestSheetIndex(null)}
        title="Rest after each set"
        options={restOptions}
        selected={restValue === null ? null : `${restValue}`}
        clearLabel={restChoiceLabel(null, defaultRestSeconds)}
        onSelect={(choice) => {
          if (restSheetIndex === null) return;
          setValue(
            `exercises.${restSheetIndex}.restSeconds`,
            choice === null || choice === 'default' ? null : Number(choice),
            { shouldDirty: true },
          );
        }}
      />
      {dialog}
    </Screen>
  );
}

const styles = StyleSheet.create({
  details: {
    paddingHorizontal: screenPadding,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  heading: {
    paddingHorizontal: screenPadding,
    paddingTop: spacing.xl,
  },
  actions: {
    padding: screenPadding,
    paddingTop: spacing.xl,
    gap: spacing.md,
  },
});
