import { Text as NativeText, StyleSheet, type TextProps as NativeTextProps } from 'react-native';

import type { ColorTokens } from '@/theme/colors';
import { textVariants, type TextVariant } from '@/theme/typography';
import { useTheme } from '@/theme/useTheme';

export type TextTone = keyof Pick<
  ColorTokens,
  'text' | 'textMuted' | 'accent' | 'onAccent' | 'success' | 'error'
>;

type TextProps = NativeTextProps & {
  variant?: TextVariant;
  tone?: TextTone;
};

export function Text({ variant = 'body', tone = 'text', style, ...rest }: TextProps) {
  const { colors } = useTheme();
  return (
    <NativeText
      style={[textVariants[variant], styles.digits, { color: colors[tone] }, style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  // Tabular numerals keep columns of weights and reps aligned. Applying them to
  // all text is harmless because the setting only changes digits.
  digits: { fontVariant: ['tabular-nums'] },
});
