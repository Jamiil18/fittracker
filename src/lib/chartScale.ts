// Round axis values for a chart, such as 80, 90, 100, 110, covering min to
// max. The step is 1, 2 or 5 times a power of ten, the steps people read
// easily, chosen to give about `count` ticks.
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  const low = Math.min(min, max);
  const high = Math.max(min, max);
  // A flat series still gets a small range, so its line sits mid-chart.
  const span = high - low || Math.abs(high) * 0.1 || 1;
  const rough = span / Math.max(1, count - 1);
  const power = 10 ** Math.floor(Math.log10(rough));
  const step =
    [1, 2, 5, 10].map((factor) => factor * power).find((candidate) => candidate >= rough) ??
    10 * power;
  const first = Math.floor((high === low ? low - span / 2 : low) / step) * step;
  const last = Math.ceil((high === low ? high + span / 2 : high) / step) * step;
  const ticks: number[] = [];
  for (let value = first; value <= last + step / 2; value += step) {
    ticks.push(Number(value.toFixed(10)));
  }
  return ticks;
}
