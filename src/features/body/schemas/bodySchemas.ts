import { z } from 'zod';

import { parseDecimalInput, roundTo, toKilograms, type WeightUnit } from '@/lib/units';

// The limits of the check on body_measurements.weight_kg.
const minWeightKg = 20;
const maxWeightKg = 400;

export const bodyEntryColumns = 'measured_on, weight_kg';

// One day's bodyweight, as stored, in kilograms.
export const bodyEntrySchema = z.object({
  measured_on: z.iso.date(),
  weight_kg: z.number(),
});

export type BodyEntry = z.infer<typeof bodyEntrySchema>;

// What waits in the outbox and is sent as an upsert for that day.
export const bodyLogPayloadSchema = z.object({
  measured_on: z.iso.date(),
  weight_kg: z.number().min(minWeightKg).max(maxWeightKg),
});

export type BodyLogPayload = z.infer<typeof bodyLogPayloadSchema>;

// A typed bodyweight in kilograms, or the message to show when it isn't
// within the limits. Shared by the log form and onboarding.
export function parseBodyweight(
  text: string,
  weightUnit: WeightUnit,
): { kilograms: number } | { message: string } {
  const typed = parseDecimalInput(text);
  const kilograms = typed === null ? null : roundTo(toKilograms(typed, weightUnit), 2);
  if (kilograms !== null && kilograms >= minWeightKg && kilograms <= maxWeightKg) {
    return { kilograms };
  }
  // 20 to 400 kg is 44 to 881 lb.
  const range = weightUnit === 'kg' ? '20 to 400 kg' : '44 to 881 lb';
  return { message: `Bodyweight must be from ${range}.` };
}

// The log form: the day, and the bodyweight in kg or lb typed as text. It
// becomes the outbox payload above.
export function createBodyLogSchema(weightUnit: WeightUnit) {
  return z
    .object({ measuredOn: z.iso.date(), weight: z.string().trim() })
    .transform((values, context) => {
      const bodyweight =
        values.weight === ''
          ? { message: 'Enter your bodyweight.' }
          : parseBodyweight(values.weight, weightUnit);
      if ('message' in bodyweight) {
        context.addIssue({ code: 'custom', path: ['weight'], message: bodyweight.message });
        return z.NEVER;
      }
      return { measured_on: values.measuredOn, weight_kg: bodyweight.kilograms };
    });
}

export type BodyLogInput = z.input<ReturnType<typeof createBodyLogSchema>>;
