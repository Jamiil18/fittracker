import { useProfile } from '@/features/settings/api/profile';
import { SettingsScreen } from '@/features/settings/components/SettingsScreen';

// The signed-in navigator only shows this route once the profile has loaded.
export default function SettingsRoute() {
  const { data: profile } = useProfile();
  return profile ? <SettingsScreen profile={profile} /> : null;
}
