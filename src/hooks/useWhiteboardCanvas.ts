import localforage from "localforage";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { adjust } from "../lib/offsetHelpers.js";
import { distance as distanceBetween } from "../lib/utils.ts";
import useCanvasListeners from "./useCanvasListeners.ts";
import useEffectAsync from "./useEffectAsync.js";
import useWhiteboardRendering from "./useWhiteboardRendering.js";
import Draw from "../tools/draw.ts";
import { DocumentData } from "../lib/types.ts";
import Erase from "../tools/erase.ts";
import Select from "../tools/select.ts";

/*
  data format:
  {
    points: [{ x, y }, ...],
    color: 'white',
    size: 4
  }
*/

async function saveToStorage(path: string, data: DocumentData) {
  if (!path) return;

  const store = localforage.createInstance({
    name: "notes",
  });

  await store.setItem(path, data);
}

export default function useWhiteboardCanvas(
  canvas: React.MutableRefObject<HTMLCanvasElement>,
  data: React.MutableRefObject<DocumentData>,
  path: string,
  options: { tool: string; size: number; color: string }
) {
  const { tool, size, color } = options;
  const mousePosition = useRef({ x: 0, y: 0 });

  const selectedIndexes = useRef([]);
  const selectRect = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const offset = useRef({ x: 0, y: 0 });

  const currentTool = useMemo(() => {
    return {
      draw: Draw,
      erase: Erase,
      select: Select,
    }[tool];
  }, [tool]);

  const renderCurrentTool = useCallback(() => {
    currentTool?.render?.call(currentTool, {
      canvas: canvas.current,
      color,
      size,
      data,
      offset: offset.current,
    });
  }, [currentTool]);

  const render = useWhiteboardRendering(
    canvas,
    data,
    currentTool,
    selectedIndexes,
    offset,
    renderCurrentTool
  );

  useEffectAsync(async () => {
    const store = localforage.createInstance({
      name: "notes",
    });

    data.current = (path && (await store.getItem(path))) || [];
    render();
  }, [path]);

  function markDirty() {
    saveToStorage(path, data.current);
    render();
  }

  useCanvasListeners(canvas.current, {
    move(pos, e, lastPos, originalPos, isDown) {
      // console.log(pos, distanceBetween(pos, lastPos));
      e.preventDefault();
      e.stopPropagation();

      const adjustedPos = adjust(pos, offset.current, -1);
      mousePosition.current = adjustedPos;

      currentTool?.onMove?.call(currentTool, {
        canvas: canvas.current,
        color,
        size,
        data,
        e,
        offset: offset.current,
        markDirty,
        mouse: {
          isDown,
          viewportPosition: {
            current: pos,
            last: lastPos,
            original: originalPos,
          },
          documentPosition: {
            current: mousePosition.current,
            last: adjust(lastPos, offset.current, -1),
            original: adjust(originalPos, offset.current, -1),
          },
        },
      });

      return false;
    },
    up(pos, e, lastPos, originalPos) {
      const adjustedPos = adjust(pos, offset.current, -1);
      mousePosition.current = adjustedPos;

      currentTool?.onUp?.call(currentTool, {
        canvas: canvas.current,
        color,
        size,
        data,
        e,
        offset: offset.current,
        markDirty,
        mouse: {
          isDown: false,
          viewportPosition: {
            current: pos,
            last: lastPos,
            original: originalPos,
          },
          documentPosition: {
            current: mousePosition.current,
            last: adjust(lastPos, offset.current, -1),
            original: adjust(originalPos, offset.current, -1),
          },
        },
      });
    },
    down(pos, e) {
      e.preventDefault();
      e.stopPropagation();

      const adjustedPos = adjust(pos, offset.current, -1);

      mousePosition.current = adjustedPos;

      currentTool?.onDown?.call(currentTool, {
        canvas: canvas.current,
        color,
        size,
        data,
        e,
        offset: offset.current,
        markDirty,
        mouse: {
          isDown: true,
          viewportPosition: {
            current: pos,
            last: pos,
            original: pos,
          },
          documentPosition: {
            current: mousePosition.current,
            last: adjust(pos, offset.current, -1),
            original: adjust(pos, offset.current, -1),
          },
        },
      });

      return false;
    },
    leave(pos, e) {},
  });

  return { selectedIndexes, selectRect, mousePosition, offset };
}
