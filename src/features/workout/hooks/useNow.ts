import { useEffect, useState } from 'react';

// The current time, updated every `intervalMs` while `active`. Only used to
// redraw timers: their values always come from stored start and end times,
// never from counting these updates.
export function useNow(intervalMs: number, active = true): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(interval);
  }, [intervalMs, active]);
  return now;
}
