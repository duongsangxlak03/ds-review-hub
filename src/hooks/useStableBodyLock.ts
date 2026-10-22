import { useEffect, useLayoutEffect, useRef } from "react";

export const useStableBodyLock = (locked: boolean, releaseDelay = 260) => {
  const restoreTimer = useRef<number | null>(null);
  const previousStyles = useRef<{ overflow: string; paddingRight: string } | null>(null);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    if (restoreTimer.current) {
      window.clearTimeout(restoreTimer.current);
      restoreTimer.current = null;
    }

    if (locked) {
      if (!previousStyles.current) {
        previousStyles.current = {
          overflow: document.body.style.overflow,
          paddingRight: document.body.style.paddingRight,
        };
      }

      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
      return;
    }

    if (!previousStyles.current) return;

    const previous = previousStyles.current;
    restoreTimer.current = window.setTimeout(() => {
      document.body.style.overflow = previous.overflow;
      document.body.style.paddingRight = previous.paddingRight;
      previousStyles.current = null;
      restoreTimer.current = null;
    }, releaseDelay);
  }, [locked, releaseDelay]);

  useEffect(() => {
    return () => {
      if (restoreTimer.current) window.clearTimeout(restoreTimer.current);
      if (previousStyles.current) {
        document.body.style.overflow = previousStyles.current.overflow;
        document.body.style.paddingRight = previousStyles.current.paddingRight;
      }
    };
  }, []);
};
