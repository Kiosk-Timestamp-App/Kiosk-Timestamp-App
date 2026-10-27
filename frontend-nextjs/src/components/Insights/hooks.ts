import { useEffect, useState, type RefObject } from 'react';

/** Gemessene Größe eines Elements (für pixelgenaue SVG-Diagramme ohne verzerrte Schrift) */
export function useSize(ref: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setSize((s) => (s.w === el.clientWidth && s.h === el.clientHeight ? s : { w: el.clientWidth, h: el.clientHeight }));
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

/** Schriftgröße eines Elements in px (für SVG-Beschriftungen in em-Logik) */
export function useFontPx(ref: RefObject<HTMLElement | null>, w: number) {
  const [fs, setFs] = useState(16);
  useEffect(() => {
    const el = ref.current;
    if (el) setFs(parseFloat(getComputedStyle(el).fontSize) || 16);
  }, [ref, w]);
  return fs;
}
