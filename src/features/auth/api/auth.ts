import { isAuthRetryableFetchError } from '@supabase/supabase-js';

import { toAppError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

import type { SignInValues, SignUpValues } from '../schemas/authSchemas';

export async function signIn({ email, password }: SignInValues): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw toAppError(error);
}

// When the email already belongs to a confirmed account, Supabase reports
// success without sending anything, so the app can't be used to find out who
// has an account. The verification screen tells people to sign in instead.
export async function signUp({ email, password }: SignUpValues): Promise<void> {
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) throw toAppError(error);
}

export async function verifySignUpCode(email: string, code: string): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
  if (error) throw toAppError(error);
}

export async function resendSignUpCode(email: string): Promise<void> {
  const { error } = await supabase.auth.resend({ type: 'signup', email });
  if (error) throw toAppError(error);
}

export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw toAppError(error);
}

// A correct recovery code signs the user in, which is what allows the
// password to be changed straight afterwards.
export async function verifyPasswordResetCode(email: string, code: string): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'recovery' });
  if (error) throw toAppError(error);
}

export async function updatePassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw toAppError(error);
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (!error) return;
  // Offline, the server can't be told to revoke the session. Sign out on this
  // phone anyway; the refresh token then expires unused.
  if (isAuthRetryableFetchError(error)) {
    const { error: localError } = await supabase.auth.signOut({ scope: 'local' });
    if (localError) throw toAppError(localError);
    return;
  }
  throw toAppError(error);
}
