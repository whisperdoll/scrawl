import localforage from "localforage";
import {
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { adjust } from "../lib/offsetHelpers.ts";
import {
  dataBounds,
  dataToImage,
  distance as distanceBetween,
  normalizeData,
  rectContainsPoint,
} from "../lib/utils.ts";
import useCanvasListeners from "./useCanvasListeners.ts";
import useEffectAsync from "./useEffectAsync.js";
import useWhiteboardRendering from "./useWhiteboardRendering.js";
import Draw from "../tools/draw.ts";
import { DocumentData, DocumentDataElement, Rect } from "../lib/types.ts";
import Erase from "../tools/erase.ts";
import Select from "../tools/select.ts";
import {
  KeyEventContext,
  RenderContext,
  SelectContext,
  Tool,
} from "../tools/helpers.ts";
import Lasso from "../tools/lasso.ts";
import { ToolContext } from "../contexts/contexts.ts";

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
  const [_tool, setTool] = useContext(ToolContext);
  const mousePosition = useRef({ x: 0, y: 0 });

  const selectedIndexes = useRef<number[]>([]);
  const selectRect = useRef<Rect | null>(null);
  const isMovingSelection = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const touchScrollAllowed = useRef(true);
  const isTouchScrolling = useRef(false);

  const currentTool: Tool | null = useMemo(() => {
    return (
      {
        draw: Draw,
        erase: Erase,
        select: Select,
        lasso: Lasso,
      }[tool] || null
    );
  }, [tool]);

  const lastTool = useRef<Tool | null>(null);

  const renderCurrentTool = useCallback(() => {
    currentTool?.render?.call(currentTool, {
      canvas: canvas.current,
      color,
      size,
      data,
      offset: offset.current,
      selectedIndexes: selectedIndexes.current,
      setSelectedIndexes,
    });
  }, [currentTool]);

  const render = useWhiteboardRendering(
    canvas,
    data,
    currentTool,
    selectedIndexes,
    selectRect,
    offset,
    renderCurrentTool
  );

  const markDirty = useCallback(() => {
    saveToStorage(path, data.current);
    render();
  }, [render]);

  const setSelectedIndexes: RenderContext["setSelectedIndexes"] = useCallback(
    (indexes: SetStateAction<number[]>) => {
      if (typeof indexes === "function") {
        selectedIndexes.current = indexes(selectedIndexes.current);
      } else {
        selectedIndexes.current = indexes;
      }

      const bounds = dataBounds(
        selectedIndexes.current.map((i) => data.current[i]),
        (s) => s * 4
      );

      selectRect.current = bounds?.paddedRect || null;
      markDirty();
    },
    [selectedIndexes, selectRect, markDirty]
  );

  useEffect(() => {
    const keyEventContext: (e: KeyboardEvent) => KeyEventContext = (e) => ({
      canvas: canvas.current,
      color,
      size,
      data,
      offset: offset.current,
      selectedIndexes: selectedIndexes.current,
      setSelectedIndexes,
      markDirty,
      allowTouchScroll() {
        touchScrollAllowed.current = true;
      },
      disallowTouchScroll() {
        touchScrollAllowed.current = false;
      },
      e,
    });

    const onKeyDown = async (e: KeyboardEvent) => {
      if (e.key === "d") {
        setTool("draw");
      } else if (e.key === "e") {
        setTool("erase");
      } else if (e.key === "s") {
        setTool("select");
      } else if (e.key === "l" || e.key === "w") {
        setTool("lasso");
      } else if (
        selectedIndexes.current.length &&
        (e.key === "Delete" || e.key === "Backspace")
      ) {
        selectedIndexes.current
          .sort((a, b) => b - a)
          .forEach((index) => {
            data.current.splice(index, 1);
          });

        setSelectedIndexes([]);

        markDirty();
      } else if (e.key === "c" && e.ctrlKey && selectedIndexes.current.length) {
        const copied = selectedIndexes.current.map((i) => data.current[i]);
        const blob = await dataToImage(copied);
        if (!blob) return;
        const clipboardItem = new ClipboardItem({
          "image/png": blob,
          "text/plain": new Blob(
            [JSON.stringify({ __id: "scrawl", data: normalizeData(copied) })],
            {
              type: "text/plain",
            }
          ),
        });
        navigator.clipboard.write([clipboardItem]);
      } else if (e.key === "v" && e.ctrlKey) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          if (item.types.includes("text/plain")) {
            const blob = await item.getType("text/plain");
            const text = await blob.text();

            let json;

            try {
              json = JSON.parse(text);
            } catch (e) {
              continue;
            }

            if (
              !(
                json.hasOwnProperty("__id") &&
                json.__id === "scrawl" &&
                json.hasOwnProperty("data")
              )
            ) {
              continue;
            }

            const pastingData: DocumentDataElement[] = json.data;
            const bounds = dataBounds(pastingData);
            if (!bounds) continue;
            const width = bounds.paddedRect.w;
            const height = bounds.paddedRect.h;

            const startIndex = data.current.length;

            data.current.push(
              ...pastingData.map((d) => ({
                ...d,
                points: d.points.map((p) =>
                  adjust(adjust(p, offset.current, -1), {
                    x: canvas.current.width / 2 - width / 2,
                    y: canvas.current.height / 2 - height / 2,
                  })
                ),
              }))
            );

            const indexes = new Array(data.current.length - startIndex)
              .fill(0)
              .map((_, i) => i + startIndex);

            setSelectedIndexes(indexes);
            markDirty();
          }
        }
      }

      currentTool?.onKeyDown?.call(currentTool, keyEventContext(e));
    };

    const onKeyUp = (e: KeyboardEvent) => {
      currentTool?.onKeyUp?.call(currentTool, keyEventContext(e));
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
    };
  });

  useEffect(() => {
    const selectContext: SelectContext = {
      canvas: canvas.current,
      color,
      size,
      data,
      offset: offset.current,
      selectedIndexes: selectedIndexes.current,
      setSelectedIndexes,
      markDirty,
      allowTouchScroll() {
        touchScrollAllowed.current = true;
      },
      disallowTouchScroll() {
        touchScrollAllowed.current = false;
      },
    };

    if (lastTool.current) {
      lastTool.current.onDeselect?.call(lastTool.current, selectContext);
    }

    lastTool.current = currentTool;
    currentTool?.onSelect?.call(currentTool, selectContext);
  }, [currentTool]);

  useEffectAsync(async () => {
    const store = localforage.createInstance({
      name: "notes",
    });

    data.current = (path && (await store.getItem(path))) || [];
    render();
  }, [path]);

  useCanvasListeners(canvas.current, {
    move(pos, e, lastPos, originalPos, isDown) {
      // console.log(pos, distanceBetween(pos, lastPos));
      e.preventDefault();
      e.stopPropagation();

      const adjustedPos = adjust(pos, offset.current, -1);
      mousePosition.current = adjustedPos;

      // touch scrolling
      if (isTouchScrolling.current) {
        offset.current = {
          x: offset.current.x + (pos.x - lastPos.x),
          y: offset.current.y + (pos.y - lastPos.y),
        };

        render();
        return false;
      }

      const context = {
        canvas: canvas.current,
        color,
        size,
        data,
        e,
        offset: offset.current,
        selectedIndexes: selectedIndexes.current,
        setSelectedIndexes,
        markDirty,
        allowTouchScroll() {
          touchScrollAllowed.current = true;
        },
        disallowTouchScroll() {
          touchScrollAllowed.current = false;
        },
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
      };

      // selection
      canvas.current.style.cursor =
        selectRect.current && rectContainsPoint(selectRect.current, adjustedPos)
          ? "move"
          : "";
      if (isMovingSelection.current && selectRect.current) {
        const deltaX =
          context.mouse.documentPosition.current.x -
          context.mouse.documentPosition.last.x;
        const deltaY =
          context.mouse.documentPosition.current.y -
          context.mouse.documentPosition.last.y;
        for (const index of selectedIndexes.current) {
          for (const point of data.current[index].points) {
            point.x += deltaX;
            point.y += deltaY;
          }
        }

        selectRect.current = {
          x: selectRect.current.x + deltaX,
          y: selectRect.current.y + deltaY,
          w: selectRect.current.w,
          h: selectRect.current.h,
        };

        render();
        return false;
      }

      currentTool?.onMove?.call(currentTool, context);

      return false;
    },
    up(pos, e, lastPos, originalPos) {
      const adjustedPos = adjust(pos, offset.current, -1);
      mousePosition.current = adjustedPos;

      if (isTouchScrolling.current) {
        isTouchScrolling.current = false;
        return false;
      }

      if (isMovingSelection.current) {
        isMovingSelection.current = false;
        return false;
      }

      currentTool?.onUp?.call(currentTool, {
        canvas: canvas.current,
        color,
        size,
        data,
        e,
        offset: offset.current,
        selectedIndexes: selectedIndexes.current,
        setSelectedIndexes,
        markDirty,
        allowTouchScroll() {
          touchScrollAllowed.current = true;
        },
        disallowTouchScroll() {
          touchScrollAllowed.current = false;
        },
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

      // touch scrolling
      if (touchScrollAllowed && (e.pointerType === "touch" || e.button === 1)) {
        isTouchScrolling.current = true;
        return false;
      }

      // selection
      if (
        selectRect.current &&
        rectContainsPoint(selectRect.current, adjustedPos)
      ) {
        isMovingSelection.current = true;
        return false;
      }

      setSelectedIndexes([]);

      currentTool?.onDown?.call(currentTool, {
        canvas: canvas.current,
        color,
        size,
        data,
        e,
        offset: offset.current,
        selectedIndexes: selectedIndexes.current,
        setSelectedIndexes,
        markDirty,
        allowTouchScroll() {
          touchScrollAllowed.current = true;
        },
        disallowTouchScroll() {
          touchScrollAllowed.current = false;
        },
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
