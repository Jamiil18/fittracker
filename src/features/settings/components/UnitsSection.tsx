import { StyleSheet, View } from 'react-native';

import { ListRow } from '@/components/ui/ListRow';
import { ListSection } from '@/components/ui/ListSection';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Text } from '@/components/ui/Text';
import { errorMessage, toAppError } from '@/lib/errors';
import { screenPadding, spacing } from '@/theme/layout';

import type { Profile } from '../api/profile';
import { useUpdateSettings } from '../api/updateSettings';
import { distanceUnits, weightUnits } from '../unitOptions';

type UnitsSectionProps = {
  profile: Profile;
  disabled: boolean;
};

export function UnitsSection({ profile, disabled }: UnitsSectionProps) {
  const updateUnits = useUpdateSettings(profile.id);

  return (
    <>
      <ListSection title="Units">
        <ListRow
          title="Weight"
          trailing={
            <View style={styles.control}>
              <SegmentedControl
                options={weightUnits}
                value={profile.weightUnit}
                onChange={(weightUnit) => updateUnits.mutate({ weightUnit })}
                accessibilityLabel="Weight unit"
                disabled={disabled}
              />
            </View>
          }
        />
        <ListRow
          title="Distance"
          trailing={
            <View style={styles.control}>
              <SegmentedControl
                options={distanceUnits}
                value={profile.distanceUnit}
                onChange={(distanceUnit) => updateUnits.mutate({ distanceUnit })}
                accessibilityLabel="Distance unit"
                disabled={disabled}
              />
            </View>
          }
        />
      </ListSection>
      {updateUnits.error ? (
        <Text
          tone="error"
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={styles.error}
        >
          {`Your units weren't changed. ${errorMessage(toAppError(updateUnits.error))}`}
        </Text>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  control: { width: 128 },
  error: {
    paddingHorizontal: screenPadding,
    paddingTop: spacing.sm,
  },
});
