import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme } from '@/theme/useTheme';

import { ListRow } from './ListRow';
import { Sheet } from './Sheet';

type SelectOption<Value extends string> = {
  value: Value;
  label: string;
};

type SelectSheetProps<Value extends string> = {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: readonly SelectOption<Value>[];
  selected: Value | null;
  onSelect: (value: Value | null) => void;
  // A first row that clears the choice, such as "All muscles". Leave it out
  // when a value is required.
  clearLabel?: string;
};

// A single-choice picker in a bottom sheet. Choosing closes the sheet.
export function SelectSheet<Value extends string>({
  visible,
  onClose,
  title,
  options,
  selected,
  onSelect,
  clearLabel,
}: SelectSheetProps<Value>) {
  const { colors } = useTheme();
  const tick = <Ionicons name="checkmark" size={22} color={colors.accent} />;

  function choose(value: Value | null) {
    onSelect(value);
    onClose();
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      {clearLabel ? (
        <ListRow
          title={clearLabel}
          onPress={() => choose(null)}
          trailing={selected === null ? tick : undefined}
          accessibilityState={{ selected: selected === null }}
        />
      ) : null}
      {options.map((option) => (
        <ListRow
          key={option.value}
          title={option.label}
          onPress={() => choose(option.value)}
          trailing={option.value === selected ? tick : undefined}
          accessibilityState={{ selected: option.value === selected }}
        />
      ))}
    </Sheet>
  );
}
