import { Controller, type Control, type FieldErrors } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { DragHandle } from '@/components/ui/DragHandle';
import { IconButton } from '@/components/ui/IconButton';
import { ListRow } from '@/components/ui/ListRow';
import { NumberField } from '@/components/ui/NumberField';
import { Text } from '@/components/ui/Text';
import type { ExerciseType } from '@/features/exercises/schemas/exerciseSchemas';
import { hasDuration } from '@/features/workout/utils/setValues';
import type { WeightUnit } from '@/lib/units';
import { screenPadding, spacing } from '@/theme/layout';
import { useTheme } from '@/theme/useTheme';

import {
  targetWeightLabel,
  type RoutineExerciseFormInput,
  type RoutineFormInput,
  type RoutineValues,
} from '../schemas/routineSchemas';
import { restChoiceLabel } from '../utils/routineLabels';

type CountFieldName = 'sets' | 'repsMin' | 'repsMax' | 'durationMinutes' | 'durationSeconds';

type RoutineExerciseEditorProps = {
  control: Control<RoutineFormInput, unknown, RoutineValues>;
  index: number;
  count: number;
  exerciseName: string;
  exerciseType: ExerciseType;
  errors: FieldErrors<RoutineExerciseFormInput> | undefined;
  defaultRestSeconds: number;
  weightUnit: WeightUnit;
  onRemove: () => void;
  onMove: (from: number, to: number) => void;
  onChooseRest: () => void;
};

// One exercise in the routine form: its targets, which follow the exercise
// type, and its rest time.
export function RoutineExerciseEditor({
  control,
  index,
  count,
  exerciseName,
  exerciseType,
  errors,
  defaultRestSeconds,
  weightUnit,
  onRemove,
  onMove,
  onChooseRest,
}: RoutineExerciseEditorProps) {
  const { colors } = useTheme();
  const timed = hasDuration(exerciseType);
  const weightLabel = targetWeightLabel(exerciseType);

  function countField(name: CountFieldName, label: string, placeholder?: string) {
    return (
      <View style={styles.field}>
        <Controller
          control={control}
          name={`exercises.${index}.${name}`}
          render={({ field }) => (
            <NumberField
              label={label}
              accessibilityLabel={`${label} for ${exerciseName}`}
              wholeNumber
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              placeholder={placeholder}
              maxLength={3}
            />
          )}
        />
      </View>
    );
  }

  // One message per exercise; the fields are too narrow to hold their own.
  const error =
    errors?.sets?.message ??
    errors?.repsMin?.message ??
    errors?.repsMax?.message ??
    errors?.durationMinutes?.message ??
    errors?.durationSeconds?.message;

  return (
    <View
      style={[styles.block, { backgroundColor: colors.surface, borderColor: colors.separator }]}
    >
      <View style={styles.header}>
        <Text variant="bodyStrong" style={styles.name}>
          {exerciseName}
        </Text>
        <IconButton icon="close" accessibilityLabel={`Remove ${exerciseName}`} onPress={onRemove} />
        <DragHandle itemLabel={exerciseName} index={index} count={count} onMove={onMove} />
      </View>
      <View style={styles.fields}>
        {countField('sets', 'Sets')}
        {timed ? (
          <>
            {countField('durationMinutes', 'Minutes', '0')}
            {countField('durationSeconds', 'Seconds', '00')}
          </>
        ) : (
          <>
            {countField('repsMin', 'Min reps')}
            {countField('repsMax', 'Max reps', 'Optional')}
          </>
        )}
      </View>
      {error ? (
        <Text
          variant="secondary"
          tone="error"
          style={styles.error}
          accessibilityLiveRegion="polite"
        >
          {error}
        </Text>
      ) : null}
      {weightLabel ? (
        <View style={styles.weight}>
          <Controller
            control={control}
            name={`exercises.${index}.weight`}
            render={({ field }) => (
              <NumberField
                label={`${weightLabel} (optional)`}
                accessibilityLabel={`${weightLabel} for ${exerciseName}`}
                unit={weightUnit}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors?.weight?.message}
                maxLength={7}
              />
            )}
          />
        </View>
      ) : null}
      <Controller
        control={control}
        name={`exercises.${index}.restSeconds`}
        render={({ field }) => (
          <ListRow
            title="Rest"
            value={restChoiceLabel(field.value, defaultRestSeconds)}
            showChevron
            onPress={onChooseRest}
            accessibilityHint={`Changes the rest time after each set of ${exerciseName}`}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    marginTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: screenPadding,
    paddingRight: spacing.xs,
    paddingTop: spacing.xs,
  },
  name: { flex: 1 },
  fields: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: screenPadding,
  },
  field: { flex: 1 },
  error: {
    paddingHorizontal: screenPadding,
    paddingTop: spacing.sm,
  },
  weight: {
    paddingHorizontal: screenPadding,
    paddingTop: spacing.md,
  },
});
