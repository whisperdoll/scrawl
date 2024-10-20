import { adjust } from "../lib/offsetHelpers.ts";
import {
  DocumentData,
  DocumentDataElement,
  Point,
  Rect,
} from "../lib/types.ts";
import {
  dataBounds,
  dataToImage,
  distance as distanceBetween,
  normalizeData,
  pointArray,
  rectContainsPoint,
} from "../lib/utils.ts";
import { Tool, ToolContext } from "./helpers.ts";

interface SelectTool extends Tool {
  selectRect: Rect | null;
  onMove: Required<Tool>["onMove"];
  onDown: Required<Tool>["onDown"];
  onUp: Required<Tool>["onUp"];
  onDeselect: Required<Tool>["onDeselect"];
  render: Required<Tool>["render"];
}

function setSelectRect(select: SelectTool, context: ToolContext) {
  const dp = context.mouse.documentPosition;
  select.selectRect = {
    x: Math.min(dp.original.x, dp.current.x),
    y: Math.min(dp.original.y, dp.current.y),
    w: Math.abs(dp.original.x - dp.current.x),
    h: Math.abs(dp.original.y - dp.current.y),
  };
  context.markDirty();
}

const Select: SelectTool = {
  selectRect: null,
  onMove(context) {
    if (!context.mouse.isDown || context.selectedIndexes.length) return;

    setSelectRect(this, context);
  },
  onDown(context) {
    context.disallowTouchScroll();
  },
  onUp(context) {
    context.allowTouchScroll();
    if (!this.selectRect) return;

    setSelectRect(this, context);

    const indexesInSelection = context.data.current
      .map((stroke, i) => {
        const inRect = stroke.points.filter((pt) =>
          rectContainsPoint(this.selectRect!, pt)
        );
        const shouldCount = inRect.length > stroke.points.length / 2;
        return shouldCount ? i : null;
      })
      .filter((x) => x !== null);

    context.setSelectedIndexes(indexesInSelection);

    this.selectRect = null;
    context.markDirty();
  },
  render(context) {
    if (this.selectRect && context.selectedIndexes.length === 0) {
      const canvasContext = context.canvas.getContext("2d");
      if (!canvasContext) throw new Error("couldnt get contewxttt");

      canvasContext.fillStyle = "white";
      canvasContext.strokeStyle = "white";
      canvasContext.lineWidth = 1;
      canvasContext.setLineDash([3, 3]);

      canvasContext.beginPath();
      canvasContext.rect(
        this.selectRect.x + context.offset.x,
        this.selectRect.y + context.offset.y,
        this.selectRect.w,
        this.selectRect.h
      );
      canvasContext.stroke();
      canvasContext.setLineDash([]);
    }
  },
  onDeselect(context) {
    this.selectRect = null;
    context.setSelectedIndexes([]);
    context.markDirty();
  },
};

export default Select;
