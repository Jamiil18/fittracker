import { z } from 'zod';

const envSchema = z.object({
  supabaseUrl: z.url({ message: 'EXPO_PUBLIC_SUPABASE_URL must be the project URL.' }),
  supabasePublishableKey: z.string().startsWith('sb_publishable_', {
    message:
      'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be the publishable key, never the secret key.',
  }),
});

// Expo only inlines EXPO_PUBLIC_ variables written out in full like this, so
// they can't be read through a loop or a dynamic key.
const parsed = envSchema.safeParse({
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabasePublishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});

if (!parsed.success) {
  // A developer setup mistake, not something a user can fix, so fail at startup
  // with a message that says which value is wrong.
  throw new Error(
    `Missing or invalid environment variables. Copy .env.example to .env and fill it in.\n${parsed.error.issues
      .map((issue) => issue.message)
      .join('\n')}`,
  );
}

export const env = parsed.data;
