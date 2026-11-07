import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

import { deleteAccount } from './deleteAccount';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    functions: { invoke: jest.fn() },
    auth: { signOut: jest.fn() },
  },
}));

const invoke = supabase.functions.invoke as jest.Mock;
const signOut = supabase.auth.signOut as jest.Mock;

function failedWith(status: number) {
  return { data: null, error: new FunctionsHttpError(new Response(null, { status })) };
}

describe('deleteAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    signOut.mockResolvedValue({ error: null });
  });

  it('sends the password to the function, then signs out on this phone', async () => {
    invoke.mockResolvedValue({ data: { deleted: true }, error: null });

    await deleteAccount('correct horse');

    expect(invoke).toHaveBeenCalledWith('delete-account', { body: { password: 'correct horse' } });
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('reports a wrong password and stays signed in', async () => {
    invoke.mockResolvedValue(failedWith(403));

    await expect(deleteAccount('wrong')).rejects.toMatchObject({
      code: 'wrong_current_password',
    });
    expect(signOut).not.toHaveBeenCalled();
  });

  it('reports too many attempts', async () => {
    invoke.mockResolvedValue(failedWith(429));

    await expect(deleteAccount('again')).rejects.toMatchObject({ code: 'too_many_requests' });
  });

  it('reports being offline when the function cannot be reached', async () => {
    invoke.mockResolvedValue({ data: null, error: new FunctionsFetchError(new TypeError()) });

    await expect(deleteAccount('correct horse')).rejects.toMatchObject({ code: 'offline' });
    expect(signOut).not.toHaveBeenCalled();
  });

  it('reports a server failure without signing out', async () => {
    invoke.mockResolvedValue(failedWith(500));

    await expect(deleteAccount('correct horse')).rejects.toMatchObject({ code: 'unknown' });
    expect(signOut).not.toHaveBeenCalled();
  });
});
