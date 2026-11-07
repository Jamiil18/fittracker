import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactElement } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { ListRow } from '@/components/ui/ListRow';
import { screenPadding } from '@/theme/layout';
import { useTheme } from '@/theme/useTheme';

import type { ExerciseSummary } from '../schemas/exerciseSchemas';
import { exerciseSubtitle } from '../utils/labels';

type ExerciseListProps = {
  exercises: ExerciseSummary[];
  onPressExercise: (exercise: ExerciseSummary) => void;
  // Present when the list is used to choose exercises: rows then show a tick
  // instead of a chevron and are read out as checkboxes.
  selectedIds?: ReadonlySet<string>;
  emptyState: ReactElement;
};

// The virtualised list of exercises used by the library and the picker.
export function ExerciseList({
  exercises,
  onPressExercise,
  selectedIds,
  emptyState,
}: ExerciseListProps) {
  const { colors } = useTheme();

  return (
    <FlatList
      data={exercises}
      keyExtractor={(item) => item.id}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      initialNumToRender={15}
      // Only the rows are the surface colour, as in a grouped list, so a
      // short or empty list doesn't leave a second grey below it.
      ItemSeparatorComponent={() => (
        <View style={{ backgroundColor: colors.surface }}>
          <View style={[styles.separator, { backgroundColor: colors.separator }]} />
        </View>
      )}
      ListEmptyComponent={emptyState}
      renderItem={({ item }) => {
        const selected = selectedIds?.has(item.id) ?? false;
        return (
          <View style={{ backgroundColor: colors.surface }}>
            <ListRow
              title={item.name}
              subtitle={exerciseSubtitle(item.primaryMuscles, item.equipment)}
              showChevron={selectedIds === undefined}
              onPress={() => onPressExercise(item)}
              accessibilityRole={selectedIds ? 'checkbox' : 'button'}
              accessibilityState={selectedIds ? { checked: selected } : undefined}
              trailing={
                selectedIds ? (
                  <Ionicons
                    name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                    size={24}
                    color={selected ? colors.accent : colors.textMuted}
                  />
                ) : undefined
              }
            />
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: screenPadding,
  },
});
