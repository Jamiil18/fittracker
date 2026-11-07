import { StyleSheet, View } from 'react-native';

import { ListRow } from '@/components/ui/ListRow';
import { ListSection } from '@/components/ui/ListSection';
import { Text } from '@/components/ui/Text';
import { screenPadding, spacing } from '@/theme/layout';

import type { ExerciseDetail } from '../schemas/exerciseSchemas';
import { equipmentLabels, exerciseTypeLabels, muscleLabels } from '../utils/labels';

type ExerciseAboutSectionProps = {
  detail: ExerciseDetail;
};

// What the exercise is: the muscles, equipment, how it's logged, and the
// dataset's instructions.
export function ExerciseAboutSection({ detail }: ExerciseAboutSectionProps) {
  return (
    <>
      <ListSection title="About">
        <ListRow
          title="Main muscles"
          value={detail.primaryMuscles.map((muscle) => muscleLabels[muscle]).join(', ')}
        />
        {detail.secondaryMuscles.length > 0 ? (
          <ListRow
            title="Also works"
            value={detail.secondaryMuscles.map((muscle) => muscleLabels[muscle]).join(', ')}
          />
        ) : null}
        <ListRow title="Equipment" value={equipmentLabels[detail.equipment]} />
        <ListRow title="Logged as" value={exerciseTypeLabels[detail.exerciseType]} />
      </ListSection>

      {detail.instructions.length > 0 ? (
        <ListSection title="How to do it">
          <View style={styles.steps}>
            {detail.instructions.map((step, index) => (
              <View key={index} style={styles.step}>
                <Text tone="textMuted" style={styles.stepNumber}>
                  {index + 1}.
                </Text>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        </ListSection>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  steps: {
    paddingHorizontal: screenPadding,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  step: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stepNumber: { minWidth: 24 },
  stepText: { flex: 1 },
});
