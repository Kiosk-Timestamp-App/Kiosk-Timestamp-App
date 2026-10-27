import type { CSSProperties, ReactNode } from 'react';
import { useReplay } from '../../design/hooks';
import { AlertTriangle } from 'lucide-react';
import type { LoadState } from './data';
import { useI18n } from './i18n';
import { dayKey, hhmm, shortDate } from './time';

/** Glas-Karte; Radius in em, damit er auf 4K-Fernsehern mitwächst */
export function Card({ children, className, style, label }: { children: ReactNode; className?: string; style?: CSSProperties; label?: string }) {
  return (
    <section
      aria-label={label}
      className={`ov-glass relative flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[1.75em] px-[1.6em] py-[1.4em] ${className ?? ''}`}
      style={style}
    >
      {children}
    </section>
  );
}

/**
 * Eyebrow in Kartengröße: `.eyebrow` hat in index.css eine feste rem-Größe (ungeschichtet, schlägt Utilities) –
 * deshalb per Inline-Stil, damit sie mit der Bildschirmgröße (auch 4K) skaliert.
 */
export function Eyebrow({ children, color, size = 1 }: { children: ReactNode; color?: string; size?: number }) {
  return (
    <span className="eyebrow min-w-0" style={{ fontSize: `${size}em`, color }}>
      {children}
    </span>
  );
}

/** Kleine Versal-Beschriftung (eyebrow-plain), ebenfalls skalierend */
export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={`eyebrow-plain ${className ?? ''}`} style={{ fontSize: '1em' }}>
      {children}
    </span>
  );
}

/** Kleingedrucktes: Quelle, Stand, Einschränkungen */
export function Fine({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={`text-[1em] leading-snug text-white/65 ${className ?? ''}`}>{children}</p>;
}

/** „ · Stand 13:05“ bzw. Hinweis auf zwischengespeicherte Werte */
export function Stand({ ts, state }: { ts: number | null; state: LoadState }) {
  const { t, locale } = useI18n();
  if (!ts) return null;
  // Nicht von heute → mit Datum, damit alte Werte nie wie aktuelle wirken
  const when = dayKey(ts) === dayKey(Date.now()) ? hhmm(ts) : `${shortDate(ts, locale)} ${hhmm(ts)}`;
  return (
    <span className={state === 'stale' ? 'text-[#ffd873]' : undefined}>
      {' · '}
      {state === 'stale' ? t('cached', { t: when }) : t('stand', { t: when })}
    </span>
  );
}

export function Unavailable({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center gap-[0.7em] text-center text-[1.05em] text-white/60">
      <AlertTriangle className="size-[1.3em] shrink-0 text-[#ffd873]" strokeWidth={2} aria-hidden />
      <span>{children}</span>
    </div>
  );
}

export function SkeletonBlock({ className }: { className?: string }) {
  return <span className={`ov-skeleton block ${className ?? ''}`} />;
}

/**
 * Zahl mit ruhigem Eintritt: erscheint sofort mit dem echten Wert und „setzt sich“ (Einblenden + leichtes Absinken).
 * Kein Hochzählen – so stehen während des Eintritts nie plausible, aber falsche Zwischenwerte im Bild.
 */
export function Num({ text, delayMs = 0, className }: { text: string; delayMs?: number; className?: string }) {
  const epoch = useReplay();
  return (
    <span key={`${epoch}-${text}`} className={`ov-ins-settle inline-block tabular ${className ?? ''}`} style={{ animationDelay: `${delayMs}ms` }}>
      {text}
    </span>
  );
}
