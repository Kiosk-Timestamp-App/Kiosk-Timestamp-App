import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { CountUp, Metric } from '../primitives';
import { useReplay } from '../hooks';

const TICKS = 40;

/**
 * Ringanzeige 0–100 % mit Verlauf, Skalenstrichen und leuchtender Spitze.
 * Füllt sich beim Erscheinen (und bei jedem Bildschirm-Eintritt) weich auf; die Spitze läuft
 * per Rotation exakt mit dem Bogen mit (nur transform wird animiert).
 */
export function Ring({ value, size = '100%', tone = 'brand' }: { value: number | null; size?: string; tone?: 'brand' | 'blue' }) {
  const id = `ring-${useId().replace(/:/g, '')}`;
  const epoch = useReplay();
  const [shown, setShown] = useState(0);
  useEffect(() => {
    setShown(0);
    const t = setTimeout(() => setShown(value ?? 0), 160);
    return () => clearTimeout(t);
  }, [value, epoch]);
  const r = 42;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, shown));
  const stops = tone === 'blue' ? ['#5b94e0', '#9dc1f2'] : ['#669933', '#ffd873'];
  const ease = 'cubic-bezier(0.16,1,0.3,1)';
  return (
    <svg viewBox="-6 -6 112 112" style={{ width: size, height: size }} className="-rotate-90 overflow-visible">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={stops[0]} />
          <stop offset="1" stopColor={stops[1]} />
        </linearGradient>
        <radialGradient id={`${id}-tip`}>
          <stop offset="0" stopColor="#fff" stopOpacity="0.95" />
          <stop offset="0.35" stopColor={stops[1]} stopOpacity="0.6" />
          <stop offset="1" stopColor={stops[1]} stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Skalenstriche außen, Viertel betont; überstrichene Striche heller */}
      {Array.from({ length: TICKS }, (_, i) => {
        const a = (i / TICKS) * 2 * Math.PI;
        const major = i % 10 === 0;
        const r1 = major ? 48.5 : 49.5;
        const r2 = 53;
        const lit = (i / TICKS) * 100 <= pct && pct > 0;
        return (
          <line
            key={i}
            x1={50 + r1 * Math.cos(a)}
            y1={50 + r1 * Math.sin(a)}
            x2={50 + r2 * Math.cos(a)}
            y2={50 + r2 * Math.sin(a)}
            stroke={lit ? stops[1] : 'rgb(255 255 255)'}
            strokeOpacity={lit ? 0.7 : major ? 0.3 : 0.14}
            strokeWidth={major ? 1.4 : 0.9}
            strokeLinecap="round"
            style={{ transition: 'stroke-opacity 600ms, stroke 600ms' }}
          />
        );
      })}
      <circle cx="50" cy="50" r={r} stroke="rgb(255 255 255 / 0.08)" strokeWidth="8" fill="none" />
      <circle
        cx="50"
        cy="50"
        r={r}
        stroke={`url(#${id})`}
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct / 100)}
        style={{ transition: `stroke-dashoffset 1800ms ${ease}` }}
      />
      {/* Leuchtende Spitze */}
      <g style={{ transform: `rotate(${pct * 3.6}deg)`, transformOrigin: '50px 50px', transition: `transform 1800ms ${ease}` }} opacity={pct > 0 ? 1 : 0}>
        <circle cx={50 + r} cy="50" r="9" fill={`url(#${id}-tip)`} />
        <circle cx={50 + r} cy="50" r="2" fill="#fff" />
      </g>
    </svg>
  );
}

/** Goldener Lichtschwenk + Rand, wenn die Kachel im Spotlight steht */
function SpotSweep({ spot }: { spot?: boolean }) {
  return spot ? <span aria-hidden className="ov-spot-sweep" /> : null;
}

/** Kachel mit Ring und Kennzahl; Anordnung passt sich dem Seitenverhältnis der Kachel an */
export function RingTile({
  eyebrow,
  label,
  value,
  tone,
  foot,
  spot,
}: {
  eyebrow: string;
  label: string;
  value: number | null;
  tone?: 'brand' | 'blue';
  foot?: ReactNode;
  spot?: boolean;
}) {
  // Layout nach dem eigenen Seitenverhältnis der Kachel (nicht nach Bildschirmausrichtung):
  // hohe Kacheln → Ring oben, Text darunter; breite/flache Kacheln → Ring links, Text rechts.
  const ref = useRef<HTMLDivElement>(null);
  const [tall, setTall] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => setTall(el.clientHeight > el.clientWidth * 0.82);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const big = value != null && value >= 99.5; // „100 %“ → etwas kleiner, damit die Zahl den Ring nicht berührt
  return (
    <div
      ref={ref}
      className="ov-glass ov-spot flex h-full min-h-0 flex-col gap-[0.6em] overflow-hidden rounded-[28px] px-[7%] py-[6%]"
      data-spot={spot ? 'true' : 'false'}
    >
      <SpotSweep spot={spot} />
      <div className="eyebrow min-w-0 truncate">{eyebrow}</div>
      <div className={`flex min-h-0 flex-1 items-center ${tall ? 'flex-col justify-center gap-[0.6em] text-center' : 'gap-[7%]'}`}>
        <div className={`relative aspect-square shrink-0 ${tall ? 'min-h-0 max-w-full flex-1' : 'h-full max-h-[8.4em]'}`}>
          <Ring value={value} tone={tone} />
          <span className={`num-display absolute inset-0 grid place-items-center text-white ${big ? 'text-[1.45em]' : 'text-[1.75em]'}`}>
            <span className="inline-flex items-baseline">
              <CountUp value={value} decimals={0} />
              {value != null && <span className="ov-unit text-[0.55em]">%</span>}
            </span>
          </span>
        </div>
        <div className="min-w-0">
          <div className="text-[0.95em] font-bold leading-tight text-white" style={{ fontFamily: 'var(--font-display)' }}>
            {label}
          </div>
          {foot && <div className="mt-[0.35em] text-[0.9em] text-white/65">{foot}</div>}
        </div>
      </div>
    </div>
  );
}

/** Kachel mit Icon, Kennzahl, Unterzeile und optionaler Vergleichszeile („≈ …“) */
export function StatTile({
  eyebrow,
  icon,
  value,
  decimals = 1,
  unit,
  foot,
  accent = 'text-white',
  className,
  insight,
  spot,
  auto,
  note,
}: {
  eyebrow: string;
  icon: ReactNode;
  value: number | null;
  decimals?: number;
  unit: string;
  foot?: ReactNode;
  accent?: string;
  className?: string;
  /** Vergleichswert mit genanntem Faktor, z. B. „≈ 256 km Autofahrt (0,15 kg/km)“ */
  insight?: ReactNode;
  spot?: boolean;
  /** `value` in kW/kWh → automatisch MW/MWh/GWh */
  auto?: 'power' | 'energy';
  /** Fußnote (z. B. verwendete Faktoren) */
  note?: ReactNode;
}) {
  // Passt-Messung: reicht der Platz nicht, zuerst Fußnote, dann Vergleichszeile ausblenden (nie abgeschnitten).
  // Hohe Kacheln (Querformat) bekommen eine größere Kennzahl statt leerer Fläche.
  const ref = useRef<HTMLDivElement>(null);
  const [level, setLevel] = useState(0); // 0 = alles, 1 = ohne Fußnote, 2 = ohne Fußnote und Vergleich
  const [box, setBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const fitKey = `${box.w}x${box.h}|${!!note}|${!!insight}|${value != null}`;
  const lastFit = useRef('');
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (lastFit.current !== fitKey) {
      lastFit.current = fitKey;
      if (level !== 0) {
        setLevel(0);
        return;
      }
    }
    if (el.scrollHeight > el.clientHeight + 1 && level < 2) setLevel(level + 1);
  }, [fitKey, level]);
  const tall = box.h > box.w * 0.85;
  return (
    <div
      ref={ref}
      className={`ov-glass ov-spot flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] px-[7%] py-[6%] ${className ?? ''}`}
      data-spot={spot ? 'true' : 'false'}
    >
      <SpotSweep spot={spot} />
      <div className="flex items-start justify-between gap-2">
        <span className="eyebrow min-w-0">{eyebrow}</span>
        <span className="ov-tile-brand grid size-[2.4em] shrink-0 place-items-center rounded-2xl text-white">{icon}</span>
      </div>
      {/* Kennzahl mittig im freien Raum (keine leere Mitte bei hohen Kacheln) */}
      <div className="my-auto min-w-0 pt-[0.3em]">
        <Metric value={value} unit={unit} decimals={decimals} auto={auto} className={`${tall ? 'text-[3.8em]' : 'text-[2.9em]'} ${accent}`} unitClassName="text-[0.34em]" />
        {foot && <div className="mt-[0.45em] text-[0.9em] leading-snug text-white/65">{foot}</div>}
        {note && level < 1 && <div className="mt-[0.3em] text-[0.88em] leading-snug text-white/70">{note}</div>}
        {insight && level < 2 && (
          <div className="mt-[0.6em] flex items-start gap-[0.45em] border-t border-white/10 pt-[0.55em] text-[0.88em] leading-snug text-white/70">
            <span className="font-bold text-[#ffd873]">≈</span>
            <span className="min-w-0">{insight}</span>
          </div>
        )}
      </div>
    </div>
  );
}
