import { supabase } from '@/lib/supabase';

import { completeOnboarding } from './completeOnboarding';

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn() } }));

const userId = '6f1c7a52-8d3e-4b0a-9c55-2e6f1d7b8a90';

const savedRow = {
  id: userId,
  weight_unit: 'kg',
  distance_unit: 'km',
  default_rest_seconds: 120,
  onboarding_completed_at: '2026-10-03T12:00:00+00:00',
  display_name: null,
  date_of_birth: null,
  height_cm: null,
  sex: null,
};

// Records the order of writes so the test can check bodyweight comes first.
const writes: string[] = [];
const upsert = jest.fn();
const update = jest.fn();

function mockDatabase({ upsertError = null }: { upsertError?: object | null } = {}) {
  upsert.mockImplementation(async () => {
    writes.push('body_measurements');
    return { error: upsertError };
  });
  update.mockImplementation(() => {
    writes.push('profiles');
    return {
      eq: () => ({
        select: () => ({ single: async () => ({ data: savedRow, error: null }) }),
      }),
    };
  });
  (supabase.from as jest.Mock).mockImplementation((table: string) =>
    table === 'body_measurements' ? { upsert } : { update },
  );
}

const values = {
  displayName: 'Jamiil',
  weightUnit: 'kg' as const,
  distanceUnit: 'km' as const,
  bodyweightKg: 81.4,
  heightCm: 178,
};

describe('completeOnboarding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    writes.length = 0;
  });

  it("saves today's bodyweight before marking onboarding complete", async () => {
    mockDatabase();

    const profile = await completeOnboarding(userId, values, new Date(2026, 9, 3, 21, 0));

    expect(writes).toEqual(['body_measurements', 'profiles']);
    expect(upsert).toHaveBeenCalledWith(
      { user_id: userId, measured_on: '2026-10-03', weight_kg: 81.4 },
      { onConflict: 'user_id,measured_on' },
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        weight_unit: 'kg',
        distance_unit: 'km',
        display_name: 'Jamiil',
        height_cm: 178,
        onboarding_completed_at: expect.any(String),
      }),
    );
    expect(profile.onboardingCompleted).toBe(true);
  });

  it('skips the bodyweight write when none was entered', async () => {
    mockDatabase();

    await completeOnboarding(userId, { ...values, bodyweightKg: null });

    expect(writes).toEqual(['profiles']);
  });

  it('does not mark onboarding complete when saving bodyweight fails', async () => {
    mockDatabase({ upsertError: { message: 'TypeError: Network request failed' } });

    await expect(completeOnboarding(userId, values)).rejects.toMatchObject({ code: 'offline' });
    expect(writes).toEqual(['body_measurements']);
  });
});
