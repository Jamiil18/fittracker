import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ListRow } from '@/components/ui/ListRow';
import { ListSection } from '@/components/ui/ListSection';
import { Screen } from '@/components/ui/Screen';
import { useTrainingHistory } from '@/features/history/api/history';
import { shortDate } from '@/features/history/utils/historyDates';
import { useUnits } from '@/features/settings/hooks/useUnits';
import { formatRecordValue, recordLabels } from '@/features/workout/utils/records';
import { errorMessage, toAppError } from '@/lib/errors';

import { allRecords } from '../utils/exerciseProgress';

// Every personal record, grouped by exercise in name order.
export function AllRecordsScreen() {
  const units = useUnits();
  const history = useTrainingHistory();

  if (history.data === undefined) {
    return (
      <Screen padded={false} edges={['bottom']}>
        {history.isError ? (
          <ErrorState
            title="Couldn't load your records"
            message={errorMessage(toAppError(history.error))}
            onRetry={() => void history.refetch()}
          />
        ) : null}
      </Screen>
    );
  }

  const records = allRecords(history.data);
  if (records.length === 0) {
    return (
      <Screen padded={false} edges={['bottom']}>
        <EmptyState
          title="No records yet"
          message="Finish a workout and each exercise's records appear here."
        />
      </Screen>
    );
  }

  return (
    <Screen scroll padded={false} edges={['bottom']}>
      {records.map((item) => (
        <ListSection key={item.exercise.id} title={item.exercise.name}>
          {item.records.map((record) => (
            <ListRow
              key={record.kind}
              title={recordLabels[record.kind]}
              subtitle={shortDate(record.achievedAt)}
              value={formatRecordValue(record.kind, record.value, units)}
            />
          ))}
        </ListSection>
      ))}
    </Screen>
  );
}
