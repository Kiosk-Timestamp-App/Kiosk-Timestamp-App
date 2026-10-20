import { RECT } from './artMeta';

/** Vorgerenderte Ebene an ihrer Bühnenposition (beschnittene Ebenen über RECT, sonst ganze Bühne) */
export function Layer({ src, rect, className = '' }: { src: string; rect?: keyof typeof RECT; className?: string }) {
  const r = rect ? RECT[rect] : { x: 0, y: 0, w: 1200, h: 1600 };
  return <img src={src} alt="" draggable={false} className={`absolute max-w-none ${className}`} style={{ left: r.x, top: r.y, width: r.w, height: r.h }} />;
}
