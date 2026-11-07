import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { distanceUnitSchema, weightUnitSchema } from '../schemas/unitsSchema';
import { profileQueryKey, saveProfile, type Profile } from './profile';

// The settings that save as soon as they are changed. Any of them can be sent
// on its own; the rest limit matches the check on the profiles table.
const settingsSchema = z
  .object({
    weightUnit: weightUnitSchema,
    distanceUnit: distanceUnitSchema,
    defaultRestSeconds: z.int().min(0).max(900),
  })
  .partial();

type SettingsChanges = z.infer<typeof settingsSchema>;

export async function updateSettings(userId: string, changes: SettingsChanges): Promise<Profile> {
  const valid = settingsSchema.parse(changes);
  return saveProfile(userId, {
    weight_unit: valid.weightUnit,
    distance_unit: valid.distanceUnit,
    default_rest_seconds: valid.defaultRestSeconds,
  });
}

// The cached profile changes before the request is sent, so the control
// responds at once. If the save fails, the earlier profile is put back.
export function useUpdateSettings(userId: string) {
  const queryClient = useQueryClient();
  const queryKey = profileQueryKey(userId);

  return useMutation({
    mutationFn: (changes: SettingsChanges) => updateSettings(userId, changes),
    // Without this, a save started offline would wait silently and run on
    // reconnect. Failing straight away lets the screen say what happened.
    networkMode: 'always',
    onMutate: async (changes) => {
      // A profile request already on its way would overwrite the change with
      // the old value when it lands.
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Profile>(queryKey);
      if (previous) queryClient.setQueryData<Profile>(queryKey, { ...previous, ...changes });
      return { previous };
    },
    onError: (_error, _changes, context) => {
      if (context?.previous) queryClient.setQueryData<Profile>(queryKey, context.previous);
    },
    onSuccess: (profile) => queryClient.setQueryData(queryKey, profile),
  });
}
