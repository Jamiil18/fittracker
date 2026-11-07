import {
  createProfileDetailsSchema,
  heightInputFrom,
  type ProfileDetailsInput,
} from './profileDetailsSchema';

const empty: ProfileDetailsInput = {
  name: '',
  dateOfBirth: null,
  height: { cm: '', feet: '', inches: '' },
  sex: null,
};

describe('createProfileDetailsSchema', () => {
  it('saves nothing for empty fields', () => {
    expect(createProfileDetailsSchema('km', null).parse(empty)).toEqual({
      displayName: null,
      dateOfBirth: null,
      heightCm: null,
      sex: null,
    });
  });

  it('trims the name and reads height in centimetres', () => {
    expect(
      createProfileDetailsSchema('km', null).parse({
        ...empty,
        name: '  Jamiil ',
        height: { ...empty.height, cm: '178,5' },
        dateOfBirth: '2002-03-14',
        sex: 'male',
      }),
    ).toEqual({ displayName: 'Jamiil', dateOfBirth: '2002-03-14', heightCm: 178.5, sex: 'male' });
  });

  it('reads height in feet and inches when distances are in miles', () => {
    const parsed = createProfileDetailsSchema('mi', null).parse({
      ...empty,
      height: { cm: '', feet: '5', inches: '10' },
    });
    expect(parsed.heightCm).toBe(177.8);
  });

  it('keeps a saved height in centimetres when the feet and inches are left as they were', () => {
    const schema = createProfileDetailsSchema('mi', 180);
    expect(schema.parse({ ...empty, height: heightInputFrom(180) }).heightCm).toBe(180);
    // Decided from the saved profile, even if the form's values carry no
    // centimetres at all.
    expect(schema.parse({ ...empty, height: { cm: '', feet: '5', inches: '11' } }).heightCm).toBe(
      180,
    );
    expect(
      schema.parse({ ...empty, height: { ...heightInputFrom(180), inches: '10' } }).heightCm,
    ).toBe(177.8);
  });

  it('rejects a height outside 100 to 250 cm, or more than 11 inches', () => {
    const km = createProfileDetailsSchema('km', null).safeParse({
      ...empty,
      height: { ...empty.height, cm: '95' },
    });
    expect(km.error?.issues[0]).toMatchObject({
      path: ['height'],
      message: 'Height must be from 100 to 250 cm.',
    });
    const mi = createProfileDetailsSchema('mi', null).safeParse({
      ...empty,
      height: { cm: '', feet: '5', inches: '12' },
    });
    expect(mi.error?.issues[0]?.message).toBe('Height must be from 3 ft 4 in to 8 ft 2 in.');
  });

  it('limits the name to 40 characters', () => {
    expect(
      createProfileDetailsSchema('km', null).safeParse({ ...empty, name: 'a'.repeat(41) }).success,
    ).toBe(false);
  });

  it('fills the height field in both units from a saved height', () => {
    expect(heightInputFrom(177.8)).toEqual({ cm: '177.8', feet: '5', inches: '10' });
    expect(heightInputFrom(null)).toEqual({ cm: '', feet: '', inches: '' });
  });
});
