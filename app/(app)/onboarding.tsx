import { OnboardingScreen } from '@/features/auth/components/OnboardingScreen';
import { useProfile } from '@/features/settings/api/profile';

// The signed-in navigator only shows this route once the profile has loaded.
export default function OnboardingRoute() {
  const { data: profile } = useProfile();
  return profile ? <OnboardingScreen profile={profile} /> : null;
}
