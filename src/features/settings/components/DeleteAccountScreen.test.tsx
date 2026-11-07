import { fireEvent, render, screen } from '@testing-library/react-native';

import { AppError } from '@/lib/errors';

import { deleteAccount } from '../api/deleteAccount';
import { DeleteAccountScreen } from './DeleteAccountScreen';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/lib/useIsOffline', () => ({ useIsOffline: () => false }));
jest.mock('../api/deleteAccount', () => ({ deleteAccount: jest.fn() }));

async function submitPassword(password: string) {
  await render(<DeleteAccountScreen />);
  await fireEvent.changeText(screen.getByLabelText('Password'), password);
  await fireEvent.press(screen.getByRole('button', { name: 'Delete account' }));
}

// The dialog's "Delete account" comes after the screen's own button.
function confirmButton() {
  const button = screen.getAllByRole('button', { name: 'Delete account' }).at(-1);
  if (!button) throw new Error('The confirmation is not showing');
  return button;
}

describe('DeleteAccountScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('asks for the password before anything else', async () => {
    await submitPassword('');

    expect(await screen.findByText('Enter your password.')).toBeTruthy();
    expect(screen.queryByText('Delete your account?')).toBeNull();
  });

  it('deletes only after the confirmation', async () => {
    jest.mocked(deleteAccount).mockResolvedValue();
    await submitPassword('correct horse');

    expect(await screen.findByText('Delete your account?')).toBeTruthy();
    expect(deleteAccount).not.toHaveBeenCalled();

    await fireEvent.press(confirmButton());
    expect(deleteAccount).toHaveBeenCalledWith('correct horse');
  });

  it('shows a wrong password', async () => {
    jest.mocked(deleteAccount).mockRejectedValue(new AppError('wrong_current_password'));
    await submitPassword('wrong');
    await screen.findByText('Delete your account?');
    await fireEvent.press(confirmButton());

    expect(
      await screen.findByText("Your current password isn't right. Check it and try again."),
    ).toBeTruthy();
  });
});
