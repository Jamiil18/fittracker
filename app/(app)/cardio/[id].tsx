import { useLocalSearchParams } from 'expo-router';

import { CardioDetailScreen } from '@/features/cardio/components/CardioDetailScreen';

export default function CardioDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CardioDetailScreen sessionId={id} />;
}
