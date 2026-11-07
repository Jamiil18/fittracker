import {
  ageOn,
  bodyMassIndex,
  centimetresFrom,
  feetAndInches,
  formatHeight,
  initials,
} from './profileDetails';

describe('initials', () => {
  it('takes the first and last word', () => {
    expect(initials('Jamiil Nohur')).toBe('JN');
    expect(initials('  sam  ')).toBe('S');
    expect(initials('Anna Maria Lopez')).toBe('AL');
    expect(initials(null)).toBe('');
  });
});

describe('ageOn', () => {
  it('counts the birthday on the day itself', () => {
    expect(ageOn('2002-03-14', new Date(2026, 2, 13))).toBe(23);
    expect(ageOn('2002-03-14', new Date(2026, 2, 14))).toBe(24);
    expect(ageOn('2002-03-14', new Date(2026, 9, 9))).toBe(24);
  });
});

describe('height', () => {
  it('shows centimetres or feet and inches', () => {
    expect(formatHeight(178, 'km')).toBe('178 cm');
    expect(formatHeight(178, 'mi')).toBe('5 ft 10 in');
  });

  it('converts between feet and inches and centimetres', () => {
    expect(feetAndInches(182.9)).toEqual({ feet: 6, inches: 0 });
    expect(centimetresFrom(5, 10)).toBe(177.8);
  });
});

describe('bodyMassIndex', () => {
  it('divides weight by height squared', () => {
    expect(bodyMassIndex(81.4, 178)).toBe(25.7);
  });
});
