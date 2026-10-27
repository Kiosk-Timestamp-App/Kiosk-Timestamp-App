import { useLayoutEffect, useRef, useState } from 'react';

/** Pixelgröße eines Elements (ResizeObserver), für SVGs in Pixelkoordinaten */
export function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      setSize((s) => (Math.abs(s.w - width) < 1 && Math.abs(s.h - height) < 1 ? s : { w: width, h: height }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

/** Grundschrift des Bildschirms in px (1.5vmin wie im Raster) */
export const baseEm = () => Math.min(window.innerWidth, window.innerHeight) * 0.015;
