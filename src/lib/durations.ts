// Seconds as m:ss, the way rest times and timed sets are shown: 90 is "1:30",
// 45 is "0:45". An hour or more becomes h:mm:ss.
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secondsPart = String(seconds % 60).padStart(2, '0');
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${secondsPart}`;
  return `${minutes}:${secondsPart}`;
}
