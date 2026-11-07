import { useRouter } from 'expo-router';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { ListRow } from '@/components/ui/ListRow';
import { ListSection } from '@/components/ui/ListSection';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { Screen } from '@/components/ui/Screen';
import { dayKeyToTime, shortDate } from '@/features/history/utils/historyDates';
import { BodySection } from '@/features/body/components/BodySection';
import { useProfile } from '@/features/settings/api/profile';
import { useUnits } from '@/features/settings/hooks/useUnits';
import { useIsOffline } from '@/lib/useIsOffline';

import { ageOn, formatHeight } from '../utils/profileDetails';
import { ProfileHeader } from './ProfileHeader';

const sexLabels = { female: 'Female', male: 'Male' } as const;

function dateOfBirthText(dateOfBirth: string, today: Date): string {
  return `${shortDate(dayKeyToTime(dateOfBirth))} (${ageOn(dateOfBirth, today)})`;
}

// The user's name, totals, personal details, and the Body section: bodyweight
// with BMI and its trend.
// Viewing works offline from the copies saved on the phone; editing needs a
// connection.
export function ProfileScreen() {
  const router = useRouter();
  const isOffline = useIsOffline();
  const units = useUnits();
  const profile = useProfile().data;
  const [today] = useState(() => new Date());

  // The signed-in screens only show once the profile has loaded.
  if (!profile) return null;

  return (
    <Screen scroll padded={false} edges={[]}>
      {isOffline ? <OfflineBanner message="You're offline. Connect to edit your profile." /> : null}
      <ProfileHeader name={profile.displayName} />
      <ListSection
        title="Personal info"
        actions={
          <Button
            label="Edit"
            variant="plain"
            disabled={isOffline}
            accessibilityHint="Edits your name and personal info"
            onPress={() => router.push('/profile/edit')}
          />
        }
      >
        <ListRow
          title="Date of birth"
          value={profile.dateOfBirth ? dateOfBirthText(profile.dateOfBirth, today) : 'Not set'}
        />
        <ListRow
          title="Height"
          value={profile.heightCm ? formatHeight(profile.heightCm, units.distanceUnit) : 'Not set'}
        />
        <ListRow title="Sex" value={profile.sex ? sexLabels[profile.sex] : 'Not set'} />
      </ListSection>
      <BodySection heightCm={profile.heightCm} units={units} />
    </Screen>
  );
}
