import { ListRow } from '@/components/ui/ListRow';
import { Sheet } from '@/components/ui/Sheet';
import { restChoiceLabel } from '@/features/routines/utils/routineLabels';

import type { SessionExercise } from '../schemas/sessionSchema';

type ExerciseMenuSheetProps = {
  exercise: SessionExercise | null;
  canReorder: boolean;
  onClose: () => void;
  onToggleNote: () => void;
  onChooseRest: () => void;
  onSwap: () => void;
  onReorder: () => void;
  onRemove: () => void;
};

// The options for one exercise in the workout. Each choice closes the sheet
// before acting, so a following sheet or screen isn't opened over it.
export function ExerciseMenuSheet({
  exercise,
  canReorder,
  onClose,
  onToggleNote,
  onChooseRest,
  onSwap,
  onReorder,
  onRemove,
}: ExerciseMenuSheetProps) {
  function choose(action: () => void) {
    return () => {
      onClose();
      action();
    };
  }

  return (
    <Sheet visible={exercise !== null} onClose={onClose} title={exercise?.exercise.name ?? ''}>
      <ListRow
        title={exercise?.notes === null ? 'Add note' : 'Remove note'}
        onPress={choose(onToggleNote)}
      />
      <ListRow
        title="Rest time"
        value={exercise ? restChoiceLabel(exercise.restSeconds, exercise.restSeconds) : undefined}
        showChevron
        onPress={choose(onChooseRest)}
      />
      <ListRow title="Swap exercise" showChevron onPress={choose(onSwap)} />
      {canReorder ? (
        <ListRow title="Reorder exercises" showChevron onPress={choose(onReorder)} />
      ) : null}
      <ListRow title="Remove exercise" tone="error" onPress={choose(onRemove)} />
    </Sheet>
  );
}
