import { supabase } from '@/lib/supabase';

import { updateSettings } from './updateSettings';

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn() } }));
jest.mock('@/features/auth/components/SessionProvider', () => ({ useSession: jest.fn() }));

const userId = '6f1c7a52-8d3e-4b0a-9c55-2e6f1d7b8a90';

const savedRow = {
  id: userId,
  weight_unit: 'lb',
  distance_unit: 'mi',
  default_rest_seconds: 120,
  onboarding_completed_at: '2026-10-03T12:00:00+00:00',
  display_name: null,
  date_of_birth: null,
  height_cm: null,
  sex: null,
};

const update = jest.fn();
const eq = jest.fn();

function mockDatabase(result: { data: object | null; error: object | null }) {
  eq.mockReturnValue({ select: () => ({ single: async () => result }) });
  update.mockReturnValue({ eq });
  (supabase.from as jest.Mock).mockReturnValue({ update });
}

describe('updateSettings', () => {
  beforeEach(() => jest.clearAllMocks());

  it("saves both units to the user's own profile and returns it", async () => {
    mockDatabase({ data: savedRow, error: null });

    const profile = await updateSettings(userId, { weightUnit: 'lb', distanceUnit: 'mi' });

    expect(supabase.from).toHaveBeenCalledWith('profiles');
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ weight_unit: 'lb', distance_unit: 'mi' }),
    );
    expect(eq).toHaveBeenCalledWith('id', userId);
    expect(profile).toMatchObject({ weightUnit: 'lb', distanceUnit: 'mi' });
  });

  it('saves only the setting that changed', async () => {
    mockDatabase({ data: savedRow, error: null });

    await updateSettings(userId, { defaultRestSeconds: 90 });

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ default_rest_seconds: 90 }));
    expect(update.mock.calls[0]?.[0]).not.toHaveProperty('weight_unit', expect.anything());
  });

  it('reports a failed request as an app error', async () => {
    mockDatabase({ data: null, error: { message: 'TypeError: Network request failed' } });

    await expect(
      updateSettings(userId, { weightUnit: 'lb', distanceUnit: 'mi' }),
    ).rejects.toMatchObject({ code: 'offline' });
  });

  it('rejects a unit the database does not have, without sending anything', async () => {
    mockDatabase({ data: savedRow, error: null });

    await expect(
      updateSettings(userId, { weightUnit: 'stone' as 'kg', distanceUnit: 'km' }),
    ).rejects.toThrow();
    expect(update).not.toHaveBeenCalled();
  });
});
