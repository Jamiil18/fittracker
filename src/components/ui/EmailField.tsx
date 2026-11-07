import { TextField, type TextFieldProps } from './TextField';

type EmailFieldProps = Omit<
  TextFieldProps,
  | 'keyboardType'
  | 'autoCapitalize'
  | 'autoComplete'
  | 'autoCorrect'
  | 'spellCheck'
  | 'textContentType'
>;

// Autocorrect and spell check are off: they would "fix" addresses, and on iOS
// their suggestion bar keeps swapping with AutoFill suggestions while typing,
// which changes the keyboard height and makes the screen jump.
export function EmailField(fieldProps: EmailFieldProps) {
  return (
    <TextField
      keyboardType="email-address"
      autoCapitalize="none"
      autoComplete="email"
      autoCorrect={false}
      spellCheck={false}
      textContentType="emailAddress"
      {...fieldProps}
    />
  );
}
