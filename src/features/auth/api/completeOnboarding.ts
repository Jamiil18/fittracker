import { useMutation, useQueryClient } from '@tanstack/react-query';

import { profileQueryKey, saveProfile, type Profile } from '@/features/settings/api/profile';
import { toLocalDateString } from '@/lib/dates';
import { toAppError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

import type { OnboardingValues } from '../schemas/onboardingSchema';

// Bodyweight is saved first and onboarding is marked complete last, so if the
// first write fails the user stays on the onboarding screen and nothing is
// half-finished.
export async function completeOnboarding(
  userId: string,
  values: OnboardingValues,
  today: Date = new Date(),
): Promise<Profile> {
  if (values.bodyweightKg !== null) {
    const { error } = await supabase
      .from('body_measurements')
      .upsert(
        { user_id: userId, measured_on: toLocalDateString(today), weight_kg: values.bodyweightKg },
        { onConflict: 'user_id,measured_on' },
      );
    if (error) throw toAppError(error);
  }

  return saveProfile(userId, {
    weight_unit: values.weightUnit,
    distance_unit: values.distanceUnit,
    display_name: values.displayName,
    height_cm: values.heightCm,
    onboarding_completed_at: new Date().toISOString(),
  });
}

export function useCompleteOnboarding(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: OnboardingValues) => completeOnboarding(userId, values),
    // Offline, the default would pause the save and leave Get started spinning
    // with no message; running it fails straight away with "You're offline".
    networkMode: 'always',
    // Putting the saved profile in the cache moves navigation on to the app.
    onSuccess: (profile) => queryClient.setQueryData(profileQueryKey(userId), profile),
  });
}
