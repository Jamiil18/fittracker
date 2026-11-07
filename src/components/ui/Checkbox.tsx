import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { minTouchTarget, radius } from '@/theme/layout';
import { useTheme } from '@/theme/useTheme';

type CheckboxProps = {
  checked: boolean;
  onPress: () => void;
  // There's no visible text, so the label is required.
  accessibilityLabel: string;
};

// A square tick box with a full-size touch target. Ticked uses the success
// colour, as a completed set does in the logging table.
export function Checkbox({ checked, onPress, accessibilityLabel }: CheckboxProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked }}
      style={styles.target}
    >
      <View
        style={[
          styles.box,
          checked
            ? { backgroundColor: colors.success, borderColor: colors.success }
            : { borderColor: colors.border },
        ]}
      >
        {checked ? <Ionicons name="checkmark" size={20} color={colors.onAccent} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  target: {
    width: minTouchTarget,
    height: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 28,
    height: 28,
    borderRadius: radius.xs,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
