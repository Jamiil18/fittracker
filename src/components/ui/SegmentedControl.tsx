import { Pressable, StyleSheet, View } from 'react-native';

import { radius, spacing } from '@/theme/layout';
import { useTheme } from '@/theme/useTheme';

import { Text } from './Text';

type SegmentedOption<Value extends string> = {
  value: Value;
  label: string;
};

type SegmentedControlProps<Value extends string> = {
  options: readonly SegmentedOption<Value>[];
  value: Value;
  onChange: (value: Value) => void;
  accessibilityLabel: string;
  disabled?: boolean;
};

// Segments are 40 tall to keep the control compact; the hit slop brings each
// touch target to 48.
const segmentHitSlop = { top: 4, bottom: 4 };

export function SegmentedControl<Value extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  disabled = false,
}: SegmentedControlProps<Value>) {
  const { colors } = useTheme();
  // Disabled uses muted theme colours rather than lower opacity, so the
  // control never shows what is behind it.
  const selectedBackground = disabled ? colors.separator : colors.accent;

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={[styles.container, { borderColor: disabled ? colors.separator : colors.border }]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            disabled={disabled}
            hitSlop={segmentHitSlop}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ checked: selected, disabled }}
            style={[styles.segment, selected && { backgroundColor: selectedBackground }]}
          >
            <Text
              variant="secondary"
              tone={disabled ? 'textMuted' : selected ? 'onAccent' : 'text'}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
});
