import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import type { TextInput } from 'react-native';

import { Button } from '@/components/ui/Button';
import { EmailField } from '@/components/ui/EmailField';
import { PasswordField } from '@/components/ui/PasswordField';
import { toAppError, type AppError } from '@/lib/errors';

import { signUp } from '../api/auth';
import { signUpSchema } from '../schemas/authSchemas';
import { AuthFormLayout } from './AuthFormLayout';

export function SignUpScreen() {
  const router = useRouter();
  const passwordRef = useRef<TextInput>(null);
  const [submitError, setSubmitError] = useState<AppError | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: '', password: '' },
  });

  const submit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await signUp(values);
      router.push({ pathname: '/verify-email', params: { email: values.email } });
    } catch (error) {
      setSubmitError(toAppError(error));
    }
  });

  return (
    <AuthFormLayout
      intro="Your training is saved to your account, so it's there on any phone you sign in on."
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
                onChangeText={field.onChange}
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
                label="Password (at least 8 characters)"
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
      actions={<Button label="Create account" onPress={submit} loading={isSubmitting} />}
    />
  );
}
