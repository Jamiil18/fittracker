import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { minTouchTarget, radius, spacing } from '@/theme/layout';
import { useTheme } from '@/theme/useTheme';

import { Text } from './Text';

export type DialogAction = {
  label: string;
  onPress?: () => void;
  // Destructive actions are red; the rest use the accent colour.
  destructive?: boolean;
};

type DialogProps = {
  visible: boolean;
  title: string;
  message: string;
  // In reading order; the last one is the main action, as on Android.
  actions: DialogAction[];
  // Called when the dialog closes without an action: Android's back button or
  // a tap outside it.
  onDismiss: () => void;
};

// A confirmation dialog laid out like Android's own, drawn with the app's
// colours. React Native's Alert uses the system's colours instead, and can't
// show a destructive action in red on Android.
export function Dialog({ visible, title, message, actions, onDismiss }: DialogProps) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onDismiss}
    >
      <Pressable
        style={[styles.scrim, { backgroundColor: colors.scrim }]}
        onPress={onDismiss}
        importantForAccessibility="no"
      >
        {/* A plain Pressable here keeps taps on the dialog from reaching the scrim. */}
        <Pressable
          accessibilityViewIsModal
          style={[styles.dialog, { backgroundColor: colors.surface }]}
        >
          <Text variant="bodyStrong" accessibilityRole="header">
            {title}
          </Text>
          <Text tone="textMuted">{message}</Text>
          <View style={styles.actions}>
            {actions.map((action) => (
              <Pressable
                key={action.label}
                onPress={() => {
                  onDismiss();
                  action.onPress?.();
                }}
                accessibilityRole="button"
                android_ripple={{ color: colors.separator }}
                style={styles.action}
              >
                <Text variant="bodyStrong" tone={action.destructive ? 'error' : 'accent'}>
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  dialog: {
    borderRadius: radius.md,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: spacing.xs,
    marginRight: -spacing.md,
  },
  action: {
    minHeight: minTouchTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
});
