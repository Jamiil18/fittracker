import { savePayloadSchema } from '../schemas/savePayloadSchema';
import type { SessionSet, WorkoutSession } from '../schemas/sessionSchema';
import { toSavePayload, unsavedSetCount, workoutSummary } from './finishWorkout';
import type { HistorySet } from './setValues';

const benchId = '00000000-0000-4000-8000-000000000001';
const pullupId = '00000000-0000-4000-8000-000000000002';

function set(overrides: Partial<SessionSet>): SessionSet {
  return {
    key: Math.random().toString(),
    weight: '',
    reps: '',
    duration: '',
    distance: '',
    done: true,
    ...overrides,
  };
}

const startedAt = Date.UTC(2026, 9, 9, 17, 0);

const session: WorkoutSession = {
  id: '30000000-0000-4000-8000-000000000001',
  userId: '6f1c7a52-8d3e-4b0a-9c55-2e6f1d7b8a90',
  routineId: null,
  name: '  Push A ',
  notes: '',
  startedAt,
  weightUnit: 'kg',
  distanceUnit: 'km',
  timer: null,
  exercises: [
    {
      key: 'bench',
      exercise: { id: benchId, name: 'Bench press', exerciseType: 'weight_reps' },
      notes: ' Pause the first rep ',
      restSeconds: 120,
      targets: { weightKg: null, repsMin: null, durationSeconds: null },
      sets: [
        set({ weight: '40', reps: '10' }),
        set({ weight: '82.5', reps: '8' }),
        set({ weight: '82.5', reps: '', done: false }),
      ],
    },
    {
      key: 'pullup',
      exercise: { id: pullupId, name: 'Pull-up', exerciseType: 'bodyweight_reps' },
      notes: null,
      restSeconds: 120,
      targets: { weightKg: null, repsMin: null, durationSeconds: null },
      // Ticked, then the reps were cleared: it can't be saved.
      sets: [set({ reps: '' })],
    },
  ],
};

describe('toSavePayload', () => {
  it('keeps only ticked sets with valid values, in stored units', () => {
    const payload = toSavePayload(session, startedAt + 60 * 60 * 1000);

    expect(savePayloadSchema.parse(payload)).toEqual(payload);
    expect(payload).toMatchObject({
      name: 'Push A',
      notes: null,
      started_at: '2026-10-09T17:00:00.000Z',
      ended_at: '2026-10-09T18:00:00.000Z',
    });
    expect(payload.exercises).toEqual([
      {
        exercise_id: benchId,
        notes: 'Pause the first rep',
        sets: [
          {
            weight_kg: 40,
            reps: 10,
            duration_seconds: null,
            distance_m: null,
          },
          {
            weight_kg: 82.5,
            reps: 8,
            duration_seconds: null,
            distance_m: null,
          },
        ],
      },
    ]);
  });

  it('ends a workout left running for over a day 24 hours after it started', () => {
    const payload = toSavePayload(session, startedAt + 30 * 60 * 60 * 1000);
    expect(payload.ended_at).toBe('2026-10-10T17:00:00.000Z');
  });

  it("counts the sets that won't be saved", () => {
    expect(unsavedSetCount(session)).toBe(2);
  });
});

describe('workoutSummary', () => {
  const earlier: HistorySet[] = [
    {
      workoutId: 'w0',
      startedAt: '2026-10-02T17:00:00Z',
      exercisePosition: 0,
      setPosition: 0,
      weightKg: 80,
      reps: 8,
      durationSeconds: null,
      distanceM: null,
    },
  ];

  it('adds up duration, volume and sets, and finds new records', () => {
    const summary = workoutSummary(
      session,
      startedAt + 45 * 60 * 1000,
      new Map([[benchId, earlier]]),
    );

    expect(summary).toMatchObject({ name: 'Push A', durationSeconds: 2700, setCount: 2 });
    // 40 × 10 + 82.5 × 8
    expect(summary.volumeKg).toBe(1060);
    expect(summary.records.map((record) => [record.exerciseName, record.kind])).toEqual([
      ['Bench press', 'estimated_1rm'],
      ['Bench press', 'heaviest_weight'],
    ]);
  });
});
