export function adjust(point, offset, sign=1) {
  return {
    x: point.x + sign * offset.x,
    y: point.y + sign * offset.y
  };
}