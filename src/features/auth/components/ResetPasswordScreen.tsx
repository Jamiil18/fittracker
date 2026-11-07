import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, type TextInput } from 'react-native';

import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { PasswordField } from '@/components/ui/PasswordField';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { toAppError, type AppError } from '@/lib/errors';

import { updatePassword, verifyPasswordResetCode } from '../api/auth';
import { emailSchema, resetPasswordSchema } from '../schemas/authSchemas';
import { AuthFormLayout } from './AuthFormLayout';
import { useSession } from './SessionProvider';

export function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const parsedEmail = emailSchema.safeParse({ email: params.email });
  const { setResettingPassword } = useSession();

  const passwordRef = useRef<TextInput>(null);
  // A code works once. If the code is accepted but the new password is
  // rejected (for example, it's the same as the old one), the next attempt
  // only retries the password.
  const [codeAccepted, setCodeAccepted] = useState(false);
  const [submitError, setSubmitError] = useState<AppError | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { code: '', password: '' },
  });

  // Leaving this screen part-way ends the reset. Someone who entered a
  // correct code has proved they own the email, so they stay signed in.
  useEffect(() => () => setResettingPassword(false), [setResettingPassword]);

  if (!parsedEmail.success) {
    return (
      <Screen edges={['bottom']}>
        <ErrorState
          title="Start again"
          message="This screen didn't receive an email address. Ask for a new code to reset your password."
          retryLabel="Back to sign in"
          onRetry={() => router.dismissTo('/sign-in')}
        />
      </Screen>
    );
  }
  const { email } = parsedEmail.data;

  const submit = handleSubmit(async ({ code, password }) => {
    setSubmitError(null);
    setResettingPassword(true);
    // State only updates on the next render, so this attempt tracks the code
    // in a local variable as well.
    let signedInByCode = codeAccepted;
    try {
      if (!signedInByCode) {
        await verifyPasswordResetCode(email, code);
        signedInByCode = true;
        setCodeAccepted(true);
      }
      await updatePassword(password);
      Alert.alert('Password changed', "You're signed in with your new password.");
      setResettingPassword(false);
    } catch (error) {
      // Until a code is accepted there is no session to hold back.
      if (!signedInByCode) setResettingPassword(false);
      setSubmitError(toAppError(error));
    }
  });

  return (
    <AuthFormLayout
      intro={`Enter the 6-digit code we sent to ${email}, then choose a new password. If it isn't in your inbox, check your spam folder.`}
      submitError={submitError}
      fields={
        <>
          <Controller
            control={control}
            name="code"
            render={({ field }) => (
              <TextField
                label="Code"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.code?.message}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                maxLength={6}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <PasswordField
                ref={passwordRef}
                label="New password (at least 8 characters)"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.password?.message}
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="go"
                onSubmitEditing={submit}
              />
            )}
          />
        </>
      }
      actions={<Button label="Change password" onPress={submit} loading={isSubmitting} />}
    />
  );
}
