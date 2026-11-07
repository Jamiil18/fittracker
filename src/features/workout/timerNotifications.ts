import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { logger } from '@/lib/logger';

const channelId = 'timers';

// Run once when the signed-in app starts. Timer notifications are for when the
// app is in the background; while it is open the timer is on screen and the
// phone vibrates instead, so they aren't shown then.
export async function setUpTimerNotifications(): Promise<void> {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS !== 'android') return;
  try {
    // High importance so "Rest over" appears on screen and makes a sound.
    await Notifications.setNotificationChannelAsync(channelId, {
      name: 'Workout timers',
      description:
        'Tells you when rest or a timed set is over while FitTracker is in the background.',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 150, 250],
    });
  } catch (error) {
    logger.error('create timer channel', error);
  }
}

export type NotificationPermission = 'granted' | 'ask' | 'denied';

// "ask" means the system prompt can still be shown; "denied" means only the
// phone's settings can turn notifications on.
export async function notificationPermission(): Promise<NotificationPermission> {
  try {
    const { granted, canAskAgain } = await Notifications.getPermissionsAsync();
    if (granted) return 'granted';
    return canAskAgain ? 'ask' : 'denied';
  } catch (error) {
    logger.error('read notification permission', error);
    return 'denied';
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  try {
    await Notifications.requestPermissionsAsync();
  } catch (error) {
    logger.error('request notification permission', error);
  }
  return notificationPermission();
}

// Schedules the "time's up" notification for a timer. Returns its id, or null
// if it couldn't be scheduled; the timer on screen still works either way.
export async function scheduleTimerNotification(
  kind: 'rest' | 'set',
  endsAt: number,
): Promise<string | null> {
  try {
    return await Notifications.scheduleNotificationAsync({
      content:
        kind === 'rest'
          ? { title: 'Rest over', body: 'Time for your next set.' }
          : { title: "Time's up", body: 'Your timed set is complete.' },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: endsAt,
        channelId,
      },
    });
  } catch (error) {
    logger.error('schedule timer notification', error);
    return null;
  }
}

export async function cancelTimerNotification(id: string | null): Promise<void> {
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch (error) {
    logger.error('cancel timer notification', error);
  }
}
