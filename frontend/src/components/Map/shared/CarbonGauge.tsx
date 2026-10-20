import { useEffect, useId, useState, type CSSProperties } from 'react';
import { Factory, Gauge, Leaf } from 'lucide-react';
import { tr } from '../../../design/hooks';
import { CI_MAX, CI_THRESHOLDS, T, ciColor, ciLevel, localeOf, type Lang } from './config';

/* Geometrie (viewBox 200×150): 240°-Bogen, Winkel im Uhrzeigersinn ab 12 Uhr */
const CX = 100;
const CY = 98;
const R = 70;
const SPAN = 240;
const angleOf = (v: number) => -SPAN / 2 + (Math.max(0, Math.min(CI_MAX, v)) / CI_MAX) * SPAN;
const pt = (deg: number, r = R) => {
  const a = (deg * Math.PI) / 180;
  return [CX + r * Math.sin(a), CY - r * Math.cos(a)] as const;
};
const arc = (a0: number, a1: number, r = R) => {
  const [x0, y0] = pt(a0, r);
  const [x1, y1] = pt(a1, r);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
};

const SEGMENTS = 48;
const SEG = Array.from({ length: SEGMENTS }, (_, i) => {
  const a0 = -SPAN / 2 + (i * SPAN) / SEGMENTS;
  const a1 = a0 + SPAN / SEGMENTS + 0.6; // leichte Überlappung gegen Haarlinien
  return { d: arc(a0, Math.min(a1, SPAN / 2)), color: ciColor(((i + 0.5) / SEGMENTS) * CI_MAX) };
});
const MAJOR = [0, 200, 400, 600, 800];
const MINOR = Array.from({ length: CI_MAX / 50 + 1 }, (_, i) => i * 50).filter((v) => !MAJOR.includes(v));

const LEVEL_ICON = { low: Leaf, mid: Gauge, high: Factory } as const;

interface Props {
  value: number | null;
  loading: boolean;
  language: Lang;
  /** Hinweis, wenn die Daten nicht live sind (z. B. „zwischengespeichert“) */
  staleLabel: string | null;
}

/** CO₂-Intensität als 240°-Tacho: Verlaufsskala, leuchtender Zeiger, große Zahl, Bewertung mit Symbol + Wort. */
export function CarbonGauge({ value, loading, language, staleLabel }: Props) {
  const id = useId().replace(/:/g, '');
  const L = (t: Parameters<typeof tr>[1]) => tr(language, t);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setShown(value ?? 0), 160);
    return () => clearTimeout(t);
  }, [value]);

  const has = value != null;
  const level = has ? ciLevel(value) : null;
  const Icon = level ? LEVEL_ICON[level] : Gauge;
  const color = has ? ciColor(value) : 'rgb(255 255 255 / 0.4)';
  const frac = Math.max(0, Math.min(1, shown / CI_MAX));

  return (
    <div className="ov-glass relative flex h-full min-h-0 flex-col overflow-hidden rounded-[30px] px-[6%] pb-[3%] pt-[4.5%]">
      {/* Farbschein der aktuellen Stufe */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-[35%] left-1/2 size-[95%] -translate-x-1/2 rounded-full opacity-25 transition-[background] duration-1000"
        style={{ background: `radial-gradient(closest-side, ${color}, transparent)` }}
      />
      <div className="relative">
        <div className={staleLabel ? 'eyebrow-plain !text-[1em] text-white/65' : 'eyebrow !text-[1em]'}>
          {L(T.co2)}
          {staleLabel && <span className="font-semibold normal-case tracking-normal"> · {staleLabel}</span>}
        </div>
      </div>

      {/* Tacho bleibt 4:3 und so groß wie möglich (Container-Einheiten) */}
      <div className="relative mt-[0.4em] grid min-h-0 flex-1 place-items-center" style={{ containerType: 'size' }}>
        <div className="relative" style={{ width: 'min(100cqw, 133.3cqh)', aspectRatio: '4 / 3', containerType: 'inline-size' }}>
          <svg viewBox="0 0 200 150" className="absolute inset-0 size-full overflow-visible" aria-hidden>
            <defs>
              <mask id={`m-${id}`} maskUnits="userSpaceOnUse">
                <path
                  d={arc(-SPAN / 2, SPAN / 2)}
                  stroke="#fff"
                  strokeWidth="16"
                  fill="none"
                  pathLength={1}
                  strokeDasharray="1 1"
                  strokeDashoffset={1 - frac}
                  style={{ transition: 'stroke-dashoffset 1800ms cubic-bezier(0.16,1,0.3,1)' }}
                />
              </mask>
            </defs>

            {/* Spur: ganze Skala gedämpft */}
            <g opacity={0.2}>
              {SEG.map((s, i) => (
                <path key={i} d={s.d} stroke={s.color} strokeWidth="11" fill="none" />
              ))}
            </g>
            {/* Wert: gefüllter Teil leuchtet */}
            {has && (
              <g mask={`url(#m-${id})`}>
                {/* vorgerenderter Schein statt Blur-Filter (TV-schonend) */}
                <g opacity={0.22}>
                  {SEG.map((s, i) => (
                    <path key={i} d={s.d} stroke={s.color} strokeWidth="20" fill="none" />
                  ))}
                </g>
                {SEG.map((s, i) => (
                  <path key={i} d={s.d} stroke={s.color} strokeWidth="11" fill="none" />
                ))}
              </g>
            )}

            {/* Schwellen niedrig | mittel | hoch als Fugen im Bogen */}
            {[CI_THRESHOLDS.low, CI_THRESHOLDS.high].map((v) => {
              const [x0, y0] = pt(angleOf(v), R - 6.5);
              const [x1, y1] = pt(angleOf(v), R + 6.5);
              return <line key={v} x1={x0} y1={y0} x2={x1} y2={y1} stroke="#0a1f45" strokeWidth="2.2" />;
            })}

            {/* Skala außen */}
            {MINOR.map((v) => {
              const [x0, y0] = pt(angleOf(v), R + 9);
              const [x1, y1] = pt(angleOf(v), R + 12);
              return <line key={v} x1={x0} y1={y0} x2={x1} y2={y1} stroke="rgb(255 255 255 / 0.25)" strokeWidth="1" />;
            })}
            {MAJOR.map((v) => {
              const [x0, y0] = pt(angleOf(v), R + 9);
              const [x1, y1] = pt(angleOf(v), R + 14);
              const [lx, ly] = pt(angleOf(v), R + 29);
              const anchor = v === 0 ? 'end' : v === CI_MAX ? 'start' : 'middle';
              return (
                <g key={v}>
                  <line x1={x0} y1={y0} x2={x1} y2={y1} stroke="rgb(255 255 255 / 0.55)" strokeWidth="1.4" strokeLinecap="round" />
                  <text x={lx + (v === 0 ? 4 : v === CI_MAX ? -4 : 0)} y={ly + (v === 0 || v === CI_MAX ? 4 : 0)} textAnchor={anchor} dominantBaseline="middle" fill="rgb(255 255 255 / 0.6)" fontSize="16" fontWeight="700" className="tabular">
                    {v === CI_MAX ? `${v}+` : v}
                  </text>
                </g>
              );
            })}

            {/* Zeiger: leuchtender Knopf auf dem Bogen */}
            {has && (
              <g
                style={{
                  transform: `rotate(${angleOf(shown)}deg)`,
                  transformOrigin: `${CX}px ${CY}px`,
                  transition: 'transform 1800ms cubic-bezier(0.16,1,0.3,1)',
                }}
              >
                <circle cx={CX} cy={CY - R} r="11" fill={color} opacity="0.35" />
                <circle cx={CX} cy={CY - R} r="6.5" fill="#fff" stroke={color} strokeWidth="3" />
                <path d={`M${CX - 3.5} ${CY - R + 13} L${CX + 3.5} ${CY - R + 13} L${CX} ${CY - R + 8.5}Z`} fill="#fff" opacity="0.9" />
              </g>
            )}
          </svg>

          {/* Zahl + Einheit + Bewertung in der Mitte (Größen relativ zur Tachobreite) */}
          <div className="absolute inset-x-0 top-[32%] flex flex-col items-center text-center" style={{ fontSize: '4.6cqw' } as CSSProperties}>
            {has ? (
              // echter Wert blendet ein (kein Hochzählen von 0 → nie ein falscher Zwischenwert)
              <span key={value} className="ov-map-fadein num-display text-[5em] leading-[0.92] text-white" style={{ '--d': '700ms' } as CSSProperties}>
                {new Intl.NumberFormat(localeOf(language)).format(Math.round(value))}
              </span>
            ) : (
              <span className="num-display text-[5em] leading-[0.92] text-white/30">
                {loading ? <span className="ov-skeleton inline-block h-[0.8em] w-[1.8em] rounded-xl align-middle" /> : '–'}
              </span>
            )}
            <span className="mt-[0.3em] text-[1.05em] font-semibold text-white/60">
              g CO<sub>2</sub>eq/kWh
            </span>
            {level && (
            <span
              key={level ?? 'none'}
              className="ov-map-fadein glass-pill mt-[0.8em] inline-flex items-center gap-[0.5em] rounded-full px-[0.95em] py-[0.35em] text-[1.15em] font-bold"
              style={{ borderColor: has ? color : undefined, '--d': has ? '1500ms' : '0ms' } as CSSProperties}
            >
              <Icon className="size-[1.1em]" style={{ color }} strokeWidth={2.4} />
              <span className="text-white/90">{L(T[level])}</span>
            </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
