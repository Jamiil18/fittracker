import { StyleSheet, View } from 'react-native';
import ReorderableList from 'react-native-reorderable-list';

import { minTouchTarget, screenPadding, spacing } from '@/theme/layout';
import { useTheme } from '@/theme/useTheme';

import { DragHandle } from './DragHandle';
import { Text } from './Text';

type ReorderableNameListProps = {
  items: { key: string; name: string }[];
  onMove: (from: number, to: number) => void;
};

// Rows that show only a name and a drag handle, so even long items are easy
// to move. Used to reorder routines and the exercises in a workout.
export function ReorderableNameList({ items, onMove }: ReorderableNameListProps) {
  const { colors } = useTheme();
  return (
    <ReorderableList
      data={items}
      keyExtractor={(item) => item.key}
      onReorder={({ from, to }) => onMove(from, to)}
      cellAnimations={{ opacity: 1 }}
      renderItem={({ item, index }) => (
        <View
          style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.separator }]}
        >
          <Text style={styles.name}>{item.name}</Text>
          <DragHandle itemLabel={item.name} index={index} count={items.length} onMove={onMove} />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: screenPadding,
    paddingRight: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  name: { flex: 1 },
});
