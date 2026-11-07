import { onlineManager } from '@tanstack/react-query';
import { render, screen, userEvent } from '@testing-library/react-native';

import { useOutbox } from '@/lib/outbox/outboxStore';

import { BodyLogScreen } from './BodyLogScreen';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
  useNavigation: () => ({ addListener: () => () => undefined, dispatch: jest.fn() }),
}));
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/features/auth/components/SessionProvider', () => ({
  useSession: () => ({ user: { id: '6f1c7a52-8d3e-4b0a-9c55-2e6f1d7b8a90' } }),
}));
jest.mock('@/features/settings/api/profile', () => ({
  useProfile: () => ({ data: { weightUnit: 'kg', distanceUnit: 'km' } }),
}));
jest.mock('@/lib/ids', () => ({ newId: () => 'log-1' }));

describe('BodyLogScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useOutbox.setState({ items: [] });
    // Offline, so the log stays in the outbox where the test can see it.
    onlineManager.setOnline(false);
  });
  afterEach(() => onlineManager.setOnline(true));

  it('puts the log in the outbox and closes, even offline', async () => {
    const user = userEvent.setup();
    await render(<BodyLogScreen />);

    await user.type(screen.getByLabelText('Bodyweight'), '81.4');
    await user.press(screen.getByRole('button', { name: 'Save log' }));

    expect(useOutbox.getState().items).toEqual([
      expect.objectContaining({
        id: 'log-1',
        kind: 'body',
        payload: expect.objectContaining({ weight_kg: 81.4 }),
      }),
    ]);
    expect(mockBack).toHaveBeenCalled();
  });

  it('asks for the bodyweight before saving', async () => {
    const user = userEvent.setup();
    await render(<BodyLogScreen />);

    await user.press(screen.getByRole('button', { name: 'Save log' }));

    expect(await screen.findByText('Enter your bodyweight.')).toBeOnTheScreen();
    expect(useOutbox.getState().items).toHaveLength(0);
  });
});
