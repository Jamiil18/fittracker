import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { ListRow } from '@/components/ui/ListRow';
import { ListSection } from '@/components/ui/ListSection';
import { SelectSheet } from '@/components/ui/SelectSheet';
import { Text } from '@/components/ui/Text';
import { restChoiceLabel, restChoices } from '@/features/routines/utils/routineLabels';
import { errorMessage, toAppError } from '@/lib/errors';
import { screenPadding, spacing } from '@/theme/layout';

import type { Profile } from '../api/profile';
import { useUpdateSettings } from '../api/updateSettings';

type TrainingSectionProps = {
  profile: Profile;
  disabled: boolean;
};

// The default rest time. A change saves straight away and needs a connection.
export function TrainingSection({ profile, disabled }: TrainingSectionProps) {
  const update = useUpdateSettings(profile.id);
  const [choosingRest, setChoosingRest] = useState(false);

  return (
    <>
      <ListSection title="Training">
        <ListRow
          title="Default rest"
          value={restChoiceLabel(profile.defaultRestSeconds, profile.defaultRestSeconds)}
          showChevron
          onPress={disabled ? undefined : () => setChoosingRest(true)}
          accessibilityHint="Used for exercises without their own rest time"
        />
      </ListSection>
      {update.error ? (
        <Text tone="error" accessibilityRole="alert" style={styles.error}>
          {errorMessage(toAppError(update.error))}
        </Text>
      ) : null}
      <SelectSheet
        visible={choosingRest}
        onClose={() => setChoosingRest(false)}
        title="Default rest after each set"
        options={restChoices.map((seconds) => ({
          value: `${seconds}`,
          label: restChoiceLabel(seconds, seconds),
        }))}
        selected={`${profile.defaultRestSeconds}`}
        onSelect={(value) => value && update.mutate({ defaultRestSeconds: Number(value) })}
      />
    </>
  );
}

const styles = StyleSheet.create({
  error: {
    paddingHorizontal: screenPadding,
    paddingTop: spacing.sm,
  },
});
