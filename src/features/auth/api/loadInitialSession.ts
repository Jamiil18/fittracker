import { isAuthRetryableFetchError, type User } from '@supabase/supabase-js';
import { z } from 'zod';

import { logger } from '@/lib/logger';
import { sessionStorage, sessionStorageKey, supabase } from '@/lib/supabase';

export type SignedInUser = {
  id: string;
  email: string;
};

export function toSignedInUser(user: User): SignedInUser {
  return { id: user.id, email: user.email ?? '' };
}

const storedSessionSchema = z.object({
  refresh_token: z.string().min(1),
  user: z.object({ id: z.uuid(), email: z.string().optional() }),
});

// Decides who is signed in when the app starts.
//
// getSession() reports no session when the access token has expired and it
// can't reach Supabase to refresh it. That would sign people out every time
// they opened the app offline, for example at a gym with no signal. Supabase
// keeps the session in storage in that case, so when the only problem is the
// connection, the stored user counts as signed in; the client refreshes the
// token once the connection returns, or signs the user out if the server
// rejects it.
export async function loadInitialSession(): Promise<SignedInUser | null> {
  const { data, error } = await supabase.auth.getSession();
  if (data.session) return toSignedInUser(data.session.user);
  if (!error || !isAuthRetryableFetchError(error)) return null;

  try {
    const stored = await sessionStorage.getItem(sessionStorageKey);
    if (!stored) return null;
    const parsed = storedSessionSchema.safeParse(JSON.parse(stored));
    if (!parsed.success) return null;
    return { id: parsed.data.user.id, email: parsed.data.user.email ?? '' };
  } catch (storageError) {
    logger.error('read stored session', storageError);
    return null;
  }
}
