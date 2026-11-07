import { StyleSheet, View } from 'react-native';

import { screenPadding, spacing } from '@/theme/layout';
import { useTheme } from '@/theme/useTheme';

import { Text } from './Text';

type OfflineBannerProps = {
  message: string;
};

// Neutral rather than error-coloured: being offline is a state, not a failure.
export function OfflineBanner({ message }: OfflineBannerProps) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.banner, { backgroundColor: colors.surface, borderColor: colors.separator }]}
    >
      <Text variant="secondary" tone="textMuted">
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingHorizontal: screenPadding,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
