import { Point, Rect } from "./types.js";

export const tryParseInt = (value: number | string, fallback: number) => {
  const parsed = parseInt(value as string);
  return isNaN(parsed) ? fallback : parsed;
};

export function distance(p1: Point, p2: Point): number;
export function distance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number;
export function distance(
  x1: number | Point,
  y1: number | Point,
  x2?: number,
  y2?: number
): number {
  if (typeof x1 === "object" && typeof y1 === "object") {
    // x1 and y1 are both Points
    return Math.sqrt((x1.x - y1.x) ** 2 + (x1.y - y1.y) ** 2);
  } else if (
    typeof x1 === "number" &&
    typeof y1 === "number" &&
    typeof x2 === "number" &&
    typeof y2 === "number"
  ) {
    // x1, y1, x2, and y2 are all numbers
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  } else {
    throw new Error("Invalid arguments");
  }
}

export function cx(...classes: (string | Record<string, boolean>)[]) {
  const ret: string[] = [];

  classes.forEach((c) => {
    if (typeof c === "string") {
      ret.push(c);
    } else {
      Object.entries(c).forEach(([className, shouldUse]) => {
        if (shouldUse) {
          ret.push(className);
        }
      });
    }
  });

  return ret.join(" ");
}

export function rectContainsPoint(rect: Rect, point: Point) {
  const right = rect.x + rect.w;
  const bottom = rect.y + rect.h;

  return (
    point.x >= rect.x &&
    point.x <= right &&
    point.y >= rect.y &&
    point.y <= bottom
  );
}

export function pointArray(pt: Point): [number, number] {
  return [pt.x, pt.y];
}

export function polygonContainsPoint(polygon: Point[], point: Point) {
  const { x, y } = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const { x: xi, y: yi } = polygon[i];
    const { x: xj, y: yj } = polygon[j];

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}
