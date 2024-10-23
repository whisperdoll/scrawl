import localforage from "localforage";
import { useCallback, useEffect, useRef, useMemo } from "react";
import useWhiteboardCanvas from "../hooks/useWhiteboardCanvas.ts";
import useEffectAsync from "../hooks/useEffectAsync";
import "./Whiteboard.scss";

export default function Whiteboard({ path, size, toolConfig }) {
  const canvasEl = useRef(null);
  const data = useRef([]);

  useWhiteboardCanvas(canvasEl, data, path, toolConfig);

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

    canvasEl.current.addEventListener("contextmenu", fn);

    return () => {
      if (!canvasEl.current) {
        return;
      }

      canvasEl.current.removeEventListener("contextmenu", fn);
    };
  }, []);

  const canvas = useMemo(() => {
    return <canvas ref={canvasEl} className="Whiteboard" />;
  }, []);

  return <div>{canvas}</div>;
}
