import { adjust } from "../lib/offsetHelpers.ts";
import { Point, Rect } from "../lib/types.ts";
import {
  distance as distanceBetween,
  documentToViewport,
  pointArray,
  polygonContainsPoint,
  rectContainsPoint,
} from "../lib/utils.ts";
import Erase from "./erase.ts";
import { drawPolyLine, Tool, ToolContext } from "./helpers.ts";
import Select from "./select.ts";

interface LassoTool extends Tool {
  lasso: Point[];
  lastRecorded: Point;
  onMove: Required<Tool>["onMove"];
  onDown: Required<Tool>["onDown"];
}

const Lasso: LassoTool = {
  lastRecorded: { x: 0, y: 0 },
  lasso: [],
  onMove(context) {
    const { mouse } = context;

    if (!mouse.isDown) return;

    const distance = distanceBetween(
      mouse.documentPosition.current,
      this.lastRecorded
    );
    if (distance < 4) return false;

    this.lastRecorded = mouse.documentPosition.current;
    this.lasso.push(mouse.documentPosition.current);

    context.markDirty();
  },
  onDown(context) {
    context.disallowTouchScroll();
    this.lasso = [];
    this.lastRecorded = context.mouse.documentPosition.current;
  },
  onUp(context) {
    context.allowTouchScroll();
    this.lasso.push(context.mouse.documentPosition.current);

    const indexesInSelection = context.data.current
      .map((stroke, i) => {
        const inRect = stroke.points.filter((pt) =>
          polygonContainsPoint(this.lasso!, pt)
        );
        const shouldCount = inRect.length > stroke.points.length / 2;
        return shouldCount ? i : null;
      })
      .filter((x) => x !== null);

    context.setSelectedIndexes(indexesInSelection);

    this.lasso = [];
    context.markDirty();
  },
  render(context) {
    if (this.lasso.length) {
      drawPolyLine(
        context.canvas,
        this.lasso
          .concat(this.lasso[0])
          .map((p) => documentToViewport(p, context.zoom, context.offset)),
        {
          color: "white",
          size: 1,
          lineDash: [3, 3],
        }
      );
    }
  },
  onDeselect(context) {
    this.lasso = [];
    context.markDirty();
  },
};

export default Lasso;
