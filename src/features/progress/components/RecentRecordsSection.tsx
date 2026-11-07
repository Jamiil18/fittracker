import { useRouter } from 'expo-router';

import { Button } from '@/components/ui/Button';
import { ListRow } from '@/components/ui/ListRow';
import { ListSection } from '@/components/ui/ListSection';
import type { PastWorkout } from '@/features/history/schemas/historySchemas';
import { dayMonth } from '@/features/history/utils/historyDates';
import { useUnits } from '@/features/settings/hooks/useUnits';
import { formatRecordValue, recordLabels } from '@/features/workout/utils/records';

import { allRecords } from '../utils/exerciseProgress';

const shownRecords = 5;

type RecentRecordsSectionProps = {
  history: PastWorkout[];
};

// The most recently set personal records, with "See all" for every exercise.
export function RecentRecordsSection({ history }: RecentRecordsSectionProps) {
  const router = useRouter();
  const units = useUnits();
  const recent = allRecords(history)
    .flatMap((item) => item.records.map((record) => ({ ...record, exercise: item.exercise })))
    .sort((a, b) => b.achievedAt - a.achievedAt)
    .slice(0, shownRecords);

  if (recent.length === 0) return null;

  return (
    <ListSection
      title="Personal records"
      actions={<Button label="See all" variant="plain" onPress={() => router.push('/records')} />}
    >
      {recent.map((record) => (
        <ListRow
          key={`${record.exercise.id}-${record.kind}`}
          title={record.exercise.name}
          subtitle={`${recordLabels[record.kind]}, ${dayMonth(record.achievedAt)}`}
          value={formatRecordValue(record.kind, record.value, units)}
        />
      ))}
    </ListSection>
  );
}
