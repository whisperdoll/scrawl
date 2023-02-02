import { useCallback, useEffect, useRef, useState } from "react";
import useAnimationFrame from "./useAnimationFrame";

export default function useWindowSize(debounceMs=750) {
  const [windowSize, setWindowSize] = useState({ width: 1, height: 1 });
  const windowSizeSync = useRef({ width: 1, height: 1 });
  const lastChange = useRef(0);

  const fn = useCallback(() => {
    const size = { width: window.innerWidth, height: window.innerHeight };
    const currentTime = Date.now();

    const sizeIsDifferent = size.width !== windowSizeSync.current.width || size.height !== windowSizeSync.current.height;
    const enoughTimePassed = currentTime - lastChange.current >= debounceMs;

    if (sizeIsDifferent && enoughTimePassed) {
      windowSizeSync.current = size;
      lastChange.current = currentTime;
      setWindowSize(size);
    }
  }, []);

  useAnimationFrame(fn);

  return windowSize;
}