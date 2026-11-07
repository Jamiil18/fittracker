import { DatePicker, Host } from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  datePickerStyle,
  environment,
  labelsHidden,
  tint,
} from '@expo/ui/swift-ui/modifiers';

import { toLocalDateString } from '@/lib/dates';
import { useTheme } from '@/theme/useTheme';

import type { DateButtonProps } from './DateButton';

// The native iOS compact date button, limited to the given range.
export function DateButton({ value, onChange, minimumDate, maximumDate, label }: DateButtonProps) {
  const { colors, scheme } = useTheme();
  const [year, month, day] = (value ?? toLocalDateString(maximumDate)).split('-').map(Number);
  return (
    <Host matchContents>
      <DatePicker
        selection={new Date(year ?? 2000, (month ?? 1) - 1, day ?? 1)}
        range={{ start: minimumDate, end: maximumDate }}
        displayedComponents={['date']}
        onDateChange={(date) => onChange(toLocalDateString(date))}
        modifiers={[
          datePickerStyle('compact'),
          labelsHidden(),
          tint(colors.accent),
          environment('colorScheme', scheme),
          accessibilityLabel(label),
        ]}
      />
    </Host>
  );
}
