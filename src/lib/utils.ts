import { drawPolyLine } from "../tools/helpers.ts";
import { DocumentData, DocumentDataElement, Point, Rect } from "./types.js";
import {
  Dispatch,
  SetStateAction,
  type MutableRefObject,
  type RefCallback,
} from "react";

export const isFunction = (x: unknown) => typeof x === "function";
export const isNullOrUndefined = (x: unknown) => x === undefined || x === null;

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

type DataBounds = {
  leftMost: { value: number; padding: number };
  rightMost: { value: number; padding: number };
  topMost: { value: number; padding: number };
  bottomMost: { value: number; padding: number };
  paddedRect: Rect;
};
export function dataBounds(
  data: DocumentDataElement[],
  extraPadding: number | ((strokeSize: number) => number) = 0
): DataBounds | null {
  let leftMost: { value: number; padding: number } | null = null;
  let rightMost: { value: number; padding: number } | null = null;
  let topMost: { value: number; padding: number } | null = null;
  let bottomMost: { value: number; padding: number } | null = null;

  for (const d of data) {
    const padding =
      d.size +
      (typeof extraPadding === "function"
        ? extraPadding(d.size)
        : extraPadding);
    for (const p of d.points) {
      if (!leftMost || p.x - padding < leftMost.value - leftMost.padding) {
        leftMost = { value: p.x, padding };
      }
      if (!rightMost || p.x + padding > rightMost.value + rightMost.padding) {
        rightMost = { value: p.x, padding };
      }
      if (!topMost || p.y - padding < topMost.value - topMost.padding) {
        topMost = { value: p.y, padding };
      }
      if (
        !bottomMost ||
        p.y + padding > bottomMost.value + bottomMost.padding
      ) {
        bottomMost = { value: p.y, padding };
      }
    }
  }

  if (!leftMost || !rightMost || !topMost || !bottomMost) {
    return null;
  }

  const width =
    rightMost.value + rightMost.padding - (leftMost.value - leftMost.padding);
  const height =
    bottomMost.value + bottomMost.padding - (topMost.value - topMost.padding);

  return {
    leftMost,
    topMost,
    rightMost,
    bottomMost,
    paddedRect: {
      x: leftMost.value - leftMost.padding,
      y: topMost.value - topMost.padding,
      w: width,
      h: height,
    },
  };
}

export function normalizeData(
  data: DocumentDataElement[]
): DocumentDataElement[] {
  const bounds = dataBounds(data);
  if (!bounds) return [];

  const { leftMost, topMost } = bounds;

  return data.map((d) => {
    return {
      ...d,
      points: d.points.map((p) => ({
        x: p.x - leftMost.value + leftMost.padding,
        y: p.y - topMost.value + topMost.padding,
      })),
    };
  });
}

export function dataToImage(data: DocumentDataElement[]): Promise<Blob | null> {
  return new Promise((resolve, reject) => {
    const bounds = dataBounds(data);
    if (!bounds) return resolve(null);

    const { paddedRect } = bounds;

    const canvas = document.createElement("canvas");
    canvas.width = paddedRect.w;
    canvas.height = paddedRect.h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return reject("couldnt get canvas context");

    ctx.fillStyle = "#222";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const offset: Point = {
      x: -paddedRect.x,
      y: -paddedRect.y,
    };

    for (const d of data) {
      drawPolyLine(canvas, d.points, { color: d.color, size: d.size, offset });
    }

    canvas.toBlob((blob) => {
      if (!blob) return reject("couldnt make blob");

      resolve(blob);
    });
  });
}

type MutableRefList<T> = Array<
  RefCallback<T> | MutableRefObject<T> | undefined | null
>;

export function mergeRefs<T>(...refs: MutableRefList<T>): RefCallback<T> {
  return (val: T) => {
    setRef(val, ...refs);
  };
}

export function setRef<T>(val: T, ...refs: MutableRefList<T>): void {
  refs.forEach((ref) => {
    if (typeof ref === "function") {
      ref(val);
    } else if (!isNullOrUndefined(ref)) {
      ref.current = val;
    }
  });
}

export type SetStateType<T> = Dispatch<SetStateAction<T>>;
export type StateType<T, T2 = T> = [T, SetStateType<T2>];
