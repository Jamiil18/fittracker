import { createBodyLogSchema, type BodyEntry } from '../schemas/bodySchemas';
import { mergeBodyEntries, weightSeries } from './bodyEntries';

function form(weight: string) {
  return { measuredOn: '2026-10-10', weight };
}

function entry(measuredOn: string, weightKg: number): BodyEntry {
  return { measured_on: measuredOn, weight_kg: weightKg };
}

describe('createBodyLogSchema', () => {
  it('stores the bodyweight in kilograms', () => {
    expect(createBodyLogSchema('kg').parse(form('81,4'))).toEqual({
      measured_on: '2026-10-10',
      weight_kg: 81.4,
    });
    expect(createBodyLogSchema('lb').parse(form('180'))).toEqual({
      measured_on: '2026-10-10',
      weight_kg: 81.65,
    });
  });

  it('needs a bodyweight', () => {
    const result = createBodyLogSchema('kg').safeParse(form(''));
    expect(result.error?.issues[0]?.message).toBe('Enter your bodyweight.');
  });

  it('applies the same limits as the database', () => {
    expect(createBodyLogSchema('kg').safeParse(form('500')).error?.issues[0]?.message).toBe(
      'Bodyweight must be from 20 to 400 kg.',
    );
    expect(createBodyLogSchema('lb').safeParse(form('30')).error?.issues[0]?.message).toBe(
      'Bodyweight must be from 44 to 881 lb.',
    );
  });
});

describe('mergeBodyEntries', () => {
  const saved = [entry('2026-10-09', 81.4), entry('2026-10-02', 82)];

  it('replaces a saved day with a log still waiting to sync', () => {
    const merged = mergeBodyEntries(saved, [{ measured_on: '2026-10-09', weight_kg: 81 }]);
    expect(merged[0]).toEqual({ entry: entry('2026-10-09', 81), pending: true });
  });

  it('adds a new day from the outbox, newest first', () => {
    const merged = mergeBodyEntries(saved, [{ measured_on: '2026-10-10', weight_kg: 81 }]);
    expect(merged.map((item) => item.entry.measured_on)).toEqual([
      '2026-10-10',
      '2026-10-09',
      '2026-10-02',
    ]);
  });

  it('gives the bodyweight trend from a date, oldest first', () => {
    const merged = mergeBodyEntries(saved, []);
    expect(weightSeries(merged, '2026-10-01')).toEqual([
      { measuredOn: '2026-10-02', weightKg: 82 },
      { measuredOn: '2026-10-09', weightKg: 81.4 },
    ]);
    expect(weightSeries(merged, '2026-10-05')).toHaveLength(1);
  });
});
