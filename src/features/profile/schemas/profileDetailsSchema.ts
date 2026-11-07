import { z } from 'zod';

import { parseDecimalInput, type DistanceUnit } from '@/lib/units';

import { centimetresFrom, feetAndInches } from '../utils/profileDetails';

// The limits match the checks on the profiles table.
export const maxNameLength = 40;
const minHeightCm = 100;
const maxHeightCm = 250;

// Optional; an empty name is saved as no name. Used by Edit profile and onboarding.
export const nameSchema = z
  .string()
  .trim()
  .max(maxNameLength, `Use ${maxNameLength} characters or fewer.`);

// What a HeightField holds: centimetres, or feet and inches when distances
// are in miles. Only the fields for the current distance unit are read.
export const heightInputSchema = z.object({
  cm: z.string().trim(),
  feet: z.string().trim(),
  inches: z.string().trim(),
});

export type HeightInput = z.input<typeof heightInputSchema>;

// A HeightField's starting values for a saved height, in both forms.
export function heightInputFrom(heightCm: number | null): HeightInput {
  if (heightCm === null) return { cm: '', feet: '', inches: '' };
  const { feet, inches } = feetAndInches(heightCm);
  return { cm: String(heightCm), feet: String(feet), inches: String(inches) };
}

function parseHeight(
  height: HeightInput,
  distanceUnit: DistanceUnit,
  savedHeightCm: number | null,
): number | null {
  if (distanceUnit === 'km') return height.cm === '' ? null : (parseDecimalInput(height.cm) ?? NaN);
  if (height.feet === '' && height.inches === '') return null;
  const feet = /^\d+$/.test(height.feet) ? Number(height.feet) : null;
  const inches =
    height.inches === '' ? 0 : /^\d+$/.test(height.inches) ? Number(height.inches) : null;
  if (feet === null || inches === null || inches > 11) return NaN;
  // Feet and inches round to the nearest inch, so converting them back would
  // turn a saved 180 cm into 180.3 cm on every save. While they still show the
  // saved height, the saved centimetres are kept. The comparison is with the
  // profile itself, not with a copy carried in the form's values, so a height
  // the user didn't touch can't change however the form handles its values.
  if (savedHeightCm !== null) {
    const saved = feetAndInches(savedHeightCm);
    if (saved.feet === feet && saved.inches === inches) return savedHeightCm;
  }
  return centimetresFrom(feet, inches);
}

// The typed height in centimetres, or null when it was left empty. A height
// outside the allowed range adds its message to the form's `height` field.
// `savedHeightCm` is the height already on the profile, if there is one.
export function checkedHeightCm(
  height: HeightInput,
  distanceUnit: DistanceUnit,
  context: z.RefinementCtx,
  savedHeightCm: number | null = null,
): number | null {
  const heightCm = parseHeight(height, distanceUnit, savedHeightCm);
  if (heightCm === null || (heightCm >= minHeightCm && heightCm <= maxHeightCm)) return heightCm;
  context.addIssue({
    code: 'custom',
    path: ['height'],
    message:
      distanceUnit === 'km'
        ? `Height must be from ${minHeightCm} to ${maxHeightCm} cm.`
        : 'Height must be from 3 ft 4 in to 8 ft 2 in.',
  });
  return null;
}

const sexSchema = z.enum(['female', 'male']).nullable();

// The Edit profile form. Height is saved in centimetres whichever way it was
// typed; `savedHeightCm` is the profile's height when the form opened.
export function createProfileDetailsSchema(
  distanceUnit: DistanceUnit,
  savedHeightCm: number | null,
) {
  return z
    .object({
      name: nameSchema,
      // YYYY-MM-DD from the date picker, or null when not set.
      dateOfBirth: z.iso.date().nullable(),
      height: heightInputSchema,
      sex: sexSchema,
    })
    .transform((values, context) => ({
      displayName: values.name === '' ? null : values.name,
      dateOfBirth: values.dateOfBirth,
      heightCm: checkedHeightCm(values.height, distanceUnit, context, savedHeightCm),
      sex: values.sex,
    }));
}

type ProfileDetailsSchema = ReturnType<typeof createProfileDetailsSchema>;
export type ProfileDetailsInput = z.input<ProfileDetailsSchema>;
export type ProfileDetails = z.output<ProfileDetailsSchema>;
