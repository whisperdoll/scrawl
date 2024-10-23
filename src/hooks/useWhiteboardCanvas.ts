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
  multiplyPt,
  normalizeData,
  rectContainsPoint,
  viewportToDocument,
} from "../lib/utils.ts";
import useCanvasListeners from "./useCanvasListeners.ts";
import useEffectAsync from "./useEffectAsync.js";
import useWhiteboardRendering from "./useWhiteboardRendering.js";
import Draw from "../tools/draw.ts";
import {
  DocumentData,
  DocumentDataElement,
  Point,
  Rect,
} from "../lib/types.ts";
import Erase from "../tools/erase.ts";
import Select from "../tools/select.ts";
import {
  KeyEventContext,
  RenderContext,
  SelectContext,
  Tool,
  ToolContext as ToolEventContext,
} from "../tools/helpers.ts";
import Lasso from "../tools/lasso.ts";
import { ToolContext } from "../contexts/contexts.ts";
import useSaveDocument from "./useSaveDocument.ts";

export default function useWhiteboardCanvas(
  canvas: React.MutableRefObject<HTMLCanvasElement>,
  data: React.MutableRefObject<DocumentData>,
  path: string,
  options: { tool: string; size: number; color: string }
) {
  const { tool, size, color } = options;
  const [_tool, setTool] = useContext(ToolContext);

  const selectedIndexes = useRef<number[]>([]);
  const selectRect = useRef<Rect | null>(null);
  const isMovingSelection = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const touchScrollAllowed = useRef(true);
  const isTouchScrolling = useRef(false);
  const zoom = useRef(1);
  const undoStack = useRef<DocumentData[]>([]);
  const redoStack = useRef<DocumentData[]>([]);

  const saveToStorage = useSaveDocument();

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
      zoom: zoom.current,
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
    zoom,
    renderCurrentTool
  );

  const markDirty = useCallback(() => {
    saveToStorage(path, data.current);
    render();
  }, [render, path]);

  const pushUndo = useCallback(() => {
    undoStack.current.push(structuredClone(data.current));
    redoStack.current = [];
  }, [undoStack, redoStack, data]);

  const undo = useCallback(() => {
    if (undoStack.current.length === 0) return;

    const lastState = undoStack.current.pop()!;
    redoStack.current.push(data.current);
    data.current = lastState;
    markDirty();
  }, [undoStack, redoStack, data]);

  const redo = useCallback(() => {
    if (redoStack.current.length === 0) return;

    const targetState = redoStack.current.pop()!;
    undoStack.current.push(data.current);
    data.current = targetState;
    markDirty();
  }, [undoStack, redoStack, data]);

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

  // scroll
  useEffect(() => {
    const onScroll = (e: WheelEvent) => {
      e.preventDefault();

      if (e.ctrlKey) {
        const pt = { x: e.offsetX, y: e.offsetY };
        const beforePos = viewportToDocument(pt, zoom.current, offset.current);
        const factor =
          e.deltaY < 0 ? (-e.deltaY / 100) * 1.2 : 1 / ((e.deltaY / 100) * 1.2);
        zoom.current *= factor;
        const afterPos = viewportToDocument(pt, zoom.current, offset.current);
        const delta = {
          x: afterPos.x - beforePos.x,
          y: afterPos.y - beforePos.y,
        };
        offset.current = {
          x: offset.current.x + delta.x * zoom.current,
          y: offset.current.y + delta.y * zoom.current,
        };
      } else {
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
      }

      render();
    };

    canvas.current.addEventListener("wheel", onScroll);

    return () => {
      canvas.current.removeEventListener("wheel", onScroll);
    };
  }, []);

  async function copySelection() {
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
  }

  function deleteSelection() {
    selectedIndexes.current
      .sort((a, b) => b - a)
      .forEach((index) => {
        data.current.splice(index, 1);
      });

    setSelectedIndexes([]);
  }

  // keys
  useEffect(() => {
    const keyEventContext: (e: KeyboardEvent) => KeyEventContext = (e) => ({
      canvas: canvas.current,
      color,
      size,
      data,
      offset: offset.current,
      zoom: zoom.current,
      selectedIndexes: selectedIndexes.current,
      setSelectedIndexes,
      markDirty,
      undo,
      redo,
      pushUndo,
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
      } else if (e.key === "z" && e.ctrlKey && !e.shiftKey) {
        undo();
      }
      if (e.ctrlKey && (e.key === "y" || (e.key === "Z" && e.shiftKey))) {
        redo();
      } else if (
        selectedIndexes.current.length &&
        (e.key === "Delete" || e.key === "Backspace")
      ) {
        pushUndo();

        deleteSelection();

        markDirty();
      } else if (e.key === "c" && e.ctrlKey && selectedIndexes.current.length) {
        await copySelection();
      } else if (e.ctrlKey && e.key === "x") {
        await copySelection();
        pushUndo();
        deleteSelection();
        markDirty();
      } else if (e.key === "v" && e.ctrlKey) {
        let pushedUndo = false;
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

            if (!pushedUndo) {
              pushUndo();
              pushedUndo = true;
            }

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

  // tool selection
  useEffect(() => {
    const selectContext: SelectContext = {
      canvas: canvas.current,
      color,
      size,
      data,
      offset: offset.current,
      zoom: zoom.current,
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

  // load
  useEffectAsync(async () => {
    const store = localforage.createInstance({
      name: "notes",
    });

    data.current = (path && (await store.getItem(path))) || [];
    offset.current = { x: 0, y: 0 };
    render();
  }, [path]);

  function getDocumentPosition(rawMousePos: Point): Point {
    return viewportToDocument(rawMousePos, zoom.current, offset.current);
  }

  useCanvasListeners(canvas.current, {
    move(pos, e, lastPos, originalPos, isDown) {
      // console.log(pos, distanceBetween(pos, lastPos));
      e.preventDefault();
      e.stopPropagation();

      // touch scrolling
      if (isTouchScrolling.current) {
        offset.current = {
          x: offset.current.x + (pos.x - lastPos.x),
          y: offset.current.y + (pos.y - lastPos.y),
        };

        render();
        return false;
      }

      const context: ToolEventContext = {
        canvas: canvas.current,
        color,
        size,
        data,
        e,
        offset: offset.current,
        zoom: zoom.current,
        selectedIndexes: selectedIndexes.current,
        setSelectedIndexes,
        markDirty,
        undo,
        redo,
        pushUndo,
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
            current: getDocumentPosition(pos),
            last: getDocumentPosition(lastPos),
            original: getDocumentPosition(originalPos),
          },
        },
      };

      // selection
      canvas.current.style.cursor =
        selectRect.current &&
        rectContainsPoint(
          selectRect.current,
          context.mouse.documentPosition.current
        )
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
      if (isTouchScrolling.current) {
        isTouchScrolling.current = false;
        return false;
      }

      if (isMovingSelection.current) {
        isMovingSelection.current = false;
        touchScrollAllowed.current = true;
        return false;
      }

      currentTool?.onUp?.call(currentTool, {
        canvas: canvas.current,
        color,
        size,
        data,
        e,
        offset: offset.current,
        zoom: zoom.current,
        selectedIndexes: selectedIndexes.current,
        setSelectedIndexes,
        markDirty,
        undo,
        redo,
        pushUndo,
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
            current: getDocumentPosition(pos),
            last: getDocumentPosition(lastPos),
            original: getDocumentPosition(originalPos),
          },
        },
      });
    },
    down(pos, e) {
      e.preventDefault();
      e.stopPropagation();

      // touch scrolling
      if (
        touchScrollAllowed.current &&
        (e.pointerType === "touch" || e.button === 1)
      ) {
        isTouchScrolling.current = true;
        return false;
      }

      // selection
      if (
        selectRect.current &&
        rectContainsPoint(selectRect.current, getDocumentPosition(pos))
      ) {
        isMovingSelection.current = true;
        touchScrollAllowed.current = false;
        return false;
      }

      if (selectedIndexes.current.length) setSelectedIndexes([]);

      currentTool?.onDown?.call(currentTool, {
        canvas: canvas.current,
        color,
        size,
        data,
        e,
        offset: offset.current,
        zoom: zoom.current,
        selectedIndexes: selectedIndexes.current,
        setSelectedIndexes,
        markDirty,
        undo,
        redo,
        pushUndo,
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
            current: getDocumentPosition(pos),
            last: getDocumentPosition(pos),
            original: getDocumentPosition(pos),
          },
        },
      });

      return false;
    },
    leave(pos, e) {},
  });
}
