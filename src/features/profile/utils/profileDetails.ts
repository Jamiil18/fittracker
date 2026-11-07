import type { DistanceUnit } from '@/lib/units';

const centimetresPerInch = 2.54;

// The earliest date of birth accepted, matching the check on the profiles table.
export const earliestDateOfBirth = new Date(1900, 0, 1);

// Up to two letters from the name: "Jamiil Nohur" is "JN", "Sam" is "S".
export function initials(name: string | null): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? '';
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

// Whole years from a YYYY-MM-DD date of birth to `now`, counting the birthday
// on the day itself.
export function ageOn(dateOfBirth: string, now: Date): number {
  const [year, month, day] = dateOfBirth.split('-').map(Number);
  let age = now.getFullYear() - (year ?? 0);
  const birthdayPassed =
    now.getMonth() + 1 > (month ?? 1) ||
    (now.getMonth() + 1 === (month ?? 1) && now.getDate() >= (day ?? 1));
  if (!birthdayPassed) age -= 1;
  return age;
}

// Height follows the distance setting: centimetres with kilometres, feet and
// inches with miles.
export function feetAndInches(heightCm: number): { feet: number; inches: number } {
  const totalInches = Math.round(heightCm / centimetresPerInch);
  return { feet: Math.floor(totalInches / 12), inches: totalInches % 12 };
}

export function centimetresFrom(feet: number, inches: number): number {
  return Math.round((feet * 12 + inches) * centimetresPerInch * 10) / 10;
}

export function formatHeight(heightCm: number, unit: DistanceUnit): string {
  if (unit === 'km') return `${Math.round(heightCm * 10) / 10} cm`;
  const { feet, inches } = feetAndInches(heightCm);
  return `${feet} ft ${inches} in`;
}

// Body mass index, kg/m², to one decimal place.
export function bodyMassIndex(weightKg: number, heightCm: number): number {
  const metres = heightCm / 100;
  return Math.round((weightKg / (metres * metres)) * 10) / 10;
}
