import { useLocalSearchParams } from 'expo-router';

import { EditRoutineScreen } from '@/features/routines/components/EditRoutineScreen';

export default function EditRoutineRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EditRoutineScreen routineId={id} />;
}
