import { useProfile } from '@/features/settings/api/profile';

import { EditProfileForm } from './EditProfileForm';

export function EditProfileScreen() {
  const profile = useProfile().data;
  // The signed-in screens only show once the profile has loaded.
  return profile ? <EditProfileForm profile={profile} /> : null;
}
