import { useSaveRoutine } from '../api/routines';
import { RoutineForm } from './RoutineForm';

export function NewRoutineScreen() {
  const saveRoutine = useSaveRoutine(null);

  return (
    <RoutineForm
      defaultValues={{ name: '', notes: '', exercises: [] }}
      submitLabel="Create routine"
      onSubmit={(values) => saveRoutine.mutateAsync(values)}
    />
  );
}
