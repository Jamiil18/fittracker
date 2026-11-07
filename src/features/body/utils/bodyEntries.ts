import type { BodyEntry, BodyLogPayload } from '../schemas/bodySchemas';

// A day's bodyweight, and whether it is still waiting to sync.
type ShownEntry = { entry: BodyEntry; pending: boolean };

// Saved days with the logs still in the outbox applied on top, the way the
// server will apply them: a later log for a day replaces that day's
// bodyweight. Newest day first.
export function mergeBodyEntries(saved: BodyEntry[], pending: BodyLogPayload[]): ShownEntry[] {
  const byDay = new Map<string, ShownEntry>(
    saved.map((entry) => [entry.measured_on, { entry, pending: false }]),
  );
  for (const log of pending) byDay.set(log.measured_on, { entry: log, pending: true });
  return [...byDay.values()].sort((a, b) => b.entry.measured_on.localeCompare(a.entry.measured_on));
}

// Bodyweight per day from `sinceKey` (YYYY-MM-DD) on, oldest first, for the trend chart.
export function weightSeries(entries: ShownEntry[], sinceKey: string) {
  return entries
    .filter((item) => item.entry.measured_on >= sinceKey)
    .map((item) => ({ measuredOn: item.entry.measured_on, weightKg: item.entry.weight_kg }))
    .reverse();
}
