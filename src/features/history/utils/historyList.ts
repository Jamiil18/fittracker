import type { CardioSession } from '@/features/cardio/api/cardio';

import type { PastWorkout } from '../schemas/historySchemas';
import { dayKey, dayTitle } from './historyDates';

// A row in History: a workout or a cardio session, saved or still waiting to
// sync. `id` and `startedAt` let the list sort and group both kinds alike.
export type HistoryItem =
  | { kind: 'workout'; id: string; startedAt: number; workout: PastWorkout; pending: boolean }
  | { kind: 'cardio'; id: string; startedAt: number; cardio: CardioSession; pending: boolean };

export function workoutItem(workout: PastWorkout, pending: boolean): HistoryItem {
  return { kind: 'workout', id: workout.id, startedAt: workout.startedAt, workout, pending };
}

export function cardioItem(cardio: CardioSession, pending: boolean): HistoryItem {
  return { kind: 'cardio', id: cardio.id, startedAt: cardio.startedAt, cardio, pending };
}

type HistorySection = { key: string; title: string; data: HistoryItem[] };

// Newest first, grouped under a heading per day ("Sun 28 Sep").
export function groupByDay(items: HistoryItem[], now = Date.now()): HistorySection[] {
  const sorted = [...items].sort((a, b) => b.startedAt - a.startedAt);
  const sections: HistorySection[] = [];
  for (const item of sorted) {
    const key = dayKey(item.startedAt);
    const last = sections[sections.length - 1];
    if (last?.key === key) last.data.push(item);
    else sections.push({ key, title: dayTitle(item.startedAt, now), data: [item] });
  }
  return sections;
}

// The days with at least one workout or session, for the calendar's dots.
export function trainedDays(items: HistoryItem[]): Set<string> {
  return new Set(items.map((item) => dayKey(item.startedAt)));
}
