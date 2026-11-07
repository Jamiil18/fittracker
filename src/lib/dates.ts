function twoDigits(value: number): string {
  return value.toString().padStart(2, '0');
}

// The calendar date where the user is, as YYYY-MM-DD. toISOString would give
// the UTC date instead, which is the wrong day for part of every evening in
// time zones ahead of UTC, such as Mauritius.
export function toLocalDateString(date: Date): string {
  return `${date.getFullYear()}-${twoDigits(date.getMonth() + 1)}-${twoDigits(date.getDate())}`;
}
