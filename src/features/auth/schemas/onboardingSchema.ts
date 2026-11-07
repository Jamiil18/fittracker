import { z } from 'zod';

import { parseBodyweight } from '@/features/body/schemas/bodySchemas';
import {
  checkedHeightCm,
  heightInputSchema,
  nameSchema,
} from '@/features/profile/schemas/profileDetailsSchema';
import { distanceUnitSchema, weightUnitSchema } from '@/features/settings/schemas/unitsSchema';

// The one onboarding screen. Everything but the units is optional, and the
// name, height and bodyweight follow the same rules as Edit profile and the
// body log. Height is read in the distance unit chosen on the same screen.
export const onboardingSchema = z
  .object({
    name: nameSchema,
    weightUnit: weightUnitSchema,
    distanceUnit: distanceUnitSchema,
    bodyweight: z.string().trim(),
    height: heightInputSchema,
  })
  .transform((values, context) => {
    let bodyweightKg: number | null = null;
    if (values.bodyweight !== '') {
      const bodyweight = parseBodyweight(values.bodyweight, values.weightUnit);
      if ('message' in bodyweight) {
        context.addIssue({ code: 'custom', path: ['bodyweight'], message: bodyweight.message });
      } else {
        bodyweightKg = bodyweight.kilograms;
      }
    }
    return {
      displayName: values.name === '' ? null : values.name,
      weightUnit: values.weightUnit,
      distanceUnit: values.distanceUnit,
      bodyweightKg,
      heightCm: checkedHeightCm(values.height, values.distanceUnit, context),
    };
  });

export type OnboardingInput = z.input<typeof onboardingSchema>;
export type OnboardingValues = z.output<typeof onboardingSchema>;
