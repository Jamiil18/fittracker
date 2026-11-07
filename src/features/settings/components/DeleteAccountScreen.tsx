import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { PasswordField } from '@/components/ui/PasswordField';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useDialog } from '@/components/ui/useDialog';
import { deleteAccountSchema, type DeleteAccountValues } from '@/features/auth/schemas/authSchemas';
import { errorMessage, toAppError, type AppError } from '@/lib/errors';
import { useIsOffline } from '@/lib/useIsOffline';
import { screenPadding, spacing } from '@/theme/layout';

import { deleteAccount } from '../api/deleteAccount';

// Deleting is permanent, so it takes the password and a confirmation. Once the
// account is gone the app signs out and returns to the welcome screen.
export function DeleteAccountScreen() {
  const isOffline = useIsOffline();
  const [submitError, setSubmitError] = useState<AppError | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { dialog, showDialog } = useDialog();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<DeleteAccountValues>({
    resolver: zodResolver(deleteAccountSchema),
    defaultValues: { password: '' },
  });

  async function remove({ password }: DeleteAccountValues) {
    setIsDeleting(true);
    setSubmitError(null);
    try {
      await deleteAccount(password);
    } catch (error) {
      setSubmitError(toAppError(error));
      setIsDeleting(false);
    }
  }

  const confirm = handleSubmit((values) => {
    showDialog({
      title: 'Delete your account?',
      message: "Everything you've logged is deleted for good. This can't be undone.",
      actions: [
        { label: 'Cancel' },
        { label: 'Delete account', destructive: true, onPress: () => void remove(values) },
      ],
    });
  });

  return (
    <Screen scroll padded={false} edges={['bottom']}>
      {isOffline ? (
        <OfflineBanner message="You're offline. Connect to delete your account." />
      ) : null}
      <View style={styles.content}>
        <Text>
          This deletes your account and everything in it: workouts, routines, bodyweight and cardio
          sessions. It can&apos;t be undone.
        </Text>
        <Controller
          control={control}
          name="password"
          render={({ field }) => (
            <PasswordField
              label="Password"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.password?.message}
              autoComplete="current-password"
            />
          )}
        />
        {submitError ? (
          <Text tone="error" accessibilityRole="alert">
            {errorMessage(submitError)}
          </Text>
        ) : null}
        <Button
          label="Delete account"
          variant="destructive"
          onPress={confirm}
          loading={isDeleting}
          disabled={isOffline}
        />
      </View>
      {dialog}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: screenPadding,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
});
