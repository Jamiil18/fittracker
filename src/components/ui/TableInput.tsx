import { useState } from 'react';
import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { minTouchTarget, radius, spacing } from '@/theme/layout';
import { textVariants } from '@/theme/typography';
import { useTheme } from '@/theme/useTheme';

import { useKeyboardScrollEvents } from './KeyboardScrollContext';

type TableInputProps = Omit<TextInputProps, 'style'> & {
  // Read out by screen readers, since the column heading isn't next to it.
  accessibilityLabel: string;
  width: number;
  // Cells have a fixed width, so the table limits how far their text grows.
  maxFontSizeMultiplier: number;
};

// A compact number field for a cell of the logging table. The placeholder is
// the hint (the previous value), shown in the muted colour.
export function TableInput({ width, onFocus, onBlur, ...inputProps }: TableInputProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const keyboardScroll = useKeyboardScrollEvents();
  return (
    <TextInput
      placeholderTextColor={colors.textMuted}
      selectTextOnFocus
      textAlign="center"
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
      style={[
        textVariants.body,
        styles.input,
        {
          width,
          color: colors.text,
          backgroundColor: colors.background,
          borderColor: focused ? colors.accent : colors.separator,
        },
      ]}
      {...inputProps}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: minTouchTarget - spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 0,
    borderWidth: 1,
    borderRadius: radius.sm,
    fontVariant: ['tabular-nums'],
  },
});
