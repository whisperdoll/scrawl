import { adjust } from "../lib/offsetHelpers.js";
import { DocumentData, Point } from "../lib/types.ts";
import { pointArray } from "../lib/utils.ts";

export interface Tool {
  onMove?: (context: ToolContext) => any;
  onUp?: (context: ToolContext) => any;
  onDown?: (context: ToolContext) => any;
  onSelect?: (context: SelectContext) => any;
  onDeselect?: (context: SelectContext) => any;
  render?: (context: RenderContext) => any;
}

export interface RenderContext {
  canvas: HTMLCanvasElement;
  offset: Point;
  data: React.MutableRefObject<DocumentData>;
  color: string;
  size: number;
}

export interface SelectContext extends RenderContext {
  markDirty: () => void;
  allowTouchScroll: () => void;
  disallowTouchScroll: () => void;
}

export interface ToolContext extends SelectContext {
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
}

export function drawPolyLine(
  canvas: HTMLCanvasElement,
  points: Point[],
  options: {
    color: string;
    size: number;
    offset: Point;
    drawMode?: "document" | "viewport";
    lineDash?: number[];
  }
) {
  if (points.length === 0) return;

  const canvasContext = canvas.getContext("2d");
  if (!canvasContext) {
    throw new Error("couldnt get context lol");
  }

  canvasContext.lineCap = "round";
  canvasContext.lineJoin = "round";

  canvasContext.fillStyle = options.color;
  canvasContext.strokeStyle = options.color;
  canvasContext.lineWidth = options.size;
  canvasContext.setLineDash(options.lineDash || []);

  const adjustedPoints =
    options?.drawMode === "viewport"
      ? points
      : points.map((p) => adjust(p, options.offset));

  canvasContext.beginPath();
  canvasContext.moveTo(...pointArray(adjustedPoints[0]));
  for (let i = 1; i < adjustedPoints.length; i++) {
    canvasContext.lineTo(...pointArray(adjustedPoints[i]));
  }
  canvasContext.stroke();
}

export function drawLine(
  canvas: HTMLCanvasElement,
  from: Point,
  to: Point,
  options: {
    color: string;
    size: number;
    offset: Point;
    drawMode?: "document" | "viewport";
    lineDash?: number[];
  }
) {
  drawPolyLine(canvas, [from, to], options);
}
