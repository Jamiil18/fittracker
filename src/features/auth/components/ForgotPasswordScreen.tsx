import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { Button } from '@/components/ui/Button';
import { EmailField } from '@/components/ui/EmailField';
import { toAppError, type AppError } from '@/lib/errors';

import { requestPasswordReset } from '../api/auth';
import { emailSchema } from '../schemas/authSchemas';
import { AuthFormLayout } from './AuthFormLayout';

export function ForgotPasswordScreen() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<AppError | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  });

  const submit = handleSubmit(async ({ email }) => {
    setSubmitError(null);
    try {
      await requestPasswordReset(email);
      router.push({ pathname: '/reset-password', params: { email } });
    } catch (error) {
      setSubmitError(toAppError(error));
    }
  });

  return (
    <AuthFormLayout
      intro="Enter the email address of your account. We'll send a 6-digit code to reset your password."
      submitError={submitError}
      fields={
        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <EmailField
              label="Email"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.email?.message}
              returnKeyType="go"
              onSubmitEditing={submit}
            />
          )}
        />
      }
      actions={<Button label="Send code" onPress={submit} loading={isSubmitting} />}
    />
  );
}
