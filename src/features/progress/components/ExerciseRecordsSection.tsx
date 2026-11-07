import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ListRow } from '@/components/ui/ListRow';
import { ListSection } from '@/components/ui/ListSection';
import type { ExerciseType } from '@/features/exercises/schemas/exerciseSchemas';
import { useTrainingHistory } from '@/features/history/api/history';
import { shortDate } from '@/features/history/utils/historyDates';
import { useUnits } from '@/features/settings/hooks/useUnits';
import { formatRecordValue, recordLabels } from '@/features/workout/utils/records';
import { errorMessage, toAppError } from '@/lib/errors';

import { exerciseRecords, exerciseSessions } from '../utils/exerciseProgress';

type ExerciseRecordsSectionProps = {
  exerciseId: string;
  exerciseType: ExerciseType;
};

// The exercise's personal records, each with the date it was set.
export function ExerciseRecordsSection({ exerciseId, exerciseType }: ExerciseRecordsSectionProps) {
  const units = useUnits();
  const history = useTrainingHistory();

  if (history.data === undefined) {
    return history.isError ? (
      <ErrorState
        title="Couldn't load your records"
        message={errorMessage(toAppError(history.error))}
        onRetry={() => void history.refetch()}
      />
    ) : null;
  }

  const records = exerciseRecords(exerciseType, exerciseSessions(history.data, exerciseId));
  if (records.length === 0) {
    return (
      <EmptyState
        title="No records yet"
        message="Log this exercise in a workout to set your first records."
      />
    );
  }

  return (
    <ListSection title="Personal records">
      {records.map((record) => (
        <ListRow
          key={record.kind}
          title={recordLabels[record.kind]}
          subtitle={shortDate(record.achievedAt)}
          value={formatRecordValue(record.kind, record.value, units)}
        />
      ))}
    </ListSection>
  );
}
