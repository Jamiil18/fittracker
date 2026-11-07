import { render, screen } from '@testing-library/react-native';

import { ResetPasswordScreen } from './ResetPasswordScreen';
import { VerifyEmailScreen } from './VerifyEmailScreen';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), dismissTo: jest.fn() }),
  useLocalSearchParams: () => ({ email: 'lifter@example.com' }),
}));
jest.mock('../api/auth', () => ({}));
jest.mock('./SessionProvider', () => ({
  useSession: () => ({ setResettingPassword: jest.fn() }),
}));

// Codes from the app's Gmail sender can be filtered as spam, so both screens
// that wait for one say where else to look.
describe('screens that wait for an emailed code', () => {
  it('tell people to check spam when verifying an email', async () => {
    await render(<VerifyEmailScreen />);

    expect(
      screen.getByText(
        "Enter the 6-digit code we sent to lifter@example.com. If it isn't in your inbox, check your spam folder.",
      ),
    ).toBeOnTheScreen();
  });

  it('tell people to check spam when resetting a password', async () => {
    await render(<ResetPasswordScreen />);

    expect(
      screen.getByText(
        "Enter the 6-digit code we sent to lifter@example.com, then choose a new password. If it isn't in your inbox, check your spam folder.",
      ),
    ).toBeOnTheScreen();
  });
});
