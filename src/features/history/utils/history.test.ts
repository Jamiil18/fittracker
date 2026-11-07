import type { PastWorkout } from '../schemas/historySchemas';
import { dayKeyToTime, dayTitle, durationText, monthGrid, spokenDate } from './historyDates';
import { groupByDay, trainedDays, workoutItem } from './historyList';
import { pendingWorkout, setText, totalsText } from './pastWorkout';

jest.mock('@/lib/ids', () => {
  let count = 0;
  return { newId: () => `new-${++count}` };
});

const kg = { weightUnit: 'kg', distanceUnit: 'km' } as const;
const lb = { weightUnit: 'lb', distanceUnit: 'mi' } as const;

function at(year: number, month: number, day: number, hour = 18) {
  return new Date(year, month - 1, day, hour).getTime();
}

function workout(id: string, startedAt: number, overrides: Partial<PastWorkout> = {}): PastWorkout {
  return {
    id,
    routineId: null,
    name: 'Push A',
    notes: null,
    startedAt,
    endedAt: startedAt + 58 * 60 * 1000,
    exercises: [
      {
        id: `${id}-e1`,
        position: 0,
        notes: null,
        exercise: {
          id: '00000000-0000-4000-8000-000000000001',
          name: 'Bench press',
          exerciseType: 'weight_reps',
          primaryMuscles: ['chest'],
        },
        sets: [
          {
            id: `${id}-s1`,
            position: 0,
            weightKg: 40,
            reps: 10,
            durationSeconds: null,
            distanceM: null,
          },
          {
            id: `${id}-s2`,
            position: 1,
            weightKg: 82.5,
            reps: 8,
            durationSeconds: null,
            distanceM: null,
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe('history dates', () => {
  it('writes day headings with the year only when it is not this year', () => {
    const now = at(2026, 10, 9);
    expect(dayTitle(at(2026, 9, 28), now)).toBe('Mon 28 Sep');
    expect(dayTitle(at(2025, 9, 28), now)).toBe('Sun 28 Sep 2025');
  });

  it('reads a day key as that day where the user is', () => {
    expect(spokenDate('2026-09-28')).toBe('Monday 28 September');
    expect(new Date(dayKeyToTime('2026-09-01')).getDate()).toBe(1);
  });

  it('lays out a month Monday first, with blanks around it', () => {
    // 1 September 2026 is a Tuesday.
    const weeks = monthGrid(2026, 8);
    expect(weeks[0]).toEqual([
      null,
      '2026-09-01',
      '2026-09-02',
      '2026-09-03',
      '2026-09-04',
      '2026-09-05',
      '2026-09-06',
    ]);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    expect(weeks.flat().filter(Boolean)).toHaveLength(30);
  });

  it('writes durations in minutes, then hours and minutes', () => {
    expect(durationText(20)).toBe('1 min');
    expect(durationText(58 * 60)).toBe('58 min');
    expect(durationText(72 * 60)).toBe('1 h 12 min');
    expect(durationText(120 * 60)).toBe('2 h');
  });
});

describe('history list', () => {
  it('groups workouts by day, newest first', () => {
    const items = [
      workoutItem(workout('a', at(2026, 9, 26)), false),
      workoutItem(workout('b', at(2026, 9, 28, 9)), false),
      workoutItem(workout('c', at(2026, 9, 28, 18)), true),
    ];
    const sections = groupByDay(items, at(2026, 10, 9));

    expect(sections.map((section) => section.title)).toEqual(['Mon 28 Sep', 'Sat 26 Sep']);
    expect(sections[0]?.data.map((item) => item.id)).toEqual(['c', 'b']);
    expect([...trainedDays(items)].sort()).toEqual(['2026-09-26', '2026-09-28']);
  });

  it('sums sets and volume', () => {
    expect(totalsText(workout('a', at(2026, 9, 28)), kg)).toBe('2 sets, 1,060 kg');
  });

  it('describes each set in the user units', () => {
    const set = { weightKg: 61.235, reps: 5, durationSeconds: null, distanceM: null };
    expect(setText('weight_reps', set, lb)).toBe('135 lb × 5');
    expect(setText('weighted_bodyweight', { ...set, weightKg: 10 }, kg)).toBe('+10 kg × 5');
    expect(setText('bodyweight_reps', { ...set, weightKg: null }, kg)).toBe('5 reps');
    expect(
      setText(
        'distance_duration',
        { ...set, weightKg: null, reps: null, distanceM: 1500, durationSeconds: 360 },
        kg,
      ),
    ).toBe('1.5 km in 6:00');
  });

  it('shows a workout still in the outbox with names from the library', () => {
    const pending = pendingWorkout(
      {
        id: '30000000-0000-4000-8000-000000000001',
        routine_id: null,
        name: 'Push A',
        notes: null,
        started_at: '2026-10-09T17:00:00.000Z',
        ended_at: '2026-10-09T18:00:00.000Z',
        exercises: [
          {
            exercise_id: '00000000-0000-4000-8000-000000000001',
            notes: null,
            sets: [
              {
                weight_kg: 80,
                reps: 8,
                duration_seconds: null,
                distance_m: null,
              },
            ],
          },
        ],
      },
      new Map([
        [
          '00000000-0000-4000-8000-000000000001',
          {
            id: '00000000-0000-4000-8000-000000000001',
            name: 'Bench press',
            exerciseType: 'weight_reps' as const,
            primaryMuscles: ['chest' as const],
            secondaryMuscles: [],
            equipment: 'barbell' as const,
          },
        ],
      ]),
    );
    expect(pending.exercises[0]?.exercise.name).toBe('Bench press');
    expect(pending.exercises[0]?.sets[0]).toMatchObject({ weightKg: 80, reps: 8 });
  });
});
