import { render, screen, userEvent } from '@testing-library/react-native';

import { AppError } from '@/lib/errors';

import { resendSignUpCode, signIn } from '../api/auth';
import { SignInScreen } from './SignInScreen';

jest.mock('../api/auth', () => ({
  signIn: jest.fn(),
  resendSignUpCode: jest.fn(),
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const signInMock = signIn as jest.Mock;
const resendMock = resendSignUpCode as jest.Mock;

async function fillAndSubmit(email: string, password: string) {
  const user = userEvent.setup();
  await render(<SignInScreen />);
  await user.type(screen.getByLabelText('Email'), email);
  await user.type(screen.getByLabelText('Password'), password);
  await user.press(screen.getByRole('button', { name: 'Sign in' }));
}

describe('SignInScreen', () => {
  // clearAllMocks keeps the NetInfo mock's default answer; resetAllMocks
  // would wipe it.
  beforeEach(() => jest.clearAllMocks());

  it('explains what is missing instead of submitting an empty form', async () => {
    const user = userEvent.setup();
    await render(<SignInScreen />);

    await user.press(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Enter your email address.')).toBeOnTheScreen();
    expect(screen.getByText('Enter your password.')).toBeOnTheScreen();
    expect(signInMock).not.toHaveBeenCalled();
  });

  it('signs in with the cleaned-up email', async () => {
    signInMock.mockResolvedValue(undefined);

    await fillAndSubmit(' Lifter@Example.com ', 'correct horse');

    expect(signInMock).toHaveBeenCalledWith({
      email: 'lifter@example.com',
      password: 'correct horse',
    });
  });

  it('shows a plain message when the details are wrong', async () => {
    signInMock.mockRejectedValue(new AppError('invalid_credentials'));

    await fillAndSubmit('lifter@example.com', 'wrong password');

    expect(
      await screen.findByText("That email and password don't match. Check them and try again."),
    ).toBeOnTheScreen();
  });

  it('treats a short password like any wrong password, without mentioning length', async () => {
    signInMock.mockRejectedValue(new AppError('invalid_credentials'));

    await fillAndSubmit('lifter@example.com', 'abc');

    expect(signInMock).toHaveBeenCalledWith({ email: 'lifter@example.com', password: 'abc' });
    expect(
      await screen.findByText("That email and password don't match. Check them and try again."),
    ).toBeOnTheScreen();
    expect(screen.queryByText(/8 characters/)).not.toBeOnTheScreen();
  });

  it('removes the message when a field is edited, so the next failure is noticeable', async () => {
    signInMock.mockRejectedValue(new AppError('invalid_credentials'));
    const message = "That email and password don't match. Check them and try again.";
    await fillAndSubmit('lifter@example.com', 'wrong password');
    expect(await screen.findByText(message)).toBeOnTheScreen();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Password'), '1');
    expect(screen.queryByText(message)).not.toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText(message)).toBeOnTheScreen();
  });

  it('sends a new code and opens the code screen for an unverified account', async () => {
    signInMock.mockRejectedValue(new AppError('email_not_confirmed'));
    resendMock.mockResolvedValue(undefined);

    await fillAndSubmit('lifter@example.com', 'correct horse');

    expect(resendMock).toHaveBeenCalledWith('lifter@example.com');
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/verify-email',
      params: { email: 'lifter@example.com' },
    });
  });
});
