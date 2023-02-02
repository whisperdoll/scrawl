import { useCallback, useEffect } from "react";
import { adjust, xyFor } from "../lib/offsetHelpers";
import rectContainsPt from "../lib/rectContainsPt";
import useAnimationFrame from "./useAnimationFrame";

export default function useWhiteboardRendering(canvas, data, tool, selectedIndexes, selectRect, mousePosition, offset) {
  const handleCanvasLogic = useCallback(() => {
    function xyForPt(pt) {
      let adj = adjust(pt, offset.current);
      return [adj.x, adj.y];
    }

    const context = canvas.current.getContext('2d');

    context.lineCap = 'round';
    context.lineJoin = 'round';

    context.globalCompositeOperation = 'source-over';

    context.clearRect(0, 0, canvas.current.width, canvas.current.height);

    data.current.forEach((stroke, strokeIndex) => {
      function xyFor(i) {
        try {
          let pt = adjust(stroke.points[i], offset.current);
          return [pt.x, pt.y];
        } catch (e) {
          console.log(i);
          throw e;
        }
      }
  
      if (selectedIndexes.current.includes(strokeIndex)) {
        context.fillStyle = '#773';
        context.strokeStyle = '#773';
        context.lineWidth = stroke.size * 2;

        context.beginPath();
  
        context.moveTo(...xyFor(0));
  
        for (let i = 1; i < stroke.points.length; i++) {
          context.lineTo(...xyFor(i));
        }
  
        context.stroke();
      }

      context.fillStyle = stroke.color;
      context.strokeStyle = stroke.color;
      context.lineWidth = stroke.size;

      context.globalCompositeOperation = 'source-over';

      context.beginPath();

      context.moveTo(...xyFor(0));

      for (let i = 1; i < stroke.points.length; i++) {
        context.lineTo(...xyFor(i));
      }

      context.stroke();
    });

    if (tool === 'select' && selectRect.current) {
      if (rectContainsPt(selectRect.current, mousePosition.current)) {
        canvas.current.style.cursor = 'move';
      } else {
        canvas.current.style.cursor = '';
      }

      context.globalCompositeOperation = 'source-over';
      context.fillStyle = 'white';
      context.strokeStyle = 'white';
      context.lineWidth = 1;

      context.beginPath();
      context.rect(...xyForPt(selectRect.current), selectRect.current.w, selectRect.current.h);
      context.stroke();
    } else if (tool === 'select' && !selectRect.current) {
      canvas.current.style.cursor = '';
    }
  }, [tool]);

  return useAnimationFrame(handleCanvasLogic);
}