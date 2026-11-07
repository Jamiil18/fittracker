import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/auth/components/SessionProvider';
import { profileQueryKey, saveProfile, type Profile } from '@/features/settings/api/profile';

import type { ProfileDetails } from '../schemas/profileDetailsSchema';

function updateProfileDetails(userId: string, details: ProfileDetails): Promise<Profile> {
  return saveProfile(userId, {
    display_name: details.displayName,
    date_of_birth: details.dateOfBirth,
    height_cm: details.heightCm,
    sex: details.sex,
  });
}

// Editing needs a connection, so it fails straight away offline instead of
// waiting.
export function useUpdateProfileDetails() {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const userId = user?.id ?? '';
  return useMutation({
    mutationFn: (details: ProfileDetails) => updateProfileDetails(userId, details),
    networkMode: 'always',
    onSuccess: (profile) => queryClient.setQueryData(profileQueryKey(userId), profile),
  });
}
