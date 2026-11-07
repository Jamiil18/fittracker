import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, type AccessibilityActionInfo } from 'react-native';
import { useReorderableDrag } from 'react-native-reorderable-list';

import { minTouchTarget } from '@/theme/layout';
import { useTheme } from '@/theme/useTheme';

type DragHandleProps = {
  // What is being moved, read out as "Reorder Bench press".
  itemLabel: string;
  index: number;
  count: number;
  onMove: (from: number, to: number) => void;
};

// The grip on a row of a ReorderableList: pressing it starts the drag at once,
// so the rest of the row still scrolls normally. Dragging can't be done with
// a screen reader, so it also offers Move up and Move down actions.
export function DragHandle({ itemLabel, index, count, onMove }: DragHandleProps) {
  const { colors } = useTheme();
  const drag = useReorderableDrag();

  const actions: AccessibilityActionInfo[] = [];
  if (index > 0) actions.push({ name: 'moveUp', label: 'Move up' });
  if (index < count - 1) actions.push({ name: 'moveDown', label: 'Move down' });

  return (
    <Pressable
      onPressIn={drag}
      accessibilityRole="button"
      accessibilityLabel={`Reorder ${itemLabel}`}
      accessibilityHint="Drag to move. With a screen reader, use the Move up and Move down actions."
      accessibilityActions={actions}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'moveUp') onMove(index, index - 1);
        if (event.nativeEvent.actionName === 'moveDown') onMove(index, index + 1);
      }}
      style={styles.handle}
    >
      <Ionicons name="reorder-three" size={24} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  handle: {
    width: minTouchTarget,
    height: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
