import { render, screen } from '@testing-library/react-native';

import { RestTimerBar } from './RestTimerBar';

jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(async () => 'n1'),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => undefined),
  notificationAsync: jest.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
}));

describe('RestTimerBar', () => {
  it('first shows exactly the rest time when the clock reading is from just before it started', async () => {
    const startedAt = 1_000_400;
    await render(
      <RestTimerBar
        timer={{
          kind: 'rest',
          exerciseKey: 'bench',
          setKey: null,
          startedAt,
          endsAt: startedAt + 120_000,
          notificationId: null,
        }}
        now={startedAt - 400}
      />,
    );

    expect(screen.getByText('2:00')).toBeOnTheScreen();
    expect(screen.queryByText('2:01')).not.toBeOnTheScreen();
    expect(screen.getByLabelText('Rest, 120 seconds left')).toBeOnTheScreen();
  });
});
