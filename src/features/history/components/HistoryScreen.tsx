import { useRouter } from 'expo-router';
import { useState } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { activityLabels, cardioSummaryText } from '@/features/cardio/utils/cardioFormat';
import { useUnits } from '@/features/settings/hooks/useUnits';
import { errorMessage, toAppError } from '@/lib/errors';
import { screenPadding, spacing } from '@/theme/layout';
import { useTheme } from '@/theme/useTheme';

import { useHistoryItems } from '../hooks/useHistoryItems';
import { dayKey, dayKeyToTime, dayTitle, durationText } from '../utils/historyDates';
import { groupByDay, trainedDays, type HistoryItem } from '../utils/historyList';
import { totalsText, workoutTotals } from '../utils/pastWorkout';
import { MonthCalendar } from './MonthCalendar';

// Past workouts by day, under a month calendar. Everything comes from the
// copy saved on the phone, so it works offline; workouts still waiting to
// sync are listed too, marked "Not synced yet".
export function HistoryScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const units = useUnits();
  const history = useHistoryItems();
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  if (history.data === undefined && history.items.length === 0) {
    return (
      <Screen padded={false} edges={[]}>
        {history.isError ? (
          <ErrorState
            title="Couldn't load your history"
            message={errorMessage(toAppError(history.error))}
            onRetry={() => void history.refetch()}
          />
        ) : (
          <View accessible accessibilityLabel="Loading" style={styles.loading}>
            <Skeleton width="100%" height={240} radius="md" />
            <Skeleton width="40%" height={14} />
            <Skeleton width="70%" height={17} />
            <Skeleton width="50%" height={14} />
          </View>
        )}
      </Screen>
    );
  }

  const shown = selectedDay
    ? history.items.filter((item) => dayKey(item.startedAt) === selectedDay)
    : history.items;

  function changeMonth(delta: -1 | 1) {
    setMonth(({ year, month: current }) => {
      const next = new Date(year, current + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  function open(item: HistoryItem) {
    if (item.kind === 'cardio') {
      router.push({ pathname: '/cardio/[id]', params: { id: item.id } });
    } else if (item.pending) {
      router.push({ pathname: '/workouts/pending/[id]', params: { id: item.id } });
    } else {
      router.push({ pathname: '/workouts/[id]', params: { id: item.id } });
    }
  }

  function rowText(item: HistoryItem) {
    if (item.kind === 'cardio') {
      const { cardio } = item;
      return {
        title: activityLabels[cardio.activity],
        subtitle: item.pending
          ? 'Not synced yet'
          : cardioSummaryText(cardio.distanceM, cardio.movingSeconds, units.distanceUnit),
        value: durationText((cardio.endedAt - cardio.startedAt) / 1000),
      };
    }
    return {
      title: item.workout.name,
      subtitle: item.pending ? 'Not synced yet' : totalsText(item.workout, units),
      value: durationText(workoutTotals(item.workout).durationSeconds),
    };
  }

  const header = (
    <View>
      <MonthCalendar
        year={month.year}
        month={month.month}
        trainedDays={trainedDays(history.items)}
        selectedDay={selectedDay}
        onSelectDay={(day) => setSelectedDay((current) => (current === day ? null : day))}
        onChangeMonth={changeMonth}
      />
      {selectedDay ? (
        <View style={styles.filter}>
          <Text variant="secondary" tone="textMuted" style={styles.filterText}>
            Showing {dayTitle(dayKeyToTime(selectedDay))} only.
          </Text>
          <Button label="Show all" variant="plain" onPress={() => setSelectedDay(null)} />
        </View>
      ) : null}
    </View>
  );

  return (
    <Screen padded={false} edges={[]}>
      <SectionList
        sections={groupByDay(shown)}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          <EmptyState
            title="No workouts yet"
            message="Finished workouts and cardio sessions appear here by date. Start one from the Train tab."
          />
        }
        renderSectionHeader={({ section }) => (
          <Text variant="caption" tone="textMuted" accessibilityRole="header" style={styles.day}>
            {section.title}
          </Text>
        )}
        ItemSeparatorComponent={() => (
          <View style={{ backgroundColor: colors.surface }}>
            <View style={[styles.separator, { backgroundColor: colors.separator }]} />
          </View>
        )}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: colors.surface }}>
            <ListRow {...rowText(item)} showChevron onPress={() => open(item)} />
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    padding: screenPadding,
    gap: spacing.lg,
  },
  filter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: screenPadding,
  },
  filterText: { flex: 1 },
  day: {
    paddingHorizontal: screenPadding,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: screenPadding,
  },
});
