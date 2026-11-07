import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { ExerciseHistorySection } from '@/features/progress/components/ExerciseHistorySection';
import { ExerciseRecordsSection } from '@/features/progress/components/ExerciseRecordsSection';
import { errorMessage, toAppError } from '@/lib/errors';
import { radius, screenPadding, spacing } from '@/theme/layout';
import { useTheme } from '@/theme/useTheme';

import { useExercise } from '../api/exercises';
import { exerciseImageUrl } from '../dataset';
import { ExerciseAboutSection } from './ExerciseAboutSection';

type ExerciseDetailScreenProps = {
  exerciseId: string;
};

const imageLabels = ['Start position', 'End position'];

type Section = 'about' | 'history' | 'records';
const sectionOptions = [
  { value: 'about' as const, label: 'About' },
  { value: 'history' as const, label: 'History' },
  { value: 'records' as const, label: 'Records' },
];

export function ExerciseDetailScreen({ exerciseId }: ExerciseDetailScreenProps) {
  const { colors } = useTheme();
  const exercise = useExercise(exerciseId);
  const [section, setSection] = useState<Section>('about');

  if (exercise.data === undefined) {
    return (
      <Screen padded={false} edges={['bottom']}>
        {exercise.isError ? (
          <ErrorState
            title="Couldn't load this exercise"
            message={errorMessage(toAppError(exercise.error))}
            onRetry={() => void exercise.refetch()}
          />
        ) : exercise.fetchStatus === 'paused' ? (
          // Offline, an exercise never opened before isn't saved on the phone.
          // The request waits rather than failing, and finishes by itself
          // when the connection returns.
          <EmptyState
            title="This exercise isn't saved on this phone yet"
            message="Connect to the internet to open it. After that, it opens offline too."
          />
        ) : (
          <View accessible accessibilityLabel="Loading" style={styles.loading}>
            <Skeleton width="100%" height={140} radius="md" />
            <Skeleton width="50%" height={17} />
            <Skeleton width="80%" height={17} />
            <Skeleton width="70%" height={17} />
          </View>
        )}
      </Screen>
    );
  }

  const detail = exercise.data;

  return (
    <Screen scroll padded={false} edges={['bottom']}>
      <Stack.Screen options={{ title: detail.name }} />

      {detail.imagePaths.length > 0 ? (
        <View style={styles.images}>
          {detail.imagePaths.slice(0, 2).map((path, index) => (
            <Image
              key={path}
              source={{ uri: exerciseImageUrl(path) }}
              cachePolicy="disk"
              contentFit="cover"
              accessibilityLabel={imageLabels[index]}
              style={[styles.image, { backgroundColor: colors.separator }]}
            />
          ))}
        </View>
      ) : null}

      <View style={styles.tabs}>
        <SegmentedControl
          options={sectionOptions}
          value={section}
          onChange={setSection}
          accessibilityLabel="Show"
        />
      </View>

      {section === 'about' ? <ExerciseAboutSection detail={detail} /> : null}
      {section === 'history' ? (
        <ExerciseHistorySection exerciseId={detail.id} exerciseType={detail.exerciseType} />
      ) : null}
      {section === 'records' ? (
        <ExerciseRecordsSection exerciseId={detail.id} exerciseType={detail.exerciseType} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    padding: screenPadding,
    gap: spacing.lg,
  },
  images: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: screenPadding,
    paddingTop: spacing.lg,
  },
  image: {
    flex: 1,
    aspectRatio: 4 / 3,
    borderRadius: radius.md,
  },
  tabs: {
    paddingHorizontal: screenPadding,
    paddingTop: spacing.lg,
  },
});
