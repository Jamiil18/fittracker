import { millisecondsLeft, secondsLeft } from './sessionTimer';

// A 5 second timer started at 10 000 ms.
const timer = { startedAt: 10_000, endsAt: 15_000 };

describe('secondsLeft', () => {
  it('shows the full time when the clock reading is from just before the start', () => {
    expect(secondsLeft(timer, 9_600)).toBe(5);
    expect(millisecondsLeft(timer, 9_600)).toBe(5_000);
  });

  it('shows the full time at the moment it starts', () => {
    expect(secondsLeft(timer, 10_000)).toBe(5);
  });

  it('rounds part of a second up', () => {
    expect(secondsLeft(timer, 10_400)).toBe(5);
    expect(secondsLeft(timer, 11_000)).toBe(4);
    expect(secondsLeft(timer, 14_999)).toBe(1);
  });

  it('reaches 0 exactly at the end and stays there', () => {
    expect(secondsLeft(timer, 15_000)).toBe(0);
    expect(secondsLeft(timer, 20_000)).toBe(0);
    expect(millisecondsLeft(timer, 20_000)).toBe(0);
  });
});
