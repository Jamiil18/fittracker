import { toLocalDateString } from './dates';

describe('toLocalDateString', () => {
  it('formats the local calendar date with leading zeros', () => {
    expect(toLocalDateString(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
    expect(toLocalDateString(new Date(2026, 9, 31, 0, 5))).toBe('2026-10-31');
  });
});
