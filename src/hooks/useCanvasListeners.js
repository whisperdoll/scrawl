import { useEffect, useRef } from "react";

export default function useCanvasListeners(canvas, listeners) {
  const originalPos = useRef({ x: 0, y: 0 });
  const lastPos = useRef({ x: 0, y: 0 });
  const currentPos = useRef({ x: 0, y: 0 });
  const isDown = useRef(false);

  useEffect(() => {
    if (!canvas) return;

    const move = (e) => {
      const pos = posFromEvent(e);
      currentPos.current = pos;

      const ret = listeners.move(pos, e, lastPos.current, originalPos.current, isDown.current);

      lastPos.current = pos;
      return ret;
    };

    const down = (e) => {
      const pos = posFromEvent(e);
      currentPos.current = pos;
      originalPos.current = pos;
      lastPos.current = pos;
      isDown.current = true;

      return listeners.down(pos, e);
    };

    const up = (e) => {
      const pos = posFromEvent(e);
      currentPos.current = pos;
      lastPos.current = pos;
      isDown.current = false;

      return listeners.up(pos, e, originalPos.current);
    };

    const leave = (e) => {
      const pos = posFromEvent(e);
      currentPos.current = pos;
      lastPos.current = pos;

      listeners.leave(pos, e);
    };

    const stop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };
    
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointerout', leave);
    canvas.addEventListener('touchstart', stop);
    canvas.addEventListener('touchmove', stop);

    return () => {
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointerout', leave);
      canvas.removeEventListener('touchstart', stop);
      canvas.removeEventListener('touchmove', stop);
    };
  });

  function posFromEvent(e) {
    let ret;
  
    const bounds = canvas.getBoundingClientRect();
    const o = offset(canvas);
  
    if (e instanceof MouseEvent) {
      ret = { x: e.pageX, y: e.pageY };
    } else {
      ret = { x: e.changedTouches[0].pageX, y: e.changedTouches[0].pageY };
    }

    
    ret = { x: ret.x - o.x, y: ret.y - o.y };
    ret = {
      x: ret.x * (canvas.width / bounds.width),
      y: ret.y * (canvas.height / bounds.height)
    };
  
    return ret;
  }
  
  function offset() {
      let z = canvas;
      let x = 0;
      let y = 0;
      let c; 
  
      while(z && !isNaN(z.offsetLeft) && !isNaN(z.offsetTop)) {        
          c =  window.getComputedStyle(z, null); 
          x += z.offsetLeft - z.scrollLeft + (c ? parseInt(c.getPropertyValue('border-left-width') , 10) : 0);
          y += z.offsetTop - z.scrollTop + (c ? parseInt(c.getPropertyValue('border-top-width') , 10) : 0);
          z = z.offsetParent;
      }
  
      return { x, y };
  }

  return [
    currentPos.current,
    lastPos.current,
    originalPos.current,
    isDown.current
  ];
}