import {
  cardioPayloadSchema,
  addPoint,
  elapsedSeconds,
  pauseRecording,
  resumeRecording,
  startRecording,
  toCardioPayload,
} from './recording';
import type { RoutePoint } from './route';

jest.mock('@/lib/ids', () => ({ newId: () => '80000000-0000-4000-8000-000000000001' }));

const userId = '6f1c7a52-8d3e-4b0a-9c55-2e6f1d7b8a90';
const start = Date.UTC(2026, 9, 10, 7, 0);

function point(metresNorth: number, seconds: number): RoutePoint {
  return [57.5, -20.2 + metresNorth / 111_195, start + seconds * 1000];
}

describe('a cardio recording', () => {
  it('adds good readings, skips bad ones, and ignores readings while paused', () => {
    let recording = startRecording(userId, 'walk', start);
    recording = addPoint(recording, point(0, 0), 5);
    recording = addPoint(recording, point(10, 10), 60);
    recording = addPoint(recording, point(10, 10), 5);
    expect(recording.segments).toEqual([[point(0, 0), point(10, 10)]]);

    recording = pauseRecording(recording, start + 20_000);
    expect(addPoint(recording, point(20, 25), 5)).toBe(recording);
  });

  it('leaves pauses out of the time and starts a new part of the route on resume', () => {
    let recording = startRecording(userId, 'run', start);
    recording = pauseRecording(recording, start + 60_000);
    recording = resumeRecording(recording, start + 90_000);
    expect(elapsedSeconds(recording, start + 120_000)).toBe(90);
    expect(recording.segments).toHaveLength(2);
  });

  it('turns into what cardio_sessions stores', () => {
    let recording = startRecording(userId, 'walk', start);
    for (let seconds = 0; seconds <= 100; seconds += 10) {
      recording = addPoint(recording, point(seconds * 1.2, seconds), 5);
    }
    const payload = toCardioPayload(recording, start + 110_000);

    expect(cardioPayloadSchema.parse(payload)).toEqual(payload);
    expect(payload).toMatchObject({
      id: '80000000-0000-4000-8000-000000000001',
      activity: 'walk',
      started_at: '2026-10-10T07:00:00.000Z',
      ended_at: '2026-10-10T07:01:50.000Z',
      moving_seconds: 100,
    });
    expect(payload.distance_m).toBeCloseTo(120, 0);
    expect(payload.route).toHaveLength(11);
  });
});
