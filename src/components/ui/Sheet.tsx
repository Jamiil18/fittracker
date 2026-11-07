import { BottomSheetModal, BottomSheetScrollView } from '@expo/ui/community/bottom-sheet';
import { useEffect, useRef, type ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { screenPadding, spacing } from '@/theme/layout';
import { useTheme } from '@/theme/useTheme';

import { Text } from './Text';

type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

// The sheet sizes itself to its content, so the content is capped: a long
// list then scrolls inside the sheet instead of growing up under the status
// bar. 70% leaves the screen behind visible above it.
const maxHeightFraction = 0.7;

// A native bottom sheet (Material on Android, SwiftUI on iOS) from Expo UI,
// controlled by `visible` so screens can treat it like any other state.
export function Sheet({ visible, onClose, title, children }: SheetProps) {
  const { colors } = useTheme();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const sheet = useRef<BottomSheetModal>(null);

  useEffect(() => {
    if (visible) sheet.current?.present();
    else sheet.current?.dismiss();
  }, [visible]);

  return (
    <BottomSheetModal
      ref={sheet}
      onDismiss={onClose}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: colors.surface }}
    >
      <View style={{ maxHeight: height * maxHeightFraction }}>
        <View style={styles.header}>
          <Text variant="bodyStrong" accessibilityRole="header">
            {title}
          </Text>
        </View>
        <BottomSheetScrollView
          style={styles.list}
          // The last row stays above Android's navigation bar.
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing.lg }}
        >
          {children}
        </BottomSheetScrollView>
      </View>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: screenPadding,
    paddingBottom: spacing.sm,
  },
  // Lets the list shrink to fit the cap rather than push it.
  list: { flexGrow: 0, flexShrink: 1 },
});
