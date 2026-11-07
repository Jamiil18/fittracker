import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { screenPadding, spacing } from '@/theme/layout';
import { useTheme } from '@/theme/useTheme';

import { KeyboardAwareScrollView } from './KeyboardAwareScrollView';

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  // Screens under a native header leave the top edge to the header.
  edges?: Edge[];
};

export function Screen({
  children,
  scroll = false,
  padded = true,
  edges = ['top', 'bottom'],
}: ScreenProps) {
  const { colors } = useTheme();
  const paddingStyle = padded ? styles.padded : undefined;

  return (
    <SafeAreaView edges={edges} style={[styles.fill, { backgroundColor: colors.background }]}>
      {scroll ? (
        <KeyboardAwareScrollView contentContainerStyle={[styles.scrollContent, paddingStyle]}>
          {children}
        </KeyboardAwareScrollView>
      ) : (
        <View style={[styles.fill, paddingStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  padded: {
    paddingHorizontal: screenPadding,
    paddingVertical: spacing.lg,
  },
});
