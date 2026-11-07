import { Stack, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRow } from '@/components/ui/ListRow';
import { ListSection } from '@/components/ui/ListSection';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { useDialog } from '@/components/ui/useDialog';
import { dayTitle } from '@/features/history/utils/historyDates';
import { useUnits } from '@/features/settings/hooks/useUnits';
import { formatDuration } from '@/lib/durations';
import { errorMessage, toAppError } from '@/lib/errors';
import { formatDistance } from '@/lib/units';
import { useIsOffline } from '@/lib/useIsOffline';
import { screenPadding, spacing } from '@/theme/layout';

import { useCardioRoute, useCardioSessions, useDeleteCardioSession } from '../api/cardio';
import { usePendingCardio } from '../hooks/usePendingCardio';
import { activityLabels, formatPace } from '../utils/cardioFormat';
import { averagePace } from '../utils/route';
import { RouteMap } from './RouteMap';

type CardioDetailScreenProps = {
  sessionId: string;
};

function timeOfDay(time: number): string {
  const date = new Date(time);
  return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
}

// A recorded run, walk or ride: the route on the map and its numbers. One
// still waiting to sync is shown from the copy in the outbox.
export function CardioDetailScreen({ sessionId }: CardioDetailScreenProps) {
  const router = useRouter();
  const units = useUnits();
  const isOffline = useIsOffline();
  const sessions = useCardioSessions();
  const pending = usePendingCardio().find((item) => item.session.id === sessionId);
  const saved = sessions.data?.find((session) => session.id === sessionId);
  const savedRoute = useCardioRoute(sessionId, saved !== undefined && pending === undefined);
  const deleteSession = useDeleteCardioSession();
  const { dialog, showDialog } = useDialog();

  const session = pending?.session ?? saved;
  if (!session) {
    if (deleteSession.isSuccess || sessions.data === undefined) return null;
    return (
      <Screen padded={false} edges={['bottom']}>
        <EmptyState
          title="This session no longer exists"
          message="It may have been deleted."
          actionLabel="Go back"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  const shown = session;
  const label = activityLabels[shown.activity];
  const route = pending?.route ?? savedRoute.data ?? [];
  const pace = averagePace(shown.distanceM, shown.movingSeconds);
  // Offline, a route never opened before isn't an error: the query is paused
  // until the connection returns, so it is caught by its fetch status too.
  const routeNeedsConnection = savedRoute.isError || savedRoute.fetchStatus === 'paused';
  const routeLoading = pending === undefined && savedRoute.isPending;

  function confirmDelete() {
    showDialog({
      title: `Delete ${label.toLowerCase()}?`,
      message: `This ${label.toLowerCase()} and its route will be deleted.`,
      actions: [
        { label: 'Cancel' },
        {
          label: `Delete ${label.toLowerCase()}`,
          destructive: true,
          onPress: () => deleteSession.mutate(shown.id, { onSuccess: () => router.back() }),
        },
      ],
    });
  }

  return (
    <Screen scroll padded={false} edges={['bottom']}>
      <Stack.Screen options={{ title: label }} />
      {pending ? (
        <OfflineBanner message="Not synced yet. It's saved on this phone and syncs when you're online." />
      ) : isOffline ? (
        <OfflineBanner message="You're offline. Connect to delete this session." />
      ) : null}
      <View style={styles.map}>
        {route.length >= 2 ? (
          <RouteMap
            points={route}
            follow={false}
            accessibilityLabel={`Map of this ${label.toLowerCase()}'s route`}
          />
        ) : routeNeedsConnection ? (
          <Text variant="secondary" tone="textMuted" style={styles.noRoute}>
            The route shows once you are online.
          </Text>
        ) : routeLoading ? (
          <View accessible accessibilityLabel="Loading">
            <Skeleton width="100%" height={mapHeight} />
          </View>
        ) : (
          <Text variant="secondary" tone="textMuted" style={styles.noRoute}>
            No route was recorded.
          </Text>
        )}
      </View>
      <ListSection title={`${dayTitle(shown.startedAt)}, ${timeOfDay(shown.startedAt)}`}>
        <ListRow title="Distance" value={formatDistance(shown.distanceM, units.distanceUnit)} />
        <ListRow
          title="Duration"
          value={formatDuration((shown.endedAt - shown.startedAt) / 1000)}
        />
        <ListRow title="Moving time" value={formatDuration(shown.movingSeconds)} />
        <ListRow title="Average pace" value={formatPace(pace, units.distanceUnit)} />
      </ListSection>
      {!pending ? (
        <View style={styles.actions}>
          {deleteSession.error ? (
            <Text tone="error" accessibilityRole="alert">
              {errorMessage(toAppError(deleteSession.error))}
            </Text>
          ) : null}
          <Button
            label={`Delete ${label.toLowerCase()}`}
            variant="destructive"
            onPress={confirmDelete}
            loading={deleteSession.isPending}
            disabled={isOffline}
          />
        </View>
      ) : null}
      {dialog}
    </Screen>
  );
}

const mapHeight = 260;

const styles = StyleSheet.create({
  map: { height: mapHeight },
  noRoute: { padding: screenPadding, paddingTop: spacing.xl, textAlign: 'center' },
  actions: {
    padding: screenPadding,
    paddingTop: spacing.xl,
    gap: spacing.sm,
  },
});
