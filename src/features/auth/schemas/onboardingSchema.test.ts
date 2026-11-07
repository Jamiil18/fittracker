import { onboardingSchema, type OnboardingInput } from './onboardingSchema';

const base: OnboardingInput = {
  name: '',
  weightUnit: 'kg',
  distanceUnit: 'km',
  bodyweight: '',
  height: { cm: '', feet: '', inches: '' },
};

function firstError(input: Partial<OnboardingInput>) {
  const result = onboardingSchema.safeParse({ ...base, ...input });
  return result.success ? undefined : result.error.issues[0]?.message;
}

describe('onboardingSchema', () => {
  it('needs nothing but the units', () => {
    expect(onboardingSchema.parse(base)).toEqual({
      displayName: null,
      weightUnit: 'kg',
      distanceUnit: 'km',
      bodyweightKg: null,
      heightCm: null,
    });
  });

  it('trims the name and stores bodyweight and height in metric', () => {
    expect(
      onboardingSchema.parse({
        ...base,
        name: '  Jamiil ',
        weightUnit: 'lb',
        bodyweight: '180',
        height: { cm: '', feet: '5', inches: '10' },
        distanceUnit: 'mi',
      }),
    ).toEqual({
      displayName: 'Jamiil',
      weightUnit: 'lb',
      distanceUnit: 'mi',
      bodyweightKg: 81.65,
      heightCm: 177.8,
    });
  });

  it('reads the height in the distance unit chosen on the same screen', () => {
    const typed = { cm: '178', feet: '', inches: '' };
    expect(onboardingSchema.parse({ ...base, height: typed }).heightCm).toBe(178);
    expect(onboardingSchema.parse({ ...base, distanceUnit: 'mi', height: typed }).heightCm).toBe(
      null,
    );
  });

  it('uses the same limits as the body log and Edit profile', () => {
    expect(firstError({ bodyweight: '12' })).toBe('Bodyweight must be from 20 to 400 kg.');
    expect(firstError({ weightUnit: 'lb', bodyweight: '1000' })).toBe(
      'Bodyweight must be from 44 to 881 lb.',
    );
    expect(firstError({ height: { cm: '95', feet: '', inches: '' } })).toBe(
      'Height must be from 100 to 250 cm.',
    );
    expect(firstError({ name: 'a'.repeat(41) })).toBe('Use 40 characters or fewer.');
  });
});
