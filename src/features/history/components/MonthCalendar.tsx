import { Pressable, StyleSheet, View } from 'react-native';

import { IconButton } from '@/components/ui/IconButton';
import { Text } from '@/components/ui/Text';
import { toLocalDateString } from '@/lib/dates';
import { minTouchTarget, radius, screenPadding, spacing } from '@/theme/layout';
import { useTheme } from '@/theme/useTheme';

import { monthGrid, monthTitle, spokenDate, weekdayLetters } from '../utils/historyDates';

type MonthCalendarProps = {
  year: number;
  month: number;
  trainedDays: ReadonlySet<string>;
  selectedDay: string | null;
  onSelectDay: (day: string) => void;
  onChangeMonth: (delta: -1 | 1) => void;
};

// A month of days, Monday first, with a dot under each day trained. Trained
// days can be tapped to show only that day's workouts.
export function MonthCalendar({
  year,
  month,
  trainedDays,
  selectedDay,
  onSelectDay,
  onChangeMonth,
}: MonthCalendarProps) {
  const { colors } = useTheme();
  const today = toLocalDateString(new Date());

  return (
    <View style={styles.calendar}>
      <View style={styles.header}>
        <IconButton
          icon="chevron-back"
          accessibilityLabel="Previous month"
          onPress={() => onChangeMonth(-1)}
        />
        <Text variant="bodyStrong" accessibilityRole="header">
          {monthTitle(year, month)}
        </Text>
        <IconButton
          icon="chevron-forward"
          accessibilityLabel="Next month"
          onPress={() => onChangeMonth(1)}
        />
      </View>
      <View style={styles.week} importantForAccessibility="no-hide-descendants">
        {weekdayLetters.map((letter, index) => (
          <Text key={index} variant="caption" tone="textMuted" style={styles.weekday}>
            {letter}
          </Text>
        ))}
      </View>
      {monthGrid(year, month).map((week, weekIndex) => (
        <View key={weekIndex} style={styles.week}>
          {week.map((day, dayIndex) => {
            if (!day) return <View key={dayIndex} style={styles.cell} />;
            const trained = trainedDays.has(day);
            const selected = day === selectedDay;
            return (
              <Pressable
                key={day}
                disabled={!trained}
                onPress={() => onSelectDay(day)}
                accessibilityRole="button"
                accessibilityLabel={`${spokenDate(day)}${trained ? ', trained' : ''}`}
                accessibilityState={{ selected, disabled: !trained }}
                style={[styles.cell, selected && { borderColor: colors.accent, borderWidth: 2 }]}
              >
                <Text
                  variant={day === today ? 'bodyStrong' : 'body'}
                  tone={trained ? 'text' : 'textMuted'}
                >
                  {Number(day.slice(8))}
                </Text>
                <View
                  style={[styles.dot, { backgroundColor: trained ? colors.accent : 'transparent' }]}
                />
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  calendar: {
    paddingHorizontal: screenPadding - spacing.sm,
    paddingBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  week: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center' },
  cell: {
    flex: 1,
    minHeight: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 2,
  },
});
