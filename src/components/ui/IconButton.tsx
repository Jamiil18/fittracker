import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { minTouchTarget } from '@/theme/layout';
import { useTheme } from '@/theme/useTheme';

type IconButtonProps = {
  icon: ComponentProps<typeof Ionicons>['name'];
  // Icon-only controls have no visible text, so the label is required.
  accessibilityLabel: string;
  onPress: () => void;
};

export function IconButton({ icon, accessibilityLabel, onPress }: IconButtonProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      android_ripple={{ color: colors.separator, borderless: true, radius: minTouchTarget / 2 }}
      style={styles.button}
    >
      <Ionicons name={icon} size={24} color={colors.accent} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: minTouchTarget,
    height: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
