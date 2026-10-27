import type { CSSProperties, ReactNode } from 'react';

/** Glas-Karte im Stil der Kiosk-Bühne */
export function Card({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <section className={`ov-glass ov-rise relative overflow-hidden rounded-[30px] ${className ?? ''}`} style={style}>
      {children}
    </section>
  );
}

/** Kleine Quellen-/Stand-Zeile */
export function StandNote({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={`text-[1em] font-medium tracking-[0.005em] text-white/65 ${className ?? ''}`}>{children}</p>;
}
