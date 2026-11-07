import { act, render, screen } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { NotificationNotice } from './NotificationNotice';

const mockPermission = jest.fn();
jest.mock('../timerNotifications', () => ({
  notificationPermission: () => mockPermission(),
  requestNotificationPermission: () => mockPermission(),
}));

const notice = 'Notifications are off, so rest timers only alert you while FitTracker is open.';

describe('NotificationNotice', () => {
  it('goes away when notifications are turned on in settings and the user comes back', async () => {
    const appStateListeners: ((status: AppStateStatus) => void)[] = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      appStateListeners.push(listener);
      return { remove: () => undefined };
    });
    mockPermission.mockResolvedValue('denied');
    await render(<NotificationNotice />);

    expect(await screen.findByText(notice)).toBeOnTheScreen();

    mockPermission.mockResolvedValue('granted');
    await act(async () => {
      appStateListeners.forEach((listener) => listener('background'));
      appStateListeners.forEach((listener) => listener('active'));
    });

    expect(screen.queryByText(notice)).not.toBeOnTheScreen();
  });
});
