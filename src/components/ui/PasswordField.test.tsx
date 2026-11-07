import { render, screen, userEvent } from '@testing-library/react-native';

import { EmailField } from './EmailField';
import { PasswordField } from './PasswordField';

describe('PasswordField', () => {
  it('hides the password until asked to show it, then hides it again', async () => {
    const user = userEvent.setup();
    await render(<PasswordField label="Password" value="correct horse" />);

    const input = screen.getByLabelText('Password');
    expect(input.props.secureTextEntry).toBe(true);

    await user.press(screen.getByRole('button', { name: 'Show password' }));
    expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(false);

    await user.press(screen.getByRole('button', { name: 'Hide password' }));
    expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(true);
  });
});

describe('EmailField', () => {
  it('turns off autocorrect, spell check and capitals', async () => {
    await render(<EmailField label="Email" />);

    const input = screen.getByLabelText('Email');
    expect(input.props.autoCorrect).toBe(false);
    expect(input.props.spellCheck).toBe(false);
    expect(input.props.autoCapitalize).toBe('none');
    expect(input.props.keyboardType).toBe('email-address');
  });
});
