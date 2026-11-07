import { Stack, useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Button } from '@/components/ui/Button';
import { ReorderableNameList } from '@/components/ui/ReorderableNameList';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { screenPadding, spacing } from '@/theme/layout';

import { useActiveWorkout } from '../activeWorkoutStore';
import { moveExercise } from '../utils/session';

// Moves apply straight away; the workout lives on the phone, so there's
// nothing to save.
export function ReorderWorkoutScreen() {
  const router = useRouter();
  const exercises = useActiveWorkout((state) => state.session?.exercises ?? []);
  const update = useActiveWorkout((state) => state.update);

  return (
    <Screen padded={false} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerRight: () => <Button label="Done" variant="plain" onPress={() => router.back()} />,
        }}
      />
      <Text variant="secondary" tone="textMuted" style={styles.hint}>
        Drag the handles to change the order of the exercises in this workout.
      </Text>
      <ReorderableNameList
        items={exercises.map((item) => ({ key: item.key, name: item.exercise.name }))}
        onMove={(from, to) => update((session) => moveExercise(session, from, to))}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: {
    paddingHorizontal: screenPadding,
    paddingVertical: spacing.md,
  },
});
