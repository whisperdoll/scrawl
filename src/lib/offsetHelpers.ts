import { Point } from "./types.ts";

export function adjust(point: Point, offset: Point, sign = 1) {
  return {
    x: point.x + sign * offset.x,
    y: point.y + sign * offset.y,
  };
}
