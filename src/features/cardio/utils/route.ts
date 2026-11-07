// A recorded point as stored in cardio_sessions.route: longitude, latitude and
// the time in milliseconds (GeoJSON coordinate order).
export type RoutePoint = [longitude: number, latitude: number, time: number];

export const activities = ['run', 'walk', 'ride'] as const;
export type Activity = (typeof activities)[number];

const earthRadiusMetres = 6_371_000;

// Readings less precise than this are dropped: the dot would wander and add
// distance that wasn't covered.
const maxAccuracyMetres = 25;

// Faster than anyone moves on foot or by bike over a few seconds; a jump this
// fast is a bad reading, not movement.
const maxSpeed: Record<Activity, number> = { run: 9, walk: 4, ride: 25 };

// Below this speed between two points the user is treated as standing still,
// so waiting at a crossing doesn't count as moving time.
const movingSpeed = 0.5;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

// The great-circle distance between two points (the haversine formula).
export function distanceBetween(a: RoutePoint, b: RoutePoint): number {
  const latitudeChange = toRadians(b[1] - a[1]);
  const longitudeChange = toRadians(b[0] - a[0]);
  const h =
    Math.sin(latitudeChange / 2) ** 2 +
    Math.cos(toRadians(a[1])) * Math.cos(toRadians(b[1])) * Math.sin(longitudeChange / 2) ** 2;
  return 2 * earthRadiusMetres * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Whether a new reading should join the route: precise enough, later than the
// last point, and not an impossible jump from it.
export function acceptsPoint(
  previous: RoutePoint | undefined,
  next: RoutePoint,
  accuracyMetres: number | null,
  activity: Activity,
): boolean {
  if (accuracyMetres === null || accuracyMetres > maxAccuracyMetres) return false;
  if (!previous) return true;
  const seconds = (next[2] - previous[2]) / 1000;
  if (seconds <= 0) return false;
  return distanceBetween(previous, next) / seconds <= maxSpeed[activity];
}

// Distance along each part of the route. Parts are split where the recording
// was paused, so moving while paused isn't counted.
export function routeDistance(segments: RoutePoint[][]): number {
  let total = 0;
  for (const segment of segments) {
    for (let index = 1; index < segment.length; index += 1) {
      const previous = segment[index - 1];
      const point = segment[index];
      if (previous && point) total += distanceBetween(previous, point);
    }
  }
  return total;
}

// Seconds spent moving: the time between points where the speed was above a
// slow walk.
export function movingSeconds(segments: RoutePoint[][]): number {
  let total = 0;
  for (const segment of segments) {
    for (let index = 1; index < segment.length; index += 1) {
      const previous = segment[index - 1];
      const point = segment[index];
      if (!previous || !point) continue;
      const seconds = (point[2] - previous[2]) / 1000;
      if (seconds > 0 && distanceBetween(previous, point) / seconds >= movingSpeed)
        total += seconds;
    }
  }
  return Math.round(total);
}

// Seconds per kilometre over the last `windowSeconds` of the latest part, or
// null until there's enough to measure.
export function currentPace(segments: RoutePoint[][], windowSeconds = 30): number | null {
  const segment = segments[segments.length - 1] ?? [];
  const last = segment[segment.length - 1];
  if (!last) return null;
  const recent = segment.filter((point) => last[2] - point[2] <= windowSeconds * 1000);
  const metres = routeDistance([recent]);
  const first = recent[0];
  if (!first || metres < 20) return null;
  return ((last[2] - first[2]) / 1000 / metres) * 1000;
}

// Seconds per kilometre over the whole recording, or null with no distance yet.
export function averagePace(distanceMetres: number, seconds: number): number | null {
  return distanceMetres >= 20 && seconds > 0 ? (seconds / distanceMetres) * 1000 : null;
}

// The database keeps up to 20,000 points per session. A longer route keeps
// every nth point, always including the last.
export function limitPoints(points: RoutePoint[], max = 20_000): RoutePoint[] {
  if (points.length <= max) return points;
  const step = Math.ceil(points.length / max);
  const kept = points.filter((_, index) => index % step === 0);
  const last = points[points.length - 1];
  if (last && kept[kept.length - 1] !== last) kept[kept.length - 1] = last;
  return kept;
}

// The box around the route, [west, south, east, north], for fitting the map.
export function routeBounds(points: RoutePoint[]): [number, number, number, number] | null {
  if (points.length === 0) return null;
  const longitudes = points.map((point) => point[0]);
  const latitudes = points.map((point) => point[1]);
  return [
    Math.min(...longitudes),
    Math.min(...latitudes),
    Math.max(...longitudes),
    Math.max(...latitudes),
  ];
}
