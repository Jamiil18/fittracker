import { TextField, type TextFieldProps } from './TextField';

type NumberFieldProps = Omit<TextFieldProps, 'keyboardType' | 'inputMode' | 'suffix'> & {
  unit?: string;
  // Counts such as sets and reps get a keypad without a decimal point.
  wholeNumber?: boolean;
};

// The value stays a string so the form can show exactly what was typed; zod
// schemas parse it into a number when the form is submitted.
export function NumberField({ unit, wholeNumber = false, ...fieldProps }: NumberFieldProps) {
  return (
    <TextField
      keyboardType={wholeNumber ? 'number-pad' : 'decimal-pad'}
      inputMode={wholeNumber ? 'numeric' : 'decimal'}
      selectTextOnFocus
      suffix={unit}
      {...fieldProps}
    />
  );
}
