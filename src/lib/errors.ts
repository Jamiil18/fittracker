import {
  FunctionsFetchError,
  FunctionsHttpError,
  isAuthError,
  isAuthRetryableFetchError,
} from '@supabase/supabase-js';

import { logger } from './logger';

export type AppErrorCode =
  | 'offline'
  | 'invalid_credentials'
  | 'wrong_current_password'
  | 'email_not_confirmed'
  | 'email_taken'
  | 'weak_password'
  | 'same_password'
  | 'invalid_code'
  | 'too_many_emails'
  | 'too_many_requests'
  | 'not_found'
  | 'unknown';

export class AppError extends Error {
  readonly code: AppErrorCode;

  constructor(code: AppErrorCode) {
    super(code);
    this.name = 'AppError';
    this.code = code;
  }
}

const authCodes: Record<string, AppErrorCode> = {
  invalid_credentials: 'invalid_credentials',
  email_not_confirmed: 'email_not_confirmed',
  user_already_exists: 'email_taken',
  email_exists: 'email_taken',
  weak_password: 'weak_password',
  same_password: 'same_password',
  otp_expired: 'invalid_code',
  over_email_send_rate_limit: 'too_many_emails',
  over_request_rate_limit: 'too_many_requests',
};

// A request that never reached the server. Database queries report this as an
// error object whose message carries the fetch failure, rather than throwing it.
function isNetworkFailure(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('message' in error)) return false;
  const { message } = error;
  return typeof message === 'string' && /network request failed|failed to fetch/i.test(message);
}

// Database errors carry Postgres error codes. These are the ones the app
// handles specifically; see https://www.postgresql.org/docs/current/errcodes-appendix.html.
function databaseErrorCode(error: unknown): AppErrorCode | null {
  if (typeof error !== 'object' || error === null || !('code' in error)) return null;
  const { code } = error;
  // PostgREST's code when .single() finds no row, including rows hidden by RLS,
  // and no_data_found, raised by our database functions for the same case.
  if (code === 'PGRST116' || code === 'P0002') return 'not_found';
  return null;
}

// An Edge Function's error keeps the HTTP response it came from.
export function httpStatus(error: FunctionsHttpError): number | null {
  const response: unknown = error.context;
  return response instanceof Response ? response.status : null;
}

// Every failure from Supabase passes through here, so screens deal with a small
// set of known codes instead of library-specific error shapes.
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (isAuthRetryableFetchError(error) || isNetworkFailure(error)) return new AppError('offline');
  if (error instanceof FunctionsFetchError) return new AppError('offline');
  if (error instanceof FunctionsHttpError && httpStatus(error) === 429) {
    return new AppError('too_many_requests');
  }
  if (isAuthError(error) && error.code && error.code in authCodes) {
    return new AppError(authCodes[error.code] ?? 'unknown');
  }
  const databaseCode = databaseErrorCode(error);
  if (databaseCode) return new AppError(databaseCode);
  logger.error('unmapped error', error);
  return new AppError('unknown');
}

const messages: Record<AppErrorCode, string> = {
  offline: "You're offline. Connect to the internet and try again.",
  invalid_credentials: "That email and password don't match. Check them and try again.",
  wrong_current_password: "Your current password isn't right. Check it and try again.",
  email_not_confirmed: 'Verify your email before signing in.',
  email_taken: 'An account with this email already exists. Sign in instead.',
  weak_password: "Choose a longer password that's harder to guess.",
  same_password: 'Choose a different password from your current one.',
  invalid_code: 'That code is wrong or has expired. Check the latest email or send a new code.',
  too_many_emails: 'Too many emails sent. Wait a minute, then try again.',
  too_many_requests: 'Too many attempts. Wait a few minutes, then try again.',
  not_found: 'This no longer exists. Go back and try again.',
  unknown: 'Something went wrong. Try again in a moment.',
};

export function errorMessage(error: AppError): string {
  return messages[error.code];
}
