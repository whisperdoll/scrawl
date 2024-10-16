import {
  MutableRefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { adjust } from "../lib/offsetHelpers.js";
import useAnimationFrame from "./useAnimationFrame.js";
import { DocumentData, Point } from "../lib/types.ts";
import { drawPolyLine, Tool } from "../tools/helpers.ts";

export default function useWhiteboardRendering(
  canvas: MutableRefObject<HTMLCanvasElement>,
  data: MutableRefObject<DocumentData>,
  tool: Tool | null,
  selectedIndexes: MutableRefObject<number[]>,
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

    data.current.forEach((stroke) => {
      drawPolyLine(canvas.current, stroke.points, {
        color: stroke.color,
        size: stroke.size,
        offset: offset.current,
      });
    });

    extra();
  }, [tool, extra]);

  const enqueueRender = useCallback(() => {
    if (renderEnqueued.current) return;

    renderEnqueued.current = true;
    window.requestAnimationFrame(render);
  }, [render]);

  return enqueueRender;
}
