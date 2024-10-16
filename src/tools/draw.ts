import { DocumentData, Point } from "../lib/types.js";
import { distance as distanceBetween } from "../lib/utils.js";
import Erase from "./erase.ts";
import { drawLine, Tool, ToolContext } from "./helpers.ts";

interface DrawTool extends Tool {
  lastRecorded: Point;
}

const Draw: DrawTool = {
  lastRecorded: { x: 0, y: 0 },
  onMove(context: ToolContext) {
    const { mouse, data: dataRef } = context;
    if (!mouse.isDown) return;

    const data = dataRef.current;
    if (!data?.length) return;

    if (context.e.buttons & (2 | 32)) {
      return Erase.onMove.call(Erase, context);
    }

    const distance = distanceBetween(
      mouse.documentPosition.current,
      this.lastRecorded
    );
    if (distance < data.at(-1)!.size / 2) return false;

    data.at(-1)!.points.push(mouse.documentPosition.current);
    drawLine(
      context,
      mouse.documentPosition.last,
      mouse.documentPosition.current
    );

    return false;
  },
  onUp(context: ToolContext) {
    if (context.e.button === 0) {
      context.data.current
        .at(-1)!
        .points.push(context.mouse.documentPosition.current);
      context.markDirty();
    } else if (context.e.button === 2 || context.e.button === 5) {
      return Erase.onUp?.call(Erase, context);
    }
  },
  onDown(context: ToolContext) {
    if (context.e.button === 0) {
      this.lastRecorded = context.mouse.documentPosition.current;
      context.data.current.push({
        action: "draw",
        size: context.size,
        color: context.color,
        points: [context.mouse.documentPosition.current],
      });
    } else if (context.e.button === 2 || context.e.button === 5) {
      return Erase.onDown.call(Erase, context);
    }
  },
};

export default Draw;
