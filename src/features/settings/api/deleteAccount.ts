import { FunctionsHttpError } from '@supabase/supabase-js';

import { AppError, httpStatus, toAppError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

// The delete-account Edge Function (supabase/functions/delete-account) checks
// the password and removes the account and its rows on the server,
// because only the server holds the key that can delete a user.
export async function deleteAccount(password: string): Promise<void> {
  const { error } = await supabase.functions.invoke('delete-account', { body: { password } });
  if (error) {
    throw error instanceof FunctionsHttpError && httpStatus(error) === 403
      ? new AppError('wrong_current_password')
      : toAppError(error);
  }
  // The account no longer exists, so there is no server session to end. This
  // clears it from the phone, and SessionProvider then clears the rest.
  const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
  if (signOutError) throw toAppError(signOutError);
}
