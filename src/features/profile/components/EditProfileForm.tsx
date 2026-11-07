import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { DateButton } from '@/components/ui/DateButton';
import { ListRow } from '@/components/ui/ListRow';
import { ListSection } from '@/components/ui/ListSection';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { useConfirmLeave } from '@/components/ui/useConfirmLeave';
import { shortDate } from '@/features/history/utils/historyDates';
import type { Profile } from '@/features/settings/api/profile';
import { errorMessage, toAppError, type AppError } from '@/lib/errors';
import { useIsOffline } from '@/lib/useIsOffline';
import { screenPadding, spacing } from '@/theme/layout';

import { useUpdateProfileDetails } from '../api/profileDetails';
import {
  createProfileDetailsSchema,
  heightInputFrom,
  maxNameLength,
  type ProfileDetails,
  type ProfileDetailsInput,
} from '../schemas/profileDetailsSchema';
import { earliestDateOfBirth } from '../utils/profileDetails';
import { HeightField } from './HeightField';

type SexChoice = 'female' | 'male' | 'none';
const sexOptions = [
  { value: 'female' as const, label: 'Female' },
  { value: 'male' as const, label: 'Male' },
  { value: 'none' as const, label: 'Not set' },
];

function defaultsFrom(profile: Profile): ProfileDetailsInput {
  return {
    name: profile.displayName ?? '',
    dateOfBirth: profile.dateOfBirth,
    height: heightInputFrom(profile.heightCm),
    sex: profile.sex,
  };
}

// Name, date of birth, height and sex. All are optional.
type EditProfileFormProps = {
  profile: Profile;
};

export function EditProfileForm({ profile }: EditProfileFormProps) {
  const router = useRouter();
  const isOffline = useIsOffline();
  const updateDetails = useUpdateProfileDetails();
  const [submitError, setSubmitError] = useState<AppError | null>(null);
  const [today] = useState(() => new Date());
  const schema = useMemo(
    () => createProfileDetailsSchema(profile.distanceUnit, profile.heightCm),
    [profile.distanceUnit, profile.heightCm],
  );
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileDetailsInput, unknown, ProfileDetails>({
    resolver: zodResolver(schema),
    defaultValues: defaultsFrom(profile),
  });
  const { allowLeave, dialog } = useConfirmLeave(
    isDirty,
    "Your profile changes haven't been saved.",
  );

  const submit = handleSubmit(async (details) => {
    setSubmitError(null);
    try {
      await updateDetails.mutateAsync(details);
    } catch (error) {
      setSubmitError(toAppError(error));
      return;
    }
    allowLeave();
    router.back();
  });

  return (
    <Screen scroll padded={false} edges={['bottom']}>
      {isOffline ? <OfflineBanner message="You're offline. Connect to edit your profile." /> : null}
      <View style={styles.fields}>
        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <TextField
              label="Name (optional)"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.name?.message}
              maxLength={maxNameLength}
              autoCapitalize="words"
              autoComplete="name"
            />
          )}
        />
        <Controller
          control={control}
          name="height"
          render={({ field }) => (
            <HeightField
              distanceUnit={profile.distanceUnit}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={errors.height?.message}
            />
          )}
        />
      </View>
      <Controller
        control={control}
        name="dateOfBirth"
        render={({ field }) => (
          <ListSection footer="Your age is worked out from it.">
            <ListRow
              title="Date of birth"
              trailing={
                <DateButton
                  value={field.value}
                  onChange={field.onChange}
                  minimumDate={earliestDateOfBirth}
                  maximumDate={today}
                  label="Date of birth"
                  formatDate={(date) => shortDate(date.getTime())}
                />
              }
            />
            {field.value ? (
              <ListRow
                title="Clear date of birth"
                tone="accent"
                onPress={() => field.onChange(null)}
              />
            ) : null}
          </ListSection>
        )}
      />
      <View style={styles.fields}>
        <Text variant="caption" tone="textMuted">
          Sex (optional)
        </Text>
        <Controller
          control={control}
          name="sex"
          render={({ field }) => (
            <SegmentedControl<SexChoice>
              options={sexOptions}
              value={field.value ?? 'none'}
              onChange={(choice) => field.onChange(choice === 'none' ? null : choice)}
              accessibilityLabel="Sex"
            />
          )}
        />
      </View>
      <View style={styles.actions}>
        {submitError ? (
          <Text tone="error" accessibilityRole="alert">
            {errorMessage(submitError)}
          </Text>
        ) : null}
        <Button label="Save profile" onPress={submit} loading={isSubmitting} disabled={isOffline} />
      </View>
      {dialog}
    </Screen>
  );
}

const styles = StyleSheet.create({
  fields: {
    paddingHorizontal: screenPadding,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  actions: {
    padding: screenPadding,
    paddingTop: spacing.xl,
    gap: spacing.sm,
  },
});
