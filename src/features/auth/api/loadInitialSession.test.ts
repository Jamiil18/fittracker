import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js';

import { sessionStorage, supabase } from '@/lib/supabase';

import { loadInitialSession } from './loadInitialSession';

jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn() } }));
jest.mock('@/lib/supabase', () => ({
  sessionStorageKey: 'fittracker-session',
  sessionStorage: { getItem: jest.fn() },
  supabase: { auth: { getSession: jest.fn() } },
}));

const getSession = supabase.auth.getSession as jest.Mock;
const getStoredItem = sessionStorage.getItem as jest.Mock;

const userId = '6f1c7a52-8d3e-4b0a-9c55-2e6f1d7b8a90';

describe('loadInitialSession', () => {
  beforeEach(() => jest.resetAllMocks());

  it('uses the session Supabase returns', async () => {
    getSession.mockResolvedValue({
      data: { session: { user: { id: userId, email: 'a@b.co' } } },
      error: null,
    });

    expect(await loadInitialSession()).toEqual({ id: userId, email: 'a@b.co' });
    expect(getStoredItem).not.toHaveBeenCalled();
  });

  it('is signed out when there is no session and nothing failed', async () => {
    getSession.mockResolvedValue({ data: { session: null }, error: null });

    expect(await loadInitialSession()).toBeNull();
  });

  it('keeps the stored user signed in when the token refresh fails offline', async () => {
    getSession.mockResolvedValue({
      data: { session: null },
      error: new AuthRetryableFetchError('Failed to fetch', 0),
    });
    getStoredItem.mockResolvedValue(
      JSON.stringify({ refresh_token: 'r1', user: { id: userId, email: 'a@b.co' } }),
    );

    expect(await loadInitialSession()).toEqual({ id: userId, email: 'a@b.co' });
  });

  it('signs out when the server rejects the session', async () => {
    getSession.mockResolvedValue({
      data: { session: null },
      error: new AuthApiError('Invalid Refresh Token', 400, 'refresh_token_not_found'),
    });

    expect(await loadInitialSession()).toBeNull();
    expect(getStoredItem).not.toHaveBeenCalled();
  });

  it('is signed out offline when the stored session is missing or malformed', async () => {
    getSession.mockResolvedValue({
      data: { session: null },
      error: new AuthRetryableFetchError('Failed to fetch', 0),
    });

    getStoredItem.mockResolvedValue(null);
    expect(await loadInitialSession()).toBeNull();

    getStoredItem.mockResolvedValue('{"user": {"id": "not-a-uuid"}}');
    expect(await loadInitialSession()).toBeNull();

    getStoredItem.mockResolvedValue('not json');
    expect(await loadInitialSession()).toBeNull();
  });
});
