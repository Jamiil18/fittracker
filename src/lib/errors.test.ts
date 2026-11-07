import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js';

import { AppError, errorMessage, toAppError } from './errors';

// Unmapped errors are logged on purpose; keep that out of the test output.
jest.mock('./logger', () => ({ logger: { error: jest.fn() } }));

function authApiError(code: string, status = 400) {
  return new AuthApiError('message from Supabase', status, code);
}

describe('toAppError', () => {
  it.each([
    ['invalid_credentials', 'invalid_credentials'],
    ['email_not_confirmed', 'email_not_confirmed'],
    ['user_already_exists', 'email_taken'],
    ['email_exists', 'email_taken'],
    ['weak_password', 'weak_password'],
    ['same_password', 'same_password'],
    ['otp_expired', 'invalid_code'],
    ['over_email_send_rate_limit', 'too_many_emails'],
    ['over_request_rate_limit', 'too_many_requests'],
  ])('maps the Supabase code %s to %s', (supabaseCode, appCode) => {
    expect(toAppError(authApiError(supabaseCode)).code).toBe(appCode);
  });

  it('treats a failed request as offline', () => {
    expect(toAppError(new AuthRetryableFetchError('Failed to fetch', 0)).code).toBe('offline');
    expect(toAppError(new TypeError('Network request failed')).code).toBe('offline');
  });

  it('treats a database request that never reached the server as offline', () => {
    const postgrestError = {
      message: 'TypeError: Network request failed',
      details: '',
      hint: '',
      code: '',
    };
    expect(toAppError(postgrestError).code).toBe('offline');
  });

  it('maps the database errors the app handles', () => {
    expect(toAppError({ code: 'PGRST116', message: 'no rows' }).code).toBe('not_found');
    expect(toAppError({ code: 'P0002', message: 'Routine not found' }).code).toBe('not_found');
  });

  it('falls back to unknown for anything else', () => {
    expect(toAppError(authApiError('something_new')).code).toBe('unknown');
    expect(toAppError(new Error('boom')).code).toBe('unknown');
    expect(toAppError('not even an error').code).toBe('unknown');
  });

  it('passes an AppError through unchanged', () => {
    const original = new AppError('offline');
    expect(toAppError(original)).toBe(original);
  });
});

describe('errorMessage', () => {
  it('gives every code a plain sentence that ends with a full stop', () => {
    const codes = [
      'offline',
      'invalid_credentials',
      'email_not_confirmed',
      'email_taken',
      'weak_password',
      'same_password',
      'invalid_code',
      'too_many_emails',
      'too_many_requests',
      'not_found',
      'unknown',
    ] as const;
    for (const code of codes) {
      expect(errorMessage(new AppError(code))).toMatch(/^[A-Z].*\.$/);
    }
  });
});
