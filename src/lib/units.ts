export type WeightUnit = 'kg' | 'lb';
export type DistanceUnit = 'km' | 'mi';

// The international avoirdupois pound, defined exactly in kilograms.
const kilogramsPerPound = 0.45359237;

// Weights are stored in kilograms; these convert at the edges, where the user
// types or reads a value in their own unit.
export function toKilograms(value: number, unit: WeightUnit): number {
  return unit === 'kg' ? value : value * kilogramsPerPound;
}

export function fromKilograms(kilograms: number, unit: WeightUnit): number {
  return unit === 'kg' ? kilograms : kilograms / kilogramsPerPound;
}

export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

// Reads a number typed on a phone keyboard. Some keyboards type a comma as the
// decimal separator, so both "81,4" and "81.4" mean 81.4. Returns null for
// anything that isn't a plain non-negative decimal.
export function parseDecimalInput(text: string): number | null {
  const normalised = text.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalised)) return null;
  return Number(normalised);
}

const weightFormat = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 });

// A stored weight shown in the user's unit, to one decimal place without a
// trailing ".0", and with thousands separated: 60 kg is "60 kg", 61.235 kg is
// "135 lb", and a workout's volume reads "7,420 kg".
export function formatWeight(kilograms: number, unit: WeightUnit): string {
  return `${weightFormat.format(roundTo(fromKilograms(kilograms, unit), 1))} ${unit}`;
}

const metresPerMile = 1609.344;

// Distances are stored in metres and typed or read in kilometres or miles.
export function toMetres(value: number, unit: DistanceUnit): number {
  return unit === 'km' ? value * 1000 : value * metresPerMile;
}

export function fromMetres(metres: number, unit: DistanceUnit): number {
  return unit === 'km' ? metres / 1000 : metres / metresPerMile;
}

// A stored distance in the user's unit, to two decimal places without
// trailing zeros: 5000 m is "5 km", 1609.344 m is "1 mi".
export function formatDistance(metres: number, unit: DistanceUnit): string {
  return `${roundTo(fromMetres(metres, unit), 2)} ${unit}`;
}
