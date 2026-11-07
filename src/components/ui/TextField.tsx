import { useState, type ReactNode, type Ref } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { minTouchTarget, radius, spacing } from '@/theme/layout';
import { textVariants } from '@/theme/typography';
import { useTheme } from '@/theme/useTheme';

import { useKeyboardScrollEvents } from './KeyboardScrollContext';
import { Text } from './Text';

export type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  error?: string;
  suffix?: string;
  // A control inside the field's border, after the text, such as a button.
  accessory?: ReactNode;
  ref?: Ref<TextInput>;
};

export function TextField({
  label,
  error,
  suffix,
  accessory,
  ref,
  onFocus,
  onBlur,
  ...inputProps
}: TextFieldProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const keyboardScroll = useKeyboardScrollEvents();

  const borderColor = error ? colors.error : focused ? colors.accent : colors.border;

  return (
    <View style={styles.container}>
      <Text variant="caption" tone="textMuted">
        {label}
      </Text>
      <View style={[styles.inputRow, { borderColor, backgroundColor: colors.surface }]}>
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          accessibilityHint={error}
          placeholderTextColor={colors.textMuted}
          style={[textVariants.body, styles.input, { color: colors.text }]}
          onFocus={(event) => {
            setFocused(true);
            keyboardScroll?.onInputFocus();
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            keyboardScroll?.onInputBlur();
            onBlur?.(event);
          }}
          {...inputProps}
        />
        {suffix ? <Text tone="textMuted">{suffix}</Text> : null}
        {accessory}
      </View>
      {error ? (
        <Text variant="secondary" tone="error" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  inputRow: {
    minHeight: minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderRadius: radius.sm,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
  },
});
