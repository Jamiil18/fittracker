import { z } from 'zod';

const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Enter your email address.')
  .max(254, 'Use an email address of 254 characters or fewer.')
  .pipe(z.email({ message: 'Enter a valid email address.' }));

// Passwords are not trimmed: spaces are allowed and must match exactly. The
// minimum matches minimum_password_length in supabase/config.toml, and 72 is
// the most bcrypt (Supabase's password hash) uses.
const newPassword = z
  .string()
  .min(8, 'Use at least 8 characters.')
  .max(72, 'Use 72 characters or fewer.');

const code = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'Enter the 6-digit code from the email.');

export const signInSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password.'),
});

export const signUpSchema = z.object({ email, password: newPassword });

export const emailSchema = z.object({ email });

export const verifyCodeSchema = z.object({ code });

export const resetPasswordSchema = z.object({ code, password: newPassword });

export const deleteAccountSchema = z.object({
  password: z
    .string()
    .min(1, 'Enter your password.')
    .max(72, 'Passwords are at most 72 characters.'),
});

export type DeleteAccountValues = z.output<typeof deleteAccountSchema>;
export type SignInValues = z.output<typeof signInSchema>;
export type SignUpValues = z.output<typeof signUpSchema>;
