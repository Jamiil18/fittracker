import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { screenPadding, spacing } from '@/theme/layout';

import { useActiveWorkout } from '../activeWorkoutStore';
import type { WorkoutSession } from '../schemas/sessionSchema';
import { changeWorkoutNotes, renameWorkout } from '../utils/session';

type WorkoutFooterProps = {
  session: WorkoutSession;
  onAddExercise: () => void;
  onDiscard: () => void;
};

// Below the exercises: adding one, the workout's name and note, and Discard.
export function WorkoutFooter({ session, onAddExercise, onDiscard }: WorkoutFooterProps) {
  const update = useActiveWorkout((state) => state.update);

  return (
    <View style={styles.footer}>
      <Button label="Add exercise" variant="secondary" onPress={onAddExercise} />
      <TextField
        label="Workout name"
        value={session.name}
        onChangeText={(text) => update((current) => renameWorkout(current, text))}
        maxLength={60}
      />
      <TextField
        label="Workout note (optional)"
        value={session.notes}
        onChangeText={(text) => update((current) => changeWorkoutNotes(current, text))}
        maxLength={1000}
        multiline
      />
      <Button label="Discard workout" variant="destructive" onPress={onDiscard} />
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    padding: screenPadding,
    paddingTop: spacing.xl,
    gap: spacing.lg,
  },
});
