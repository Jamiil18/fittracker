import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { toLocalDateString } from '@/lib/dates';
import { minTouchTarget, spacing } from '@/theme/layout';
import { useTheme } from '@/theme/useTheme';

import { Text } from './Text';

export type DateButtonProps = {
  // YYYY-MM-DD, or null when not set.
  value: string | null;
  onChange: (date: string) => void;
  minimumDate: Date;
  maximumDate: Date;
  // Read out before the date, for example "Date of birth".
  label: string;
  // Shown for the date, for example "28 Sep 2026".
  formatDate: (date: Date) => string;
};

function dateFromKey(value: string | null, fallback: Date): Date {
  if (!value) return fallback;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year ?? 2000, (month ?? 1) - 1, day ?? 1);
}

// Android (and any platform without its own file): the date as an accent text
// button that opens the native calendar dialog. The dialog is only mounted
// while choosing, because it opens as soon as it appears. iOS uses
// DateButton.ios.tsx instead.
export function DateButton({
  value,
  onChange,
  minimumDate,
  maximumDate,
  label,
  formatDate,
}: DateButtonProps) {
  const { colors } = useTheme();
  const [isChoosing, setIsChoosing] = useState(false);
  const shown = value ? formatDate(dateFromKey(value, maximumDate)) : null;

  return (
    <>
      <Pressable
        onPress={() => setIsChoosing(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${shown ?? 'not set'}`}
        accessibilityHint="Opens a calendar to choose the date"
        style={styles.button}
      >
        <Text tone="accent">{shown ?? 'Choose'}</Text>
      </Pressable>
      {isChoosing ? (
        <DateTimePicker
          mode="date"
          presentation="dialog"
          value={dateFromKey(value, maximumDate)}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          accentColor={colors.accent}
          onValueChange={(_event, date) => {
            setIsChoosing(false);
            onChange(toLocalDateString(date));
          }}
          onDismiss={() => setIsChoosing(false)}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: minTouchTarget,
    justifyContent: 'center',
    paddingLeft: spacing.sm,
  },
});
