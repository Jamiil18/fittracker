import { toLocalDateString } from '@/lib/dates';

// Dates are written out by hand rather than with toLocaleDateString, whose
// output differs between phones (for example "Sep" or "Sept").
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const weekdayLetters = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const monthsShort = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const monthsLong = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// The calendar day a time falls on where the user is, as YYYY-MM-DD.
export function dayKey(time: number): string {
  return toLocalDateString(new Date(time));
}

// "Sun 28 Sep", with the year added when it isn't this year.
export function dayTitle(time: number, now = Date.now()): string {
  const date = new Date(time);
  const title = `${weekdays[date.getDay()]} ${date.getDate()} ${monthsShort[date.getMonth()]}`;
  return date.getFullYear() === new Date(now).getFullYear()
    ? title
    : `${title} ${date.getFullYear()}`;
}

// "28 Sep", for chart axes and dates within the year.
export function dayMonth(time: number): string {
  const date = new Date(time);
  return `${date.getDate()} ${monthsShort[date.getMonth()]}`;
}

// "28 Sep 2026", for a date shown on its own.
export function shortDate(time: number): string {
  const date = new Date(time);
  return `${date.getDate()} ${monthsShort[date.getMonth()]} ${date.getFullYear()}`;
}

// Midday on a YYYY-MM-DD day where the user is. Date.parse would read the key
// as midnight UTC, which is the day before in time zones behind UTC.
export function dayKeyToTime(key: string): number {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1, 12).getTime();
}

// "Sunday 28 September", read out for a calendar day.
export function spokenDate(key: string): string {
  const date = new Date(dayKeyToTime(key));
  return `${weekdayNames[date.getDay()]} ${date.getDate()} ${monthsLong[date.getMonth()]}`;
}

export function monthTitle(year: number, month: number): string {
  return `${monthsLong[month]} ${year}`;
}

// The weeks of a month for a calendar, Monday first. Each cell is the day's
// key, or null for the blank cells before the 1st and after the last day.
export function monthGrid(year: number, month: number): (string | null)[][] {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = (first.getDay() + 6) % 7;
  const cells: (string | null)[] = Array.from({ length: leadingBlanks }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(toLocalDateString(new Date(year, month, day)));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let index = 0; index < cells.length; index += 7) weeks.push(cells.slice(index, index + 7));
  return weeks;
}

// "58 min", or "1 h 12 min" from an hour.
export function durationText(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}
