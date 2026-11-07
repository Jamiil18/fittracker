import { profileSchema } from './profile';

jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/features/auth/components/SessionProvider', () => ({ useSession: jest.fn() }));

const row = {
  id: '6f1c7a52-8d3e-4b0a-9c55-2e6f1d7b8a90',
  weight_unit: 'lb',
  distance_unit: 'mi',
  default_rest_seconds: 120,
  onboarding_completed_at: '2026-10-03T12:00:00+00:00',
  display_name: 'Jamiil',
  date_of_birth: '2002-03-14',
  height_cm: 178,
  sex: null,
};

describe('profileSchema', () => {
  it('turns a profiles row into the app profile', () => {
    expect(profileSchema.parse(row)).toEqual({
      id: row.id,
      weightUnit: 'lb',
      distanceUnit: 'mi',
      defaultRestSeconds: 120,
      onboardingCompleted: true,
      displayName: 'Jamiil',
      dateOfBirth: '2002-03-14',
      heightCm: 178,
      sex: null,
    });
  });

  it('reports a new user as not onboarded', () => {
    const profile = profileSchema.parse({ ...row, onboarding_completed_at: null });
    expect(profile.onboardingCompleted).toBe(false);
  });

  it('rejects a row that does not match the schema', () => {
    expect(profileSchema.safeParse({ ...row, weight_unit: 'stone' }).success).toBe(false);
    expect(profileSchema.safeParse({ ...row, default_rest_seconds: -1 }).success).toBe(false);
  });
});
