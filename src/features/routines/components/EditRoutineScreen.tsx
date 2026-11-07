import { useProfile } from '@/features/settings/api/profile';

import { useRoutine, useSaveRoutine } from '../api/routines';
import { routineToFormInput } from '../utils/routineForm';
import { RoutineForm } from './RoutineForm';
import { RoutineScreenState } from './RoutineScreenState';

type EditRoutineScreenProps = {
  routineId: string;
};

export function EditRoutineScreen({ routineId }: EditRoutineScreenProps) {
  const routines = useRoutine(routineId);
  const saveRoutine = useSaveRoutine(routineId);
  const weightUnit = useProfile().data?.weightUnit ?? 'kg';

  if (routines.routine === undefined) {
    return (
      <RoutineScreenState
        isLoaded={routines.data !== undefined}
        error={routines.error}
        onRetry={() => void routines.refetch()}
      />
    );
  }

  return (
    <RoutineForm
      defaultValues={routineToFormInput(routines.routine, weightUnit)}
      submitLabel="Save changes"
      onSubmit={(values) => saveRoutine.mutateAsync(values)}
    />
  );
}
