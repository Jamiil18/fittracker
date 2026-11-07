import {
  acceptsPoint,
  averagePace,
  currentPace,
  distanceBetween,
  limitPoints,
  movingSeconds,
  routeBounds,
  routeDistance,
  type RoutePoint,
} from './route';

// About 111.2 m per 0.001 degree of latitude.
function north(metres: number, seconds: number, start: RoutePoint = [57.5, -20.2, 0]): RoutePoint {
  return [start[0], start[1] + metres / 111_195, start[2] + seconds * 1000];
}

describe('distanceBetween', () => {
  it('measures along the surface of the earth', () => {
    expect(distanceBetween([0, 0, 0], [0, 1, 0])).toBeCloseTo(111_195, -1);
    expect(distanceBetween([57.5, -20.2, 0], north(100, 0))).toBeCloseTo(100, 0);
  });
});

describe('acceptsPoint', () => {
  const start: RoutePoint = [57.5, -20.2, 0];

  it('keeps precise readings at a believable speed', () => {
    expect(acceptsPoint(undefined, start, 8, 'run')).toBe(true);
    expect(acceptsPoint(start, north(15, 5), 8, 'run')).toBe(true);
  });

  it('drops imprecise readings, impossible jumps and points out of order', () => {
    expect(acceptsPoint(start, north(15, 5), 40, 'run')).toBe(false);
    expect(acceptsPoint(start, north(200, 5), 8, 'run')).toBe(false);
    expect(acceptsPoint(start, north(100, 5), 8, 'ride')).toBe(true);
    expect(acceptsPoint(start, north(5, 0), 8, 'walk')).toBe(false);
  });
});

describe('route totals', () => {
  const walk = [north(0, 0), north(50, 40), north(50, 100), north(100, 140)];

  it('adds up distance within each part and leaves out gaps between parts', () => {
    expect(routeDistance([walk])).toBeCloseTo(100, 0);
    const resumedFarAway = [north(500, 300), north(550, 340)];
    expect(routeDistance([walk, resumedFarAway])).toBeCloseTo(150, 0);
  });

  it('counts only the time spent moving', () => {
    // The minute standing still between 40 s and 100 s isn't moving time.
    expect(movingSeconds([walk])).toBe(80);
  });

  it('works out pace in seconds per kilometre', () => {
    expect(averagePace(1000, 360)).toBe(360);
    expect(averagePace(10, 360)).toBeNull();
    const steady = [0, 10, 20, 30].map((seconds) => north(seconds * 3, seconds));
    expect(currentPace([steady])).toBeCloseTo(333, 0);
  });
});

describe('limitPoints and routeBounds', () => {
  it('thins a very long route but keeps its last point', () => {
    const points = Array.from({ length: 50 }, (_, index) => north(index, index));
    const limited = limitPoints(points, 20);
    expect(limited.length).toBeLessThanOrEqual(20);
    expect(limited[limited.length - 1]).toBe(points[points.length - 1]);
  });

  it('boxes the route for the map', () => {
    expect(
      routeBounds([
        [1, 2, 0],
        [3, 0, 1],
      ]),
    ).toEqual([1, 0, 3, 2]);
    expect(routeBounds([])).toBeNull();
  });
});
