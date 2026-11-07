import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { errorMessage, type AppError } from '@/lib/errors';
import { useIsOffline } from '@/lib/useIsOffline';
import { screenPadding, spacing } from '@/theme/layout';

type AuthFormLayoutProps = {
  // For a screen without a header bar: the title takes the header's place,
  // and the layout keeps clear of the status bar itself.
  title?: string;
  intro?: string;
  fields: ReactNode;
  submitError: AppError | null;
  actions: ReactNode;
};

// Shared frame for the sign-in, sign-up, verification and reset screens: an
// offline notice, an optional title and introduction, the fields, the error
// from the last submit just above the buttons, then the buttons.
export function AuthFormLayout({
  title,
  intro,
  fields,
  submitError,
  actions,
}: AuthFormLayoutProps) {
  const isOffline = useIsOffline();

  return (
    <Screen scroll padded={false} edges={title ? ['top', 'bottom'] : ['bottom']}>
      {isOffline ? (
        <OfflineBanner message="You're offline. Connect to the internet to continue." />
      ) : null}
      <View style={styles.content}>
        {title ? (
          <Text variant="title" accessibilityRole="header">
            {title}
          </Text>
        ) : null}
        {intro ? <Text tone="textMuted">{intro}</Text> : null}
        {fields}
        {submitError ? (
          <Text tone="error" accessibilityRole="alert" accessibilityLiveRegion="polite">
            {errorMessage(submitError)}
          </Text>
        ) : null}
        <View style={styles.actions}>{actions}</View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: screenPadding,
    gap: spacing.lg,
  },
  actions: { gap: spacing.sm },
});
