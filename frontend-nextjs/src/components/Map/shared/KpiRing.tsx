import { useEffect, useId, useState, type CSSProperties } from 'react';

/**
 * Ring-Kachel: Ring füllt die Kachelhöhe (skaliert sauber bis 4K), Zahl in Container-Einheiten
 * sitzt sicher im Ring. Der echte Wert blendet ein – kein Hochzählen von 0.
 */
export function KpiRing({
  eyebrow,
  label,
  value,
  tone = 'brand',
  failed,
  staleLabel,
}: {
  eyebrow: string;
  label: string;
  value: number | null;
  tone?: 'brand' | 'blue';
  failed?: boolean;
  staleLabel?: string | null;
}) {
  const id = `kr-${useId().replace(/:/g, '')}`;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setShown(value ?? 0), 160);
    return () => clearTimeout(t);
  }, [value]);
  const stops = tone === 'blue' ? ['#5b94e0', '#9dc1f2'] : ['#669933', '#ffd873'];
  const r = 40;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, shown));

  return (
    <div className="ov-glass flex h-full min-h-0 items-center gap-[6%] overflow-hidden rounded-[28px] px-[6%] py-[4.5%]">
      <div className="relative aspect-square h-full shrink-0" style={{ containerType: 'size' }}>
        <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" aria-hidden>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={stops[0]} />
              <stop offset="1" stopColor={stops[1]} />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r={r} stroke="rgb(255 255 255 / 0.09)" strokeWidth="9" fill="none" />
          {value != null && (
            <>
              <circle
                cx="50"
                cy="50"
                r={r}
                stroke={`url(#${id})`}
                strokeWidth="9"
                strokeLinecap="round"
                fill="none"
                strokeDasharray={c}
                strokeDashoffset={c * (1 - pct / 100)}
                transform="rotate(-90 50 50)"
                style={{ transition: 'stroke-dashoffset 1800ms cubic-bezier(0.16,1,0.3,1)' }}
              />
              {/* Spitze läuft per Rotation mit (nur transform) */}
              <g style={{ transform: `rotate(${pct * 3.6}deg)`, transformOrigin: '50px 50px', transition: 'transform 1800ms cubic-bezier(0.16,1,0.3,1)' }}>
                <circle cx="50" cy={50 - r} r="7" fill={stops[1]} opacity="0.3" />
                <circle cx="50" cy={50 - r} r="2.6" fill="#fff" />
              </g>
            </>
          )}
        </svg>
        <span className="num-display absolute inset-0 grid place-items-center text-white" style={{ fontSize: '25cqh' }}>
          {value != null ? (
            <span key={value} className="ov-map-fadein inline-flex items-baseline" style={{ '--d': '700ms' } as CSSProperties}>
              {Math.round(value)}
              <span className="ml-[0.05em] text-[0.7em] text-white/70">%</span>
            </span>
          ) : failed ? (
            <span className="text-white/60">–</span>
          ) : (
            <span className="ov-skeleton inline-block h-[0.7em] w-[1.4em] rounded-lg" />
          )}
        </span>
      </div>
      <div className="min-w-0">
        <div className={staleLabel ? 'eyebrow-plain !text-[1em] text-white/65' : 'eyebrow !text-[1em]'}>
          {eyebrow}
          {staleLabel && <span className="font-semibold normal-case tracking-normal"> · {staleLabel}</span>}
        </div>
        <div className="mt-[0.4em] text-[1.2em] font-bold leading-tight text-white" style={{ fontFamily: 'var(--font-display)' }}>
          {label}
        </div>
      </div>
    </div>
  );
}
