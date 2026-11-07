import { niceTicks } from './chartScale';

describe('niceTicks', () => {
  it('covers the data with round steps', () => {
    expect(niceTicks(82, 108)).toEqual([80, 90, 100, 110]);
    expect(niceTicks(0, 1000)).toEqual([0, 500, 1000]);
    expect(niceTicks(1.2, 1.9)).toEqual([1, 1.5, 2]);
  });

  it('gives a flat series a range around its value', () => {
    const ticks = niceTicks(100, 100);
    expect(ticks[0]).toBeLessThan(100);
    expect(ticks[ticks.length - 1]).toBeGreaterThan(100);
  });

  it('returns nothing for values that are not numbers', () => {
    expect(niceTicks(Number.NaN, 1)).toEqual([]);
  });
});
