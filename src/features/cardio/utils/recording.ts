import { z } from 'zod';

import { newId } from '@/lib/ids';

import {
  acceptsPoint,
  activities,
  limitPoints,
  movingSeconds,
  routeDistance,
  type Activity,
  type RoutePoint,
} from './route';

const pointSchema = z.tuple([z.number(), z.number(), z.number()]);

// A recording in progress. The route is split into parts at each pause, so
// moving while paused isn't counted. Times are stored, never counted, so the
// duration stays right while the app is in the background.
export const recordingSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  activity: z.enum(activities),
  startedAt: z.number(),
  segments: z.array(z.array(pointSchema)),
  // When the current pause began, or null while recording.
  pausedAt: z.number().nullable(),
  // Paused time before the current pause.
  pausedMs: z.number(),
});

export type Recording = z.infer<typeof recordingSchema>;

export function startRecording(userId: string, activity: Activity, now: number): Recording {
  return {
    id: newId(),
    userId,
    activity,
    startedAt: now,
    segments: [[]],
    pausedAt: null,
    pausedMs: 0,
  };
}

// Adds a location reading to the current part, if the recording isn't paused
// and the reading passes the checks in acceptsPoint.
export function addPoint(
  recording: Recording,
  point: RoutePoint,
  accuracyMetres: number | null,
): Recording {
  if (recording.pausedAt !== null) return recording;
  const segments = recording.segments.length > 0 ? recording.segments : [[]];
  const current = segments[segments.length - 1] ?? [];
  if (!acceptsPoint(current[current.length - 1], point, accuracyMetres, recording.activity)) {
    return recording;
  }
  return { ...recording, segments: [...segments.slice(0, -1), [...current, point]] };
}

export function pauseRecording(recording: Recording, now: number): Recording {
  return recording.pausedAt === null ? { ...recording, pausedAt: now } : recording;
}

// Resuming starts a new part of the route.
export function resumeRecording(recording: Recording, now: number): Recording {
  if (recording.pausedAt === null) return recording;
  return {
    ...recording,
    pausedAt: null,
    pausedMs: recording.pausedMs + (now - recording.pausedAt),
    segments: [...recording.segments, []],
  };
}

// Time recorded, leaving out pauses.
export function elapsedSeconds(recording: Recording, now: number): number {
  const paused = recording.pausedMs + (recording.pausedAt === null ? 0 : now - recording.pausedAt);
  return Math.max(0, Math.round((now - recording.startedAt - paused) / 1000));
}

export function allPoints(recording: Recording): RoutePoint[] {
  return recording.segments.flat();
}

// What goes to cardio_sessions. The limits match the table's checks.
export const cardioPayloadSchema = z.object({
  id: z.uuid(),
  activity: z.enum(activities),
  started_at: z.iso.datetime(),
  ended_at: z.iso.datetime(),
  moving_seconds: z.int().min(0),
  distance_m: z.number().min(0).max(1_000_000),
  route: z.array(pointSchema).max(20_000),
});

type CardioPayload = z.infer<typeof cardioPayloadSchema>;

const maxDurationMs = 24 * 60 * 60 * 1000;

export function toCardioPayload(recording: Recording, endedAt: number): CardioPayload {
  const end = Math.min(Math.max(endedAt, recording.startedAt), recording.startedAt + maxDurationMs);
  const totalSeconds = Math.floor((end - recording.startedAt) / 1000);
  return {
    id: recording.id,
    activity: recording.activity,
    started_at: new Date(recording.startedAt).toISOString(),
    ended_at: new Date(end).toISOString(),
    moving_seconds: Math.min(movingSeconds(recording.segments), totalSeconds),
    distance_m: Math.min(Math.round(routeDistance(recording.segments) * 10) / 10, 1_000_000),
    route: limitPoints(allPoints(recording)),
  };
}
