import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { minTouchTarget, spacing } from '@/theme/layout';

import { Text } from './Text';
import { TextField, type TextFieldProps } from './TextField';

type PasswordFieldProps = Omit<
  TextFieldProps,
  'secureTextEntry' | 'accessory' | 'autoCapitalize' | 'autoCorrect' | 'spellCheck'
>;

// A password field with a button to show what was typed, which helps when
// typing on a phone keyboard. A word rather than an eye icon keeps the meaning
// clear and needs no icon set.
export function PasswordField(fieldProps: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      secureTextEntry={!visible}
      autoCapitalize="none"
      autoCorrect={false}
      spellCheck={false}
      accessory={
        <Pressable
          onPress={() => setVisible((current) => !current)}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          hitSlop={{ left: spacing.sm, right: spacing.sm }}
          style={styles.toggle}
        >
          <Text variant="secondary" tone="accent">
            {visible ? 'Hide' : 'Show'}
          </Text>
        </Pressable>
      }
      {...fieldProps}
    />
  );
}

const styles = StyleSheet.create({
  toggle: {
    minHeight: minTouchTarget,
    justifyContent: 'center',
  },
});
