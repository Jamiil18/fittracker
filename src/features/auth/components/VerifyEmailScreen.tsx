import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { toAppError, type AppError } from '@/lib/errors';

import { resendSignUpCode, verifySignUpCode } from '../api/auth';
import { emailSchema, verifyCodeSchema } from '../schemas/authSchemas';
import { AuthFormLayout } from './AuthFormLayout';

export function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const parsedEmail = emailSchema.safeParse({ email: params.email });

  const [submitError, setSubmitError] = useState<AppError | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [resent, setResent] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(verifyCodeSchema),
    defaultValues: { code: '' },
  });

  if (!parsedEmail.success) {
    return (
      <Screen edges={['bottom']}>
        <ErrorState
          title="Start again"
          message="This screen didn't receive an email address. Sign in or create your account again."
          retryLabel="Back to sign in"
          onRetry={() => router.dismissTo('/sign-in')}
        />
      </Screen>
    );
  }
  const { email } = parsedEmail.data;

  // A correct code signs the user in, and navigation then moves them on.
  const submit = handleSubmit(async ({ code }) => {
    setSubmitError(null);
    try {
      await verifySignUpCode(email, code);
    } catch (error) {
      setSubmitError(toAppError(error));
    }
  });

  async function resend() {
    setSubmitError(null);
    setResent(false);
    setIsResending(true);
    try {
      await resendSignUpCode(email);
      setResent(true);
    } catch (error) {
      setSubmitError(toAppError(error));
    } finally {
      setIsResending(false);
    }
  }

  return (
    <AuthFormLayout
      intro={`Enter the 6-digit code we sent to ${email}. If it isn't in your inbox, check your spam folder.`}
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
                returnKeyType="go"
                onSubmitEditing={submit}
              />
            )}
          />
          {resent ? (
            <Text tone="textMuted" accessibilityLiveRegion="polite">
              New code sent. It replaces the previous one.
            </Text>
          ) : null}
          <View>
            <Text tone="textMuted">
              If you already have an account with this email, no code will arrive.
            </Text>
            <Button
              label="Sign in instead"
              variant="plain"
              onPress={() => router.dismissTo('/sign-in')}
            />
          </View>
        </>
      }
      actions={
        <>
          <Button label="Verify email" onPress={submit} loading={isSubmitting} />
          <Button
            label="Send a new code"
            variant="secondary"
            onPress={resend}
            loading={isResending}
          />
        </>
      }
    />
  );
}
