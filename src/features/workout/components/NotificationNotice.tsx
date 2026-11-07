import { useCallback, useEffect, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useDialog } from '@/components/ui/useDialog';
import { logger } from '@/lib/logger';
import { useOnAppForeground } from '@/lib/useOnAppForeground';
import { screenPadding, spacing } from '@/theme/layout';
import { useTheme } from '@/theme/useTheme';

import { useActiveWorkout } from '../activeWorkoutStore';
import {
  notificationPermission,
  requestNotificationPermission,
  type NotificationPermission,
} from '../timerNotifications';

// Asks for notification permission the first time a workout is open, after
// explaining why, and only if the phone still allows asking (Android 13 and
// later; on Android 12 notifications are allowed without asking). If they are
// off, a short note says what that means and links to the phone's settings.
// The workout works the same either way.
export function NotificationNotice() {
  const { colors } = useTheme();
  const { dialog, showDialog } = useDialog();
  const [permission, setPermission] = useState<NotificationPermission>('granted');

  useEffect(() => {
    let active = true;
    void notificationPermission().then((current) => {
      if (!active) return;
      setPermission(current);
      const store = useActiveWorkout.getState();
      if (current !== 'ask' || store.notificationPromptSeen) return;
      store.markNotificationPromptSeen();
      showDialog({
        title: 'Know when rest is over',
        message:
          'FitTracker can notify you when your rest or a timed set ends while the app is in the background. Your phone will ask you to allow notifications.',
        actions: [
          { label: 'Not now' },
          {
            label: 'Continue',
            onPress: () => void requestNotificationPermission().then(setPermission),
          },
        ],
      });
    });
    return () => {
      active = false;
    };
  }, [showDialog]);

  // Notifications are turned back on in the phone's settings, outside the app,
  // so the permission is read again each time the user comes back.
  useOnAppForeground(
    useCallback(() => {
      void notificationPermission().then(setPermission);
    }, []),
  );

  if (permission === 'granted') return dialog;

  return (
    <>
      <View
        style={[styles.notice, { backgroundColor: colors.surface, borderColor: colors.separator }]}
      >
        <Text variant="secondary" tone="textMuted">
          Notifications are off, so rest timers only alert you while FitTracker is open.
        </Text>
        <View style={styles.action}>
          <Button
            label="Open settings"
            variant="plain"
            onPress={() =>
              Linking.openSettings().catch((error: unknown) => logger.error('open settings', error))
            }
          />
        </View>
      </View>
      {dialog}
    </>
  );
}

const styles = StyleSheet.create({
  notice: {
    paddingHorizontal: screenPadding,
    paddingTop: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  action: { alignItems: 'flex-start', marginLeft: -spacing.lg },
});
