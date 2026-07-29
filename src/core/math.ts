export interface Vector {
  x: number;
  y: number;
}

export function magnitude(vector: Vector): number {
  return Math.hypot(vector.x, vector.y);
}

export function normalize(vector: Vector): Vector {
  const length = magnitude(vector);
  if (length === 0) {
    return { x: 0, y: 0 };
  }

  return { x: vector.x / length, y: vector.y / length };
}

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function wrapAngle(angle: number): number {
  const fullTurn = Math.PI * 2;
  return ((angle + Math.PI) % fullTurn + fullTurn) % fullTurn - Math.PI;
}

export function distancePointToSegment(point: Vector, start: Vector, end: Vector): number {
  const segmentX = end.x - start.x;
  const segmentY = end.y - start.y;
  const lengthSquared = segmentX * segmentX + segmentY * segmentY;

  if (lengthSquared === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const projection = clamp(
    ((point.x - start.x) * segmentX + (point.y - start.y) * segmentY) / lengthSquared,
    0,
    1,
  );
  const closestX = start.x + segmentX * projection;
  const closestY = start.y + segmentY * projection;
  return Math.hypot(point.x - closestX, point.y - closestY);
}
