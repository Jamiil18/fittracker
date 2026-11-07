import { StyleSheet, View } from 'react-native';

import { NumberField } from '@/components/ui/NumberField';
import { Text } from '@/components/ui/Text';
import type { DistanceUnit } from '@/lib/units';
import { spacing } from '@/theme/layout';

import type { HeightInput } from '../schemas/profileDetailsSchema';

type HeightFieldProps = {
  distanceUnit: DistanceUnit;
  value: HeightInput;
  onChange: (value: HeightInput) => void;
  onBlur: () => void;
  error: string | undefined;
};

// Height in centimetres, or in feet and inches when distances are in miles.
// Optional in every form that asks for it.
export function HeightField({ distanceUnit, value, onChange, onBlur, error }: HeightFieldProps) {
  if (distanceUnit === 'km') {
    return (
      <NumberField
        label="Height (optional)"
        unit="cm"
        value={value.cm}
        onChangeText={(cm) => onChange({ ...value, cm })}
        onBlur={onBlur}
        error={error}
        maxLength={5}
      />
    );
  }

  return (
    <View style={styles.imperial}>
      <Text variant="caption" tone="textMuted">
        Height (optional)
      </Text>
      <View style={styles.fields}>
        <View style={styles.field}>
          <NumberField
            label="Feet"
            accessibilityLabel="Height, feet"
            unit="ft"
            wholeNumber
            value={value.feet}
            onChangeText={(feet) => onChange({ ...value, feet })}
            onBlur={onBlur}
            maxLength={2}
          />
        </View>
        <View style={styles.field}>
          <NumberField
            label="Inches"
            accessibilityLabel="Height, inches"
            unit="in"
            wholeNumber
            value={value.inches}
            onChangeText={(inches) => onChange({ ...value, inches })}
            onBlur={onBlur}
            maxLength={2}
          />
        </View>
      </View>
      {error ? (
        <Text variant="secondary" tone="error">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  imperial: { gap: spacing.xs },
  fields: { flexDirection: 'row', gap: spacing.sm },
  field: { flex: 1 },
});
