import {
  formatDistance,
  formatWeight,
  fromKilograms,
  fromMetres,
  parseDecimalInput,
  roundTo,
  toKilograms,
  toMetres,
} from './units';

describe('weight conversion', () => {
  it('leaves kilograms unchanged', () => {
    expect(toKilograms(81.4, 'kg')).toBe(81.4);
    expect(fromKilograms(81.4, 'kg')).toBe(81.4);
  });

  it('converts pounds using the exact definition', () => {
    expect(toKilograms(1, 'lb')).toBe(0.45359237);
    expect(roundTo(toKilograms(225, 'lb'), 3)).toBe(102.058);
  });

  it('round-trips pounds through the stored kilogram value', () => {
    // The database keeps 2 decimals for bodyweight and 3 for lifted weights.
    for (const pounds of [100, 180, 225, 315.5]) {
      const storedForBodyweight = roundTo(toKilograms(pounds, 'lb'), 2);
      expect(roundTo(fromKilograms(storedForBodyweight, 'lb'), 1)).toBe(pounds);
    }
  });
});

describe('roundTo', () => {
  it('rounds to the given number of decimals', () => {
    expect(roundTo(81.456, 2)).toBe(81.46);
    expect(roundTo(81.454, 2)).toBe(81.45);
    expect(roundTo(81.5, 0)).toBe(82);
  });
});

describe('parseDecimalInput', () => {
  it.each([
    ['81.4', 81.4],
    ['81,4', 81.4],
    [' 80 ', 80],
    ['0.5', 0.5],
  ])('reads "%s" as %d', (text, expected) => {
    expect(parseDecimalInput(text)).toBe(expected);
  });

  it.each(['', 'abc', '81.4.2', '-5', '1e3', '.5', '81.'])('rejects "%s"', (text) => {
    expect(parseDecimalInput(text)).toBeNull();
  });
});

describe('formatWeight', () => {
  it("shows a stored weight in the user's unit without a trailing .0", () => {
    expect(formatWeight(60, 'kg')).toBe('60 kg');
    expect(formatWeight(62.5, 'kg')).toBe('62.5 kg');
    expect(formatWeight(61.235, 'lb')).toBe('135 lb');
    expect(formatWeight(7420, 'kg')).toBe('7,420 kg');
  });
});

describe('distance conversion', () => {
  it('converts kilometres and miles to metres and back', () => {
    expect(toMetres(5, 'km')).toBe(5000);
    expect(toMetres(1, 'mi')).toBe(1609.344);
    expect(fromMetres(1609.344, 'mi')).toBe(1);
  });

  it("shows a stored distance in the user's unit", () => {
    expect(formatDistance(5000, 'km')).toBe('5 km');
    expect(formatDistance(2414.016, 'mi')).toBe('1.5 mi');
  });
});
