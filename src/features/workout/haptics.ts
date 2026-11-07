import * as Haptics from 'expo-haptics';

import { logger } from '@/lib/logger';

// A light tap when a set is ticked.
export function setCompletedHaptic(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch((error: unknown) =>
    logger.error('set haptic', error),
  );
}

// A stronger pattern when rest or a timed set is over, felt with the phone in
// a pocket or on the floor.
export function timerEndedHaptic(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch((error: unknown) =>
    logger.error('timer haptic', error),
  );
}

// When a set can't be ticked because a value is missing.
export function setRejectedHaptic(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch((error: unknown) =>
    logger.error('warning haptic', error),
  );
}
