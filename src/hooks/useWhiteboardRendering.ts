import {
  MutableRefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { adjust } from "../lib/offsetHelpers.ts";
import useAnimationFrame from "./useAnimationFrame.js";
import { DocumentData, Point, Rect } from "../lib/types.ts";
import { drawPolyLine, Tool } from "../tools/helpers.ts";
import { dataBounds, pointArray } from "../lib/utils.ts";

export default function useWhiteboardRendering(
  canvas: MutableRefObject<HTMLCanvasElement>,
  data: MutableRefObject<DocumentData>,
  tool: Tool | null,
  selectedIndexes: MutableRefObject<number[]>,
  selectRect: MutableRefObject<Rect | null>,
  offset: MutableRefObject<Point>,
  extra: () => any
) {
  const renderEnqueued = useRef(false);

  const render = useCallback(() => {
    // console.log("render");
    renderEnqueued.current = false;

    const context = canvas.current.getContext("2d");
    if (!context) {
      throw new Error("couldnt get da context woops!");
    }
    context.lineCap = "round";
    context.lineJoin = "round";

    context.globalCompositeOperation = "source-over";

    context.clearRect(0, 0, canvas.current.width, canvas.current.height);

    for (const stroke of selectedIndexes.current.map((i) => data.current[i])) {
      drawPolyLine(canvas.current, stroke.points, {
        color: "#773",
        size: stroke.size * 2,
        offset: offset.current,
      });
    }

    data.current.forEach((stroke) => {
      drawPolyLine(canvas.current, stroke.points, {
        color: stroke.color,
        size: stroke.size,
        offset: offset.current,
      });
    });

    if (selectRect.current) {
      context.fillStyle = "white";
      context.strokeStyle = "white";
      context.lineWidth = 1;
      context.setLineDash([3, 3]);

      context.beginPath();
      context.rect(
        selectRect.current.x + offset.current.x,
        selectRect.current.y + offset.current.y,
        selectRect.current.w,
        selectRect.current.h
      );
      context.stroke();
      context.setLineDash([]);
    }

    extra();
  }, [tool, extra]);

  const enqueueRender = useCallback(() => {
    if (renderEnqueued.current) return;

    renderEnqueued.current = true;
    window.requestAnimationFrame(render);
  }, [render]);

  return enqueueRender;
}
