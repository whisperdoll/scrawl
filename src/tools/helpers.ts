import { adjust } from "../lib/offsetHelpers.js";
import { DocumentData, Point } from "../lib/types.ts";

export interface Tool {
  onMove?: (context: ToolContext) => any;
  onUp?: (context: ToolContext) => any;
  onDown?: (context: ToolContext) => any;
  onSelect?: (context: ToolContext) => any;
  onDeselect?: (context: ToolContext) => any;
  render?: (context: RenderContext) => any;
}

export interface RenderContext {
  canvas: HTMLCanvasElement;
  offset: Point;
  data: React.MutableRefObject<DocumentData>;
  color: string;
  size: number;
}

export interface ToolContext extends RenderContext {
  e: PointerEvent;
  mouse: {
    isDown: boolean;
    viewportPosition: {
      current: Point;
      last: Point;
      original: Point;
    };
    documentPosition: {
      current: Point;
      last: Point;
      original: Point;
    };
  };
  markDirty: () => any;
}

export function drawLine(
  context: ToolContext,
  from: Point,
  to: Point,
  options?: {
    color?: string;
    size?: number;
    drawMode?: "document" | "viewport";
  }
) {
  const canvasContext = context.canvas.getContext("2d");
  if (!canvasContext) {
    throw new Error("couldnt get context lol");
  }

  canvasContext.lineCap = "round";
  canvasContext.lineJoin = "round";

  canvasContext.fillStyle = options?.color || context.color;
  canvasContext.strokeStyle = options?.color || context.color;
  canvasContext.lineWidth = options?.size || context.size;

  const adjustedFrom =
    options?.drawMode === "viewport" ? from : adjust(from, context.offset, -1);
  const adjustedTo =
    options?.drawMode === "viewport" ? to : adjust(to, context.offset, -1);

  canvasContext.beginPath();
  canvasContext.moveTo(adjustedFrom.x, adjustedFrom.y);
  canvasContext.lineTo(adjustedTo.x, adjustedTo.y);
  canvasContext.stroke();
}
