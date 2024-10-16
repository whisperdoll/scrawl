import { adjust } from "../lib/offsetHelpers.js";
import { Point, Rect } from "../lib/types.ts";
import {
  distance as distanceBetween,
  pointArray,
  rectContainsPoint,
} from "../lib/utils.ts";
import { Tool, ToolContext } from "./helpers.ts";

interface SelectTool extends Tool {
  selectRect: Rect | null;
  selectedIndexes: number[];
  action: "select" | "move";
  onMove: Required<Tool>["onMove"];
  onDown: Required<Tool>["onMove"];
}

function setSelectRect(select: SelectTool, context: ToolContext) {
  const dp = context.mouse.documentPosition;
  select.selectRect = {
    x: Math.min(dp.original.x, dp.current.x),
    y: Math.min(dp.original.y, dp.current.y),
    w: Math.abs(dp.original.x - dp.current.x),
    h: Math.abs(dp.original.y - dp.current.y),
  };
}

const Select: SelectTool = {
  selectRect: null,
  selectedIndexes: [],
  action: "select",
  onMove(context) {
    const { mouse } = context;

    context.canvas.style.cursor =
      this.selectRect &&
      rectContainsPoint(this.selectRect, mouse.documentPosition.current)
        ? "move"
        : "";

    if (!mouse.isDown) return;

    if (this.action === "select") {
      setSelectRect(this, context);

      context.markDirty();
    } else if (this.selectRect) {
      const deltaX =
        mouse.documentPosition.current.x - mouse.documentPosition.last.x;
      const deltaY =
        mouse.documentPosition.current.y - mouse.documentPosition.last.y;

      this.selectedIndexes.forEach((i) => {
        context.data.current[i].points.forEach((pt) => {
          pt.x += deltaX;
          pt.y += deltaY;
        });
      });

      this.selectRect.x += deltaX;
      this.selectRect.y += deltaY;

      context.markDirty();
    }
  },
  onDown(context) {
    if (
      this.selectRect &&
      rectContainsPoint(this.selectRect, context.mouse.documentPosition.current)
    ) {
      this.action = "move";
    } else {
      this.action = "select";
    }
  },
  onUp(context) {
    if (this.action === "select") {
      setSelectRect(this, context);
      this.action = "move";

      let leftMost: number | undefined;
      let rightMost: number | undefined;
      let topMost: number | undefined;
      let bottomMost: number | undefined;

      this.selectedIndexes = context.data.current
        .map((stroke, i) => {
          if (
            stroke.points.filter((pt) =>
              rectContainsPoint(this.selectRect!, pt)
            ).length >
            stroke.points.length / 2
          ) {
            stroke.points.forEach((pt) => {
              const padding = stroke.size * 4;
              if (leftMost === undefined || pt.x - padding < leftMost) {
                leftMost = pt.x - padding;
              }
              if (rightMost === undefined || pt.x + padding > rightMost) {
                rightMost = pt.x + padding;
              }
              if (topMost === undefined || pt.y - padding < topMost) {
                topMost = pt.y - padding;
              }
              if (bottomMost === undefined || pt.y + padding > bottomMost) {
                bottomMost = pt.y + padding;
              }
            });

            return i;
          } else {
            return null;
          }
        })
        .filter((i) => i !== null);

      if (this.selectedIndexes.length === 0) {
        this.selectRect = null;
      } else if (leftMost && rightMost && topMost && bottomMost) {
        this.selectRect = {
          x: leftMost,
          y: topMost,
          w: rightMost - leftMost,
          h: bottomMost - topMost,
        };
      }

      context.markDirty();
    }
  },
  render(context) {
    if (this.selectRect) {
      const canvasContext = context.canvas.getContext("2d");
      if (!canvasContext) {
        throw new Error("couldnt get da context woops!");
      }

      canvasContext.globalCompositeOperation = "destination-over";
      context.data.current.forEach((stroke, strokeIndex) => {
        if (this.selectedIndexes.includes(strokeIndex)) {
          canvasContext.fillStyle = "#773";
          canvasContext.strokeStyle = "#773";
          canvasContext.lineWidth = stroke.size * 2;

          canvasContext.beginPath();

          canvasContext.moveTo(
            ...pointArray(adjust(stroke.points[0], context.offset))
          );

          for (let i = 1; i < stroke.points.length; i++) {
            canvasContext.lineTo(
              ...pointArray(adjust(stroke.points[i], context.offset))
            );
          }

          canvasContext.stroke();
        }
      });

      canvasContext.globalCompositeOperation = "source-over";
      canvasContext.fillStyle = "white";
      canvasContext.strokeStyle = "white";
      canvasContext.lineWidth = 1;

      canvasContext.beginPath();
      canvasContext.rect(
        this.selectRect.x + context.offset.x,
        this.selectRect.y + context.offset.y,
        this.selectRect.w,
        this.selectRect.h
      );
      canvasContext.stroke();
    } else {
      context.canvas.style.cursor = "";
    }
  },
};

export default Select;
