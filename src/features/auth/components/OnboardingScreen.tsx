import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { NumberField } from '@/components/ui/NumberField';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { HeightField } from '@/features/profile/components/HeightField';
import { heightInputFrom, maxNameLength } from '@/features/profile/schemas/profileDetailsSchema';
import type { Profile } from '@/features/settings/api/profile';
import { distanceUnits, weightUnits } from '@/features/settings/unitOptions';
import { errorMessage, toAppError, type AppError } from '@/lib/errors';
import { useIsOffline } from '@/lib/useIsOffline';
import { screenPadding, spacing } from '@/theme/layout';

import { useCompleteOnboarding } from '../api/completeOnboarding';
import {
  onboardingSchema,
  type OnboardingInput,
  type OnboardingValues,
} from '../schemas/onboardingSchema';

type OnboardingScreenProps = {
  profile: Profile;
};

// The first screen after verifying an email. Only the units have to be
// chosen, and they start on kg and km; everything here can be changed later
// in Settings or Profile.
export function OnboardingScreen({ profile }: OnboardingScreenProps) {
  const isOffline = useIsOffline();
  const completeOnboarding = useCompleteOnboarding(profile.id);
  const [submitError, setSubmitError] = useState<AppError | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OnboardingInput, unknown, OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      name: profile.displayName ?? '',
      weightUnit: profile.weightUnit,
      distanceUnit: profile.distanceUnit,
      bodyweight: '',
      height: heightInputFrom(profile.heightCm),
    },
  });
  const name = useWatch({ control, name: 'name' }).trim();
  const weightUnit = useWatch({ control, name: 'weightUnit' });
  const distanceUnit = useWatch({ control, name: 'distanceUnit' });

  // A failed check must never leave the button doing nothing, even for an
  // answer whose own message is further up the screen. The form rechecks each
  // answer as it is edited, so this clears as soon as they are all valid.
  const hasInvalidAnswers = Object.keys(errors).length > 0;

  const submit = handleSubmit(
    async (values) => {
      setSubmitError(null);
      try {
        await completeOnboarding.mutateAsync(values);
      } catch (error) {
        setSubmitError(toAppError(error));
      }
    },
    () => setSubmitError(null),
  );

  return (
    <Screen scroll padded={false}>
      {isOffline ? (
        <OfflineBanner message="You're offline. Connect to the internet to get started." />
      ) : null}
      <View style={styles.content}>
        <View style={styles.intro}>
          <Text variant="title" accessibilityRole="header">
            {name === '' ? 'Welcome to FitTracker' : `Welcome to FitTracker, ${name}`}
          </Text>
          <Text tone="textMuted">Your workouts and cardio, all in one place.</Text>
        </View>

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

        <View style={styles.field}>
          <Text variant="caption" tone="textMuted">
            Weight unit
          </Text>
          <Controller
            control={control}
            name="weightUnit"
            render={({ field }) => (
              <SegmentedControl
                options={weightUnits}
                value={field.value}
                onChange={field.onChange}
                accessibilityLabel="Weight unit"
              />
            )}
          />
        </View>
        <View style={styles.field}>
          <Text variant="caption" tone="textMuted">
            Distance unit
          </Text>
          <Controller
            control={control}
            name="distanceUnit"
            render={({ field }) => (
              <SegmentedControl
                options={distanceUnits}
                value={field.value}
                onChange={field.onChange}
                accessibilityLabel="Distance unit"
              />
            )}
          />
        </View>

        <Controller
          control={control}
          name="bodyweight"
          render={({ field }) => (
            <NumberField
              label="Bodyweight (optional)"
              unit={weightUnit}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.bodyweight?.message}
              maxLength={6}
            />
          )}
        />
        <Controller
          control={control}
          name="height"
          render={({ field }) => (
            <HeightField
              distanceUnit={distanceUnit}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={errors.height?.message}
            />
          )}
        />

        {submitError || hasInvalidAnswers ? (
          <Text tone="error" accessibilityRole="alert" accessibilityLiveRegion="polite">
            {submitError
              ? errorMessage(submitError)
              : 'Some answers need changing. Check the messages above, then try again.'}
          </Text>
        ) : null}
        <Button label="Get started" onPress={submit} loading={isSubmitting} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: screenPadding,
    gap: spacing.lg,
  },
  intro: { gap: spacing.xs, paddingBottom: spacing.sm },
  field: { gap: spacing.xs },
});
