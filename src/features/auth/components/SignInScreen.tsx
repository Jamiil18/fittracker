import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import type { TextInput } from 'react-native';

import { Button } from '@/components/ui/Button';
import { EmailField } from '@/components/ui/EmailField';
import { PasswordField } from '@/components/ui/PasswordField';
import { toAppError, type AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';

import { resendSignUpCode, signIn } from '../api/auth';
import { signInSchema } from '../schemas/authSchemas';
import { AuthFormLayout } from './AuthFormLayout';

export function SignInScreen() {
  const router = useRouter();
  const passwordRef = useRef<TextInput>(null);
  const [submitError, setSubmitError] = useState<AppError | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  // The message from a failed attempt goes as soon as either field is edited,
  // so a second failed attempt visibly brings it back.
  function editField(onChange: (text: string) => void, text: string) {
    setSubmitError(null);
    onChange(text);
  }

  const submit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await signIn(values);
    } catch (error) {
      const appError = toAppError(error);
      if (appError.code !== 'email_not_confirmed') {
        setSubmitError(appError);
        return;
      }
      // Their first code may have expired, so send a fresh one and take them
      // to the code screen. If sending fails, that screen can send another.
      await resendSignUpCode(values.email).catch((resendError: unknown) =>
        logger.error('resend code after sign-in', resendError),
      );
      router.push({ pathname: '/verify-email', params: { email: values.email } });
    }
  });

  return (
    <AuthFormLayout
      title="FitTracker"
      submitError={submitError}
      fields={
        <>
          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <EmailField
                label="Email"
                value={field.value}
                onChangeText={(text) => editField(field.onChange, text)}
                onBlur={field.onBlur}
                error={errors.email?.message}
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
                label="Password"
                value={field.value}
                onChangeText={(text) => editField(field.onChange, text)}
                onBlur={field.onBlur}
                error={errors.password?.message}
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={submit}
              />
            )}
          />
        </>
      }
      actions={
        <>
          <Button label="Sign in" onPress={submit} loading={isSubmitting} />
          <Button
            label="Forgot password?"
            variant="plain"
            onPress={() => router.push('/forgot-password')}
          />
          <Button
            label="Create account"
            variant="secondary"
            onPress={() => router.push('/sign-up')}
          />
        </>
      }
    />
  );
}
