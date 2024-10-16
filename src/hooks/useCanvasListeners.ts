import { useEffect, useRef } from "react";
import { Point } from "../lib/types.ts";

type Listeners = {
  move: (
    pos: Point,
    e: PointerEvent,
    lastPos: Point,
    originalPos: Point,
    isDown: boolean
  ) => any;
  up: (pos: Point, e: PointerEvent, lastPos: Point, originalPos: Point) => any;
  down: (pos: Point, e: PointerEvent) => any;
  leave: (pos: Point, e: PointerEvent) => any;
};

export default function useCanvasListeners(
  canvas: HTMLCanvasElement,
  listeners: Listeners
) {
  const originalPos = useRef({ x: 0, y: 0 });
  const lastPos = useRef({ x: 0, y: 0 });
  const currentPos = useRef({ x: 0, y: 0 });
  const isDown = useRef(false);

  useEffect(() => {
    if (!canvas) return;

    const move = (e: PointerEvent) => {
      const pos = posFromEvent(e);
      currentPos.current = pos;

      const ret = listeners.move(
        pos,
        e,
        lastPos.current,
        originalPos.current,
        isDown.current
      );

      lastPos.current = pos;
      return ret;
    };

    const down = (e: PointerEvent) => {
      const pos = posFromEvent(e);
      currentPos.current = pos;
      originalPos.current = pos;
      lastPos.current = pos;
      isDown.current = true;

      return listeners.down(pos, e);
    };

    const up = (e: PointerEvent) => {
      const pos = posFromEvent(e);
      currentPos.current = pos;
      lastPos.current = pos;
      isDown.current = false;

      return listeners.up(pos, e, lastPos.current, originalPos.current);
    };

    const leave = (e: PointerEvent) => {
      const pos = posFromEvent(e);
      currentPos.current = pos;
      lastPos.current = pos;

      listeners.leave(pos, e);
    };

    const stop = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointerout", leave);
    canvas.addEventListener("touchstart", stop);
    canvas.addEventListener("touchmove", stop);

    return () => {
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointerout", leave);
      canvas.removeEventListener("touchstart", stop);
      canvas.removeEventListener("touchmove", stop);
    };
  });

  function posFromEvent(e: PointerEvent): Point {
    return { x: e.offsetX, y: e.offsetY };
  }

  return [
    currentPos.current,
    lastPos.current,
    originalPos.current,
    isDown.current,
  ];
}
