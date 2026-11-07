import type { ExerciseType } from '@/features/exercises/schemas/exerciseSchemas';

import { hasDistance, hasDuration, hasReps, hasWeight } from '../utils/setValues';

// Widths of the logging table's fixed columns, shared by the heading row and
// the set rows so the columns line up. Previous takes the remaining width.
// Sized for a 360-point-wide phone like the Galaxy A02s.
export const columnWidth = {
  set: 36,
  value: 64,
  start: 64,
  done: 48,
} as const;

// The table's columns have fixed widths so they line up, which large text
// would overflow. Text in the table grows with the phone's font size up to
// this much; everywhere else it grows without a limit and wraps.
export const tableFontScale = 1.3;

export type ValueColumn = 'weight' | 'reps' | 'distance' | 'duration';

// The value columns for an exercise type, in display order.
export function valueColumns(type: ExerciseType): ValueColumn[] {
  const columns: ValueColumn[] = [];
  if (hasWeight(type)) columns.push('weight');
  if (hasDistance(type)) columns.push('distance');
  if (hasReps(type)) columns.push('reps');
  if (hasDuration(type)) columns.push('duration');
  return columns;
}
