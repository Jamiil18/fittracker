import type { ReactNode } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { logger } from '@/lib/logger';
import { spacing } from '@/theme/layout';

import { Button } from './Button';
import { Text } from './Text';

export type PermissionState = { granted: boolean; canAskAgain: boolean } | null;

type PermissionGateProps = {
  // Null while the current state is being read.
  permission: PermissionState;
  title: string;
  // Why the feature needs it, shown before the system prompt.
  explanation: string;
  allowLabel: string;
  onRequest: () => void;
  children: ReactNode;
};

// Shows its children only once a permission is granted. Before asking, it
// explains why; if the user has refused and the phone won't ask again, it
// says how to turn it on in the phone's settings.
export function PermissionGate({
  permission,
  title,
  explanation,
  allowLabel,
  onRequest,
  children,
}: PermissionGateProps) {
  if (permission === null) return null;
  if (permission.granted) return <>{children}</>;

  return (
    <View style={styles.gate}>
      <Text variant="title" accessibilityRole="header">
        {title}
      </Text>
      <Text tone="textMuted">{explanation}</Text>
      {permission.canAskAgain ? (
        <Button label={allowLabel} onPress={onRequest} />
      ) : (
        <>
          <Text tone="textMuted">
            It&apos;s turned off for FitTracker. You can turn it on in your phone&apos;s settings.
          </Text>
          <Button
            label="Open settings"
            variant="secondary"
            onPress={() =>
              Linking.openSettings().catch((error: unknown) => logger.error('open settings', error))
            }
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  gate: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
});
