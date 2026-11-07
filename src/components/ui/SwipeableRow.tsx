import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';

import { minTouchTarget, spacing } from '@/theme/layout';
import { useTheme } from '@/theme/useTheme';

import { Text } from './Text';

export type SwipeAction = {
  label: string;
  onPress: () => void;
  destructive?: boolean;
};

type SwipeableRowProps = {
  actions: SwipeAction[];
  enabled?: boolean;
  children: ReactNode;
};

// A list row that slides left to reveal text buttons, as in platform mail and
// settings lists. Swiping is invisible to screen readers, so the row inside
// must offer the same actions as accessibility actions.
export function SwipeableRow({ actions, enabled = true, children }: SwipeableRowProps) {
  const { colors } = useTheme();

  function renderActions(_progress: unknown, _translation: unknown, methods: SwipeableMethods) {
    return (
      <View style={styles.actions} importantForAccessibility="no-hide-descendants">
        {actions.map((action) => (
          <Pressable
            key={action.label}
            onPress={() => {
              methods.close();
              action.onPress();
            }}
            android_ripple={{ color: colors.separator }}
            style={[
              styles.action,
              { backgroundColor: action.destructive ? colors.error : colors.textMuted },
            ]}
          >
            <Text variant="secondary" tone="onAccent">
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>
    );
  }

  return (
    <ReanimatedSwipeable
      enabled={enabled}
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={renderActions}
      childrenContainerStyle={{ backgroundColor: colors.surface }}
    >
      {children}
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row' },
  action: {
    minWidth: minTouchTarget * 2,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
