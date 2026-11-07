import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { useSession } from '@/features/auth/components/SessionProvider';
import { toAppError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

import { distanceUnitSchema, weightUnitSchema } from '../schemas/unitsSchema';

export const profileColumns =
  'id, weight_unit, distance_unit, default_rest_seconds, onboarding_completed_at, display_name, date_of_birth, height_cm, sex';

// Parses a profiles row at the API boundary and turns it into the shape the
// app uses, so nothing else depends on column names.
export const profileSchema = z
  .object({
    id: z.uuid(),
    weight_unit: weightUnitSchema,
    distance_unit: distanceUnitSchema,
    default_rest_seconds: z.int().min(0),
    onboarding_completed_at: z.string().nullable(),
    display_name: z.string().nullable(),
    // YYYY-MM-DD
    date_of_birth: z.iso.date().nullable(),
    height_cm: z.number().nullable(),
    sex: z.enum(['female', 'male']).nullable(),
  })
  .transform((row) => ({
    id: row.id,
    weightUnit: row.weight_unit,
    distanceUnit: row.distance_unit,
    defaultRestSeconds: row.default_rest_seconds,
    onboardingCompleted: row.onboarding_completed_at !== null,
    displayName: row.display_name,
    dateOfBirth: row.date_of_birth,
    heightCm: row.height_cm,
    sex: row.sex,
  }));

export type Profile = z.output<typeof profileSchema>;

// The profile columns the app writes. Callers validate the values first.
type ProfileChanges = Partial<{
  weight_unit: Profile['weightUnit'];
  distance_unit: Profile['distanceUnit'];
  default_rest_seconds: number;
  onboarding_completed_at: string;
  display_name: string | null;
  date_of_birth: string | null;
  height_cm: number | null;
  sex: Profile['sex'];
}>;

// Every profile write goes through here, and returns the saved profile so it
// can go straight into the cache.
export async function saveProfile(userId: string, changes: ProfileChanges): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(changes)
    .eq('id', userId)
    .select(profileColumns)
    .single();
  if (error) throw toAppError(error);
  return profileSchema.parse(data);
}

export function profileQueryKey(userId: string) {
  return ['profile', userId] as const;
}

async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select(profileColumns)
    .eq('id', userId)
    .single();
  if (error) throw toAppError(error);
  return profileSchema.parse(data);
}

export function useProfile() {
  const { user } = useSession();
  const userId = user?.id ?? '';
  return useQuery({
    queryKey: profileQueryKey(userId),
    queryFn: () => fetchProfile(userId),
    enabled: user !== null,
    // The copy saved on the phone is written at most once a second, so if the
    // app closes just after a change it can reopen with an older profile. That
    // copy is shown straight away (and is all there is offline), but it is
    // always checked against the server when a screen that uses it opens.
    refetchOnMount: 'always',
  });
}
