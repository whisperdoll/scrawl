import localforage from "localforage";
import { useEffect, useRef } from "react";
import { adjust } from "../lib/offsetHelpers";
import rectContainsPt from "../lib/rectContainsPt";
import useCanvasListeners from "./useCanvasListeners";
import useEffectAsync from "./useEffectAsync";
import useWhiteboardRendering from "./useWhiteboardRendering";

/*
  data format:
  {
    points: [{ x, y }, ...],
    color: 'white',
    size: 4
  }
*/

async function saveToStorage(path, data) {
  if (!path) return;

  const store = localforage.createInstance({
    name: 'notes'
  });

  await store.setItem(path, data);
}

export default function useWhiteboardCanvas(canvas, data, tool, path) {
  const mouseDown = useRef(false);
  const isErasing = useRef(false);
  const lastRecorded = useRef({ x: 0, y: 0 });
  const mousePosition = useRef({ x: 0, y: 0 });
  const lastPosition = useRef({ x: 0, y: 0 });

  const selectedIndexes = useRef([]);
  const moveAction = useRef('select'); // 'select' or 'move'
  const selectRect = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const originalMovePt = useRef({ x: 0, y: 0 });
  const offset = useRef({ x: 0, y: 0 });
  
  useWhiteboardRendering(canvas, data, tool, selectedIndexes, selectRect, mousePosition, offset);

  useEffectAsync(async () => {
    const store = localforage.createInstance({
      name: 'notes'
    });

    data.current = (path && (await store.getItem(path))) || [];
  }, [path]);

  useCanvasListeners(canvas.current, {
    move(pos, e, lastPos, originalPos, isDown) {
      e.preventDefault();
      e.stopPropagation();

      const adjustedPos = adjust(pos, offset.current, -1);
      mousePosition.current = adjustedPos;

      if (!isDown) return false;

      // touch scrolling
      if (e.pointerType === 'touch') {
        offset.current = { 
          x: offset.current.x + (pos.x - lastPos.x),
          y: offset.current.y + (pos.y - lastPos.y)
        };

        return false;
      }

      // select and move
      if (tool === 'select') {
        if (e.button !== -1) {
          return false;
        }

        if (moveAction.current === 'select') {
          selectRect.current = {
            x: Math.min(originalPos.x, pos.x) - offset.current.x,
            y: Math.min(originalPos.y, pos.y) - offset.current.y,
            w: Math.abs(originalPos.x - pos.x),
            h: Math.abs(originalPos.y - pos.y)
          };
        } else {
          selectedIndexes.current.forEach((i) => {
            data.current[i].points.forEach((pt) => {
              pt.x += (pos.x - lastPos.x);
              pt.y += (pos.y - lastPos.y);
            });
          });

          selectRect.current.x += (pos.x - lastPos.x);
          selectRect.current.y += (pos.y - lastPos.y);
        }
        return false;
      }

      const distance = Math.sqrt((adjustedPos.x - lastRecorded.current.x)**2 + (adjustedPos.y - lastRecorded.current.y)**2);

      // normal recording
      if (!isErasing.current) {
        if (distance < data.current.at(-1).size / 2) return false;
        
        data.current.at(-1).points.push(adjustedPos);
        lastRecorded.current = adjustedPos;

        return false;
      }

      // erasing
      if (distance < 8) return false;

      const a = lastRecorded.current;
      const b = adjustedPos;

      function ccw(a, b, c) {
        return (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
      }

      function intersect(a, b, c, d, r) {
        // make dots easier to erase
        if (c.x === d.x && c.y === d.y) {
          const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
          return Math.sqrt((mid.x - c.x)**2 + (mid.y - c.y)**2) <= r;
        }
  
        return ccw(a, c, d) != ccw(b, c, d) && ccw(a, b, c) != ccw(a, b, d);
      }

      const toErase = [];

      for (let i = 0; i < data.current.length; i++) {
        const points = data.current[i].points;

        for (let j = 0; j < points.length - 1; j++) {
          const c = points[j];
          const d = points[j + 1];

          if (intersect(a, b, c, d, data.current[i].size)) {
            toErase.push(i);
            break;
          }
        }
      }

      toErase.sort((a, b) => b - a).forEach((index) => {
        data.current.splice(index, 1);
      });

      lastRecorded.current = adjustedPos;

      return false;
    },
    up(pos, e, originalPos) {
      e.preventDefault();
      e.stopPropagation();

      const adjustedPos = adjust(pos, offset.current, -1);

      mouseDown.current = false;
      mousePosition.current = adjustedPos;

      // touch scrolling or erasing
      if (e.pointerType === 'touch' || isErasing.current) {
        return false;
      }

      // select and move
      if (tool === 'select') {
        if (moveAction.current === 'select') {
          selectRect.current = {
            x: Math.min(originalPos.x, pos.x) - offset.current.x,
            y: Math.min(originalPos.y, pos.y) - offset.current.y,
            w: Math.abs(originalPos.x - pos.x),
            h: Math.abs(originalPos.y - pos.y)
          };
          moveAction.current = 'move';

          let leftMost, rightMost, topMost, bottomMost;

          selectedIndexes.current = data.current.map((stroke, i) => {
            if (stroke.points.filter(pt => rectContainsPt(selectRect.current, pt)).length > stroke.points.length / 2) {
              stroke.points.forEach((pt) => {
                if (leftMost === undefined || pt.x - stroke.size * 4 < leftMost) {
                  leftMost = pt.x - stroke.size * 4;
                }
                if (rightMost === undefined || pt.x + stroke.size * 4 > rightMost) {
                  rightMost = pt.x + stroke.size * 4;
                }
                if (topMost === undefined || pt.y - stroke.size * 4 < topMost) {
                  topMost = pt.y - stroke.size * 4;
                }
                if (bottomMost === undefined || pt.y + stroke.size * 4 > bottomMost) {
                  bottomMost = pt.y + stroke.size * 4;
                }
              });

              return i;
            } else {
              return null;
            }
          }).filter(i => i !== null);

          if (selectedIndexes.current.length === 0) {
            selectRect.current = null;
          } else if (leftMost && rightMost && topMost && bottomMost) {
            selectRect.current = {
              x: leftMost,
              y: topMost,
              w: rightMost - leftMost,
              h: bottomMost - topMost
            };
          }
        } else {
          // selectedIndexes.current.forEach((stroke) => {
          //   stroke.points.forEach((pt) => {
          //     pt.x += adjustedPos.x - originalMovePt.current.x;
          //     pt.y += adjustedPos.y - originalMovePt.current.y;
          //   });
          // });
        }
        return false;
      }

      data.current.at(-1).points.push(adjustedPos);
      // api.post('/note/draw', { path, data: data.current.at(-1) });

      saveToStorage(path, data.current);
    },
    down(pos, e) {
      e.preventDefault();
      e.stopPropagation();

      const adjustedPos = adjust(pos, offset.current, -1);

      mouseDown.current = true;
      lastPosition.current = adjustedPos;
      mousePosition.current = adjustedPos;
      lastRecorded.current = adjustedPos;
      isErasing.current = e.button === 2 || e.button === 5;

      if (e.button === 2  || e.button === 5) return false;

      // select and move
      if (tool === 'select') {
        if (selectRect.current && rectContainsPt(selectRect.current, adjustedPos)) {
          moveAction.current = 'move';
          originalMovePt.current = adjustedPos;
        } else {
          moveAction.current = 'select';
        }

        return false;
      }

      if (e.button === 0) {
        data.current.push({
          action: 'draw',
          size: 5,
          color: '#eeeeee',
          points: [adjustedPos]
        });
      }

      return false;
    },
    leave(pos, e) {

    }
  });

  return { selectedIndexes, selectRect, mousePosition, offset };
}