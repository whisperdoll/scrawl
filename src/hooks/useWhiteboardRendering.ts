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
import { Tool } from "../tools/helpers.ts";

export default function useWhiteboardRendering(
  canvas: MutableRefObject<HTMLCanvasElement>,
  data: MutableRefObject<DocumentData>,
  tool: Tool | undefined,
  selectedIndexes: MutableRefObject<number[]>,
  offset: MutableRefObject<Point>,
  extra: () => any
) {
  const renderEnqueued = useRef(false);

  const render = useCallback(() => {
    // console.log("render");
    renderEnqueued.current = false;

    function xyForPt(pt: Point) {
      let adj = adjust(pt, offset.current);
      return [adj.x, adj.y];
    }

    const context = canvas.current.getContext("2d");
    if (!context) {
      throw new Error("couldnt get da context woops!");
    }
    context.lineCap = "round";
    context.lineJoin = "round";

    context.globalCompositeOperation = "source-over";

    context.clearRect(0, 0, canvas.current.width, canvas.current.height);

    data.current.forEach((stroke, strokeIndex) => {
      function xyFor(i: number): [number, number] {
        try {
          let pt = adjust(stroke.points[i], offset.current);
          return [pt.x, pt.y];
        } catch (e) {
          console.log(i);
          throw e;
        }
      }

      context.fillStyle = stroke.color;
      context.strokeStyle = stroke.color;
      context.lineWidth = stroke.size;

      context.globalCompositeOperation = "source-over";

      context.beginPath();

      context.moveTo(...xyFor(0));

      for (let i = 1; i < stroke.points.length; i++) {
        context.lineTo(...xyFor(i));
      }

      context.stroke();
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
