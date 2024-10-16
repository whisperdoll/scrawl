import { Point } from "../lib/types.ts";
import { distance as distanceBetween } from "../lib/utils.ts";
import { Tool } from "./helpers.ts";

interface EraseTool extends Tool {
  lastRecorded: Point;
  onMove: Required<Tool>["onMove"];
  onDown: Required<Tool>["onMove"];
  onUp: Required<Tool>["onMove"];
}

const Erase: EraseTool = {
  lastRecorded: { x: 0, y: 0 },
  onMove(context) {
    if (!context.mouse.isDown) return;

    const data = context.data.current;
    if (!data?.length) return;

    const distance = distanceBetween(
      context.mouse.documentPosition.current,
      this.lastRecorded
    );

    if (distance < 8) return;

    const a = this.lastRecorded;
    const b = context.mouse.documentPosition.current;

    function ccw(a: Point, b: Point, c: Point) {
      return (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
    }

    function intersect(a: Point, b: Point, c: Point, d: Point, r: number) {
      // make dots easier to erase
      if (distanceBetween(c, d) < 3) {
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        return Math.sqrt((mid.x - c.x) ** 2 + (mid.y - c.y) ** 2) <= r;
      }

      return ccw(a, c, d) != ccw(b, c, d) && ccw(a, b, c) != ccw(a, b, d);
    }

    const toErase = [];

    for (let i = 0; i < data.length; i++) {
      const points = data[i].points;

      for (let j = 0; j < points.length - 1; j++) {
        const c = points[j];
        const d = points[j + 1];

        if (intersect(a, b, c, d, data[i].size)) {
          toErase.push(i);
          break;
        }
      }
    }

    if (toErase.length > 0) {
      toErase
        .sort((a, b) => b - a)
        .forEach((index) => {
          data.splice(index, 1);
        });
      context.markDirty();
    }

    this.lastRecorded = context.mouse.documentPosition.current;
  },
  onDown(context) {
    context.disallowTouchScroll();
    this.lastRecorded = context.mouse.documentPosition.current;
  },
  onUp(context) {
    context.allowTouchScroll();
  },
};

export default Erase;
