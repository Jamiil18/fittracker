import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';

import { minTouchTarget, radius, spacing } from '@/theme/layout';
import { useTheme } from '@/theme/useTheme';

import { Text, type TextTone } from './Text';

type ButtonVariant = 'primary' | 'secondary' | 'plain' | 'destructive';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  accessibilityHint?: string;
};

// Every state is drawn with solid theme colours. Nothing changes the button's
// opacity, because a see-through button shows whatever is behind it and
// flickers as its state changes.
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  accessibilityHint,
}: ButtonProps) {
  const { colors } = useTheme();

  const appearance: Record<ButtonVariant, { background: string; border: string; tone: TextTone }> =
    {
      primary: { background: colors.accent, border: colors.accent, tone: 'onAccent' },
      secondary: { background: colors.surface, border: colors.border, tone: 'accent' },
      plain: { background: 'transparent', border: 'transparent', tone: 'accent' },
      destructive: { background: colors.surface, border: colors.border, tone: 'error' },
    };
  const disabledAppearance = {
    background: variant === 'plain' ? 'transparent' : colors.separator,
    border: variant === 'plain' ? 'transparent' : colors.separator,
    tone: 'textMuted' as const,
  };
  // While loading, the button keeps its normal colours and shows a spinner; it
  // only ignores presses.
  const { background, border, tone } = disabled ? disabledAppearance : appearance[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      android_ripple={{ color: colors.separator }}
      style={[styles.button, { backgroundColor: background, borderColor: border }]}
    >
      {({ pressed }) => (
        <>
          {/* Android shows the ripple; iOS has none, so a light layer of the
              text colour marks the press without making the button see-through. */}
          {pressed && Platform.OS === 'ios' ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                styles.pressedLayer,
                { backgroundColor: colors.text },
              ]}
            />
          ) : null}
          <View style={styles.content}>
            {loading ? <ActivityIndicator color={colors[tone]} /> : null}
            <Text variant="bodyStrong" tone={tone}>
              {label}
            </Text>
          </View>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: minTouchTarget,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
    borderWidth: 1,
    justifyContent: 'center',
    // Keeps the Android ripple and the iOS pressed layer inside the corners.
    overflow: 'hidden',
  },
  pressedLayer: { opacity: 0.12 },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
});
