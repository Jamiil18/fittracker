import { StyleSheet, View } from 'react-native';

import { ListSection } from '@/components/ui/ListSection';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Text } from '@/components/ui/Text';
import { screenPadding, spacing } from '@/theme/layout';
import { useThemePreference } from '@/theme/ThemePreferenceProvider';

const themeOptions = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const;

export function ThemeSection() {
  const { preference, setPreference } = useThemePreference();

  return (
    <ListSection title="Appearance" footer="System follows your phone's setting.">
      <View style={styles.row}>
        <Text>Theme</Text>
        <SegmentedControl
          options={themeOptions}
          value={preference}
          onChange={setPreference}
          accessibilityLabel="Theme"
        />
      </View>
    </ListSection>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
    paddingHorizontal: screenPadding,
    paddingVertical: spacing.md,
  },
});
