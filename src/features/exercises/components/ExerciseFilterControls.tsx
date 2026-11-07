import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { SelectSheet } from '@/components/ui/SelectSheet';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { screenPadding, spacing } from '@/theme/layout';

import type { ExerciseFilters } from '../hooks/useExerciseFilters';
import { equipmentKinds, muscleGroups } from '../schemas/exerciseSchemas';
import { equipmentLabels, muscleLabels } from '../utils/labels';

const muscleOptions = muscleGroups.map((value) => ({ value, label: muscleLabels[value] }));
const equipmentOptions = equipmentKinds.map((value) => ({ value, label: equipmentLabels[value] }));

type ExerciseFilterControlsProps = {
  filters: ExerciseFilters;
};

// Search field, muscle and equipment filters, and the result count, above a
// list of exercises.
export function ExerciseFilterControls({ filters }: ExerciseFilterControlsProps) {
  const [openSheet, setOpenSheet] = useState<'muscle' | 'equipment' | null>(null);
  const { query, setQuery, muscle, setMuscle, equipment, setEquipment, results, total } = filters;

  return (
    <View style={styles.controls}>
      <TextField
        label="Search exercises"
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
      <View style={styles.filters}>
        <View style={styles.filter}>
          <Button
            label={muscle ? muscleLabels[muscle] : 'All muscles'}
            variant="secondary"
            onPress={() => setOpenSheet('muscle')}
            accessibilityHint="Filters by the main muscle worked"
          />
        </View>
        <View style={styles.filter}>
          <Button
            label={equipment ? equipmentLabels[equipment] : 'All equipment'}
            variant="secondary"
            onPress={() => setOpenSheet('equipment')}
            accessibilityHint="Filters by equipment"
          />
        </View>
      </View>
      <Text variant="caption" tone="textMuted" accessibilityLiveRegion="polite">
        {filters.isFiltering ? `${results.length} of ${total} exercises` : `${total} exercises`}
      </Text>

      <SelectSheet
        visible={openSheet === 'muscle'}
        onClose={() => setOpenSheet(null)}
        title="Main muscle"
        options={muscleOptions}
        selected={muscle}
        onSelect={setMuscle}
        clearLabel="All muscles"
      />
      <SelectSheet
        visible={openSheet === 'equipment'}
        onClose={() => setOpenSheet(null)}
        title="Equipment"
        options={equipmentOptions}
        selected={equipment}
        onSelect={setEquipment}
        clearLabel="All equipment"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  controls: {
    padding: screenPadding,
    gap: spacing.md,
  },
  filters: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filter: { flex: 1 },
});
