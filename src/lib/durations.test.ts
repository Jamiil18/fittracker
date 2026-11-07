import { formatDuration } from './durations';

describe('formatDuration', () => {
  it('shows minutes and two-digit seconds', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(45)).toBe('0:45');
    expect(formatDuration(90)).toBe('1:30');
    expect(formatDuration(900)).toBe('15:00');
  });

  it('adds hours from an hour upwards', () => {
    expect(formatDuration(3600)).toBe('1:00:00');
    expect(formatDuration(3725)).toBe('1:02:05');
  });

  it('rounds fractions and never goes below zero', () => {
    expect(formatDuration(59.6)).toBe('1:00');
    expect(formatDuration(-5)).toBe('0:00');
  });
});
