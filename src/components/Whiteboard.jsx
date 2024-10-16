import localforage from "localforage";
import { useCallback, useEffect, useRef, useMemo } from "react";
import useWhiteboardCanvas from "../hooks/useWhiteboardCanvas.ts";
import useEffectAsync from "../hooks/useEffectAsync";
import "./Whiteboard.scss";

export default function Whiteboard({ path, size, toolConfig }) {
  const canvasEl = useRef(null);
  const data = useRef([]);

  const lastScrollTime = useRef(0);
  const lastScrollDirections = useRef([]);

  const { offset } = useWhiteboardCanvas(canvasEl, data, path, toolConfig);

  useEffectAsync(async () => {
    offset.current = { x: 0, y: 0 };
  }, [path]);

  useEffect(() => {
    if (!canvasEl.current) return;

    const context = canvasEl.current.getContext("2d");

    const imageData = context.getImageData(
      0,
      0,
      canvasEl.current.width,
      canvasEl.current.height
    );

    canvasEl.current.width = size.width;
    canvasEl.current.height = size.height;

    context.putImageData(imageData, 0, 0);
  }, [size]);

  useEffect(() => {
    if (!canvasEl.current) {
      return;
    }

    const fn = (e) => {
      e.preventDefault();
      return false;
    };

    const scrollFn = (e) => {
      if (e.shiftKey) {
        offset.current = {
          x: offset.current.x - e.deltaY,
          y: offset.current.y - e.deltaX,
        };
      } else {
        offset.current = {
          x: offset.current.x - e.deltaX,
          y: offset.current.y - e.deltaY,
        };
      }
    };

    canvasEl.current.addEventListener("contextmenu", fn);
    canvasEl.current.addEventListener("wheel", scrollFn);

    return () => {
      if (!canvasEl.current) {
        return;
      }

      canvasEl.current.removeEventListener("contextmenu", fn);
      canvasEl.current.removeEventListener("wheel", scrollFn);
    };
  }, []);

  const canvas = useMemo(() => {
    return <canvas ref={canvasEl} className="Whiteboard" />;
  }, []);

  return <div>{canvas}</div>;
}
