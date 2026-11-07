// Deletes the signed-in user's account and everything they stored.
//
// It runs on Supabase's servers because deleting an auth user needs the secret
// key, which must never ship in the app. Every table references auth.users
// with "on delete cascade", so deleting the user removes all their rows.
import { createClient } from 'npm:@supabase/supabase-js@2';

// The platform provides the project's keys as JSON objects keyed by name.
function projectKey(variable: 'SUPABASE_PUBLISHABLE_KEYS' | 'SUPABASE_SECRET_KEYS'): string {
  const keys: Record<string, string> = JSON.parse(Deno.env.get(variable) ?? '{}');
  const key = keys['default'];
  if (!key) throw new Error(`${variable} has no default key`);
  return key;
}

function reply(status: number, body: Record<string, string | boolean>): Response {
  return Response.json(body, { status });
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return reply(405, { error: 'method_not_allowed' });

  const token = request.headers.get('Authorization')?.replace(/^Bearer /, '');
  if (!token) return reply(401, { error: 'not_signed_in' });

  let password: unknown;
  try {
    ({ password } = await request.json());
  } catch {
    return reply(400, { error: 'bad_request' });
  }
  if (typeof password !== 'string' || password.length === 0 || password.length > 72) {
    return reply(400, { error: 'bad_request' });
  }

  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const noSession = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient(url, projectKey('SUPABASE_SECRET_KEYS'), noSession);
  const publicClient = createClient(url, projectKey('SUPABASE_PUBLISHABLE_KEYS'), noSession);

  // Asks the auth server who the token belongs to, rather than trusting the
  // token's contents, so a revoked session or a deleted user is refused.
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  const user = userData.user;
  if (userError || !user?.email) return reply(401, { error: 'not_signed_in' });

  // A stolen access token alone is not enough to delete the account: the
  // password is checked here, on the server, not just in the app.
  const { error: passwordError } = await publicClient.auth.signInWithPassword({
    email: user.email,
    password,
  });
  if (passwordError) {
    if (passwordError.code === 'invalid_credentials') return reply(403, { error: 'wrong_password' });
    if (passwordError.status === 429) return reply(429, { error: 'too_many_requests' });
    console.error('password check failed', passwordError.code);
    return reply(500, { error: 'delete_failed' });
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error('deleting user failed', deleteError.code);
    return reply(500, { error: 'delete_failed' });
  }
  return reply(200, { deleted: true });
});
