/**
 * ÖKOVOLT Design-Bausteine für den TV-Kiosk (nach CLAUDE-DESIGN-KIT: brand/stage.tsx, brand/logo.tsx, motion/index.tsx).
 * Ohne zusätzliche Bibliotheken: Bewegung über CSS-Keyframes (index.css) und requestAnimationFrame.
 */
import { useContext, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { autoEnergy, autoPower, prefersReducedMotion, UnavailableContext, useNow, useReplay } from './hooks';
import { useDaylight, useStageSolar } from './daylight';

/* ------------------------------------------------------------------ Bildmarke */

const LOGO_FRAME = 'M9.2 2H54.8L62 9.2V54.8L54.8 62H9.2L2 54.8V9.2Z';
const LOGO_BOLT = 'M53.9 4 59.6 4 36.3 28.4 49.5 32.8 9.4 60 6.6 60 28.1 35.9 13.9 31.5Z';

/** ÖKOVOLT-Bildmarke (weißer Achteck-Rahmen, grünes Quadrat, Blitz). `animated`: Rahmen zeichnet sich, Fläche federt auf. */
export function LogoMark({ size = 48, animated = false, className }: { size?: number; animated?: boolean; className?: string }) {
  const clip = `ov-mark-${useId().replace(/:/g, '')}`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <clipPath id={clip}>
          <rect x="8" y="8" width="48" height="48" rx="3.5" />
        </clipPath>
      </defs>
      <path
        d={LOGO_FRAME}
        fill="none"
        stroke="#fff"
        strokeWidth={4}
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={1}
        style={animated ? { animation: 'ov-mark-frame 900ms cubic-bezier(0.16,1,0.3,1) both' } : undefined}
      />
      <rect
        x="8"
        y="8"
        width="48"
        height="48"
        rx="3.5"
        fill="#5CAA2B"
        style={{ transformOrigin: '32px 32px', animation: animated ? 'ov-mark-pop 700ms cubic-bezier(0.16,1,0.3,1) 200ms both' : undefined }}
      />
      <path
        d={LOGO_BOLT}
        fill="#fff"
        clipPath={`url(#${clip})`}
        style={animated ? { animation: 'ov-mark-bolt 420ms cubic-bezier(0.16,1,0.3,1) 600ms both' } : undefined}
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ Zahlen-Ticker */

const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);

/**
 * Zählt beim Erscheinen von 0 weich auf den Wert (easeOutExpo) und gleitet bei späteren
 * Aktualisierungen vom alten zum neuen Wert (easeOutQuart, kürzer) – keine Sprünge.
 * Bei jedem Bildschirm-Eintritt (`ReplayContext`) wird erneut von 0 gezählt.
 */
export function CountUp({
  value,
  decimals = 2,
  durationMs = 1400,
  locale = 'de-AT',
  className,
}: {
  value: number | null | undefined;
  decimals?: number;
  durationMs?: number;
  locale?: string;
  className?: string;
}) {
  const target = typeof value === 'number' && Number.isFinite(value) ? value : null;
  const epoch = useReplay();
  const unavailable = useContext(UnavailableContext);
  const [shown, setShown] = useState(0);
  const fromRef = useRef(0);
  const epochRef = useRef(-1);

  useEffect(() => {
    if (target === null) return;
    const entering = epochRef.current !== epoch;
    epochRef.current = epoch;
    const from = entering ? 0 : fromRef.current;
    const dur = prefersReducedMotion() ? 1 : entering ? durationMs : Math.min(durationMs, 900);
    const ease = entering ? easeOutExpo : easeOutQuart;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const v = from + (target - from) * ease(t);
      fromRef.current = v;
      setShown(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, epoch]);

  if (target === null) return unavailable ? <span className={`text-white/60 ${className ?? ''}`}>–</span> : <span className={`ov-skeleton ${className ?? ''}`} style={{ width: '3.2em', height: '0.9em' }} />;
  const fmt = new Intl.NumberFormat(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return <span className={`tabular ${className ?? ''}`}>{fmt.format(shown)}</span>;
}

/**
 * Zahl + Einheit in einheitlicher Typografie (Manrope-Zahl, Inter-Einheit gedämpft).
 * `auto`: Wert in kW bzw. kWh → automatisch MW/MWh/GWh, damit große Anlagen nicht überlaufen.
 * Ohne Wert wird die Einheit ausgeblendet (kein „kW“ neben einem Skelett oder Strich).
 */
export function Metric({
  value,
  unit,
  decimals = 1,
  className,
  unitClassName,
  auto,
}: {
  value: number | null | undefined;
  unit?: ReactNode;
  decimals?: number;
  className?: string;
  unitClassName?: string;
  auto?: 'power' | 'energy';
}) {
  const has = typeof value === 'number' && Number.isFinite(value);
  const scaled = has && auto ? (auto === 'power' ? autoPower(value) : autoEnergy(value)) : null;
  return (
    <span className={`inline-flex items-baseline whitespace-nowrap ${className ?? ''}`}>
      <span className="num-display leading-none">
        <CountUp value={scaled ? scaled.value : value} decimals={scaled ? Math.min(decimals, scaled.decimals) : decimals} />
      </span>
      {has && (scaled || unit) ? <span className={`ov-unit ${unitClassName ?? ''}`}>{scaled ? scaled.unit : unit}</span> : null}
    </span>
  );
}

/** Ruhiger Hinweis, wenn Daten nach der Wartezeit nicht kommen (statt endlosem Skelett) */
export function Unavailable({ language, className }: { language: string | null; className?: string }) {
  const t: Record<string, string> = {
    DE: 'Daten derzeit nicht verfügbar',
    EN: 'Data currently unavailable',
    IT: 'Dati al momento non disponibili',
    FR: 'Données momentanément indisponibles',
    SQ: 'Të dhënat nuk janë të disponueshme',
  };
  return (
    <div className={`flex flex-1 items-center justify-center gap-[0.6em] text-center text-[0.95em] text-white/65 ${className ?? ''}`} role="status">
      <span className="size-[0.55em] shrink-0 rounded-full bg-[#ffd873]/80" />
      {(language && t[language]) || t.DE}
    </div>
  );
}

/* ------------------------------------------------------------------ Live-Uhr */

/** Ziffern rollen bei jedem Wechsel von oben ein (key = Ziffer). */
function RollingText({ text }: { text: string }) {
  return (
    <span className="inline-flex" aria-hidden>
      {text.split('').map((c, i) =>
        /\d/.test(c) ? (
          <span key={i} className="ov-digit">
            <span key={c}>{c}</span>
          </span>
        ) : (
          <span key={i} className="inline-block px-[0.04em] opacity-75">
            {c}
          </span>
        ),
      )}
    </span>
  );
}

/** Live-Uhr Europe/Vienna: HH:MM groß mit rollenden Ziffern, Sekunden klein und grau. */
export function LiveClock({ className, secondsClassName }: { className?: string; secondsClassName?: string }) {
  const now = useNow(1000);
  const parts = new Intl.DateTimeFormat('de-AT', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Europe/Vienna',
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  const hhmm = `${get('hour')}:${get('minute')}`;
  return (
    <time dateTime={now.toISOString()} className={`num-display inline-flex items-baseline leading-none ${className ?? ''}`}>
      <span className="sr-only">{hhmm}</span>
      <RollingText text={hhmm} />
      <span className={`ml-[0.18em] text-[0.42em] font-bold text-white/60 ${secondsClassName ?? ''}`}>
        <span className="tabular">{get('second')}</span>
      </span>
    </time>
  );
}

/* ------------------------------------------------------------------ Bühne */

const ARC_PATH = 'M-20 390 C 260 330, 560 120, 1010 92';

/** Sternfeld: feste, gesäte Positionen in drei Gruppen (nur drei animierte Elemente) */
const STARS = (() => {
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  return Array.from({ length: 110 }, () => ({
    x: rnd() * 1600,
    y: Math.pow(rnd(), 1.6) * 1600,
    r: 0.7 + Math.pow(rnd(), 3) * 2.1,
    o: 0.35 + rnd() * 0.6,
    g: Math.floor(rnd() * 3),
  }));
})();

/**
 * Navy-Bühne: feines Raster, Glühen und optional die Sonnenbahn (Signatur-Element).
 * Tag/Nacht am Standort: tagsüber folgt das Sonnenglühen der echten Solarleistung,
 * nachts erscheinen Sternfeld und Mondlicht, die Palette wird ruhiger.
 */
export function StageDecor({ arc = true, calm = false }: { arc?: boolean; calm?: boolean }) {
  const pathRef = useRef<SVGPathElement>(null);
  const { isDay, progress } = useDaylight();
  const solar = useStageSolar();
  const [sun, setSun] = useState<{ x: number; y: number } | null>(null);
  // Tagsüber: Grundglühen + Anteil der echten Leistung; unbekannte Leistung → mittlere Stimmung
  const sunGlow = isDay ? 0.4 + 0.6 * (solar ?? 0.5) : 0;

  useLayoutEffect(() => {
    const el = pathRef.current;
    if (!el) return;
    const len = el.getTotalLength();
    const pt = el.getPointAtLength(len * (0.12 + progress * 0.88));
    setSun({ x: (pt.x / 1200) * 100, y: (pt.y / 400) * 100 });
  }, [progress]);

  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${calm ? 'ov-calm' : ''}`} data-mood={isDay ? 'day' : 'night'}>
      <div className="absolute inset-0 bg-grid-stage [mask-image:radial-gradient(90%_80%_at_70%_20%,black,transparent_78%)]" />

      {/* Nacht: tieferes Blau, Sterne, Mond */}
      <div className="ov-mood absolute inset-0" style={{ opacity: isDay ? 0 : 1 }}>
        <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_60%_0%,rgb(31_83_154/0.32),transparent_70%)]" />
        <svg
          className="absolute inset-0 size-full [mask-image:linear-gradient(180deg,transparent,transparent_12%,black_20%,black_45%,transparent_92%)]"
          viewBox="0 0 1600 1600"
          preserveAspectRatio="xMidYMid slice"
        >
          {[0, 1, 2].map((g) => (
            <g key={g} className="ov-twinkle" style={{ animationDuration: `${7 + g * 3.5}s`, animationDelay: `${g * -2.3}s` }}>
              {STARS.filter((s) => s.g === g).map((s, i) => (
                <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#E8EEFA" opacity={s.o} />
              ))}
            </g>
          ))}
        </svg>
        {/* Mondlicht an derselben Stelle wie tagsüber das Sonnenglühen – ohne Mondscheibe, die mit der Kopfzeile kollidiert */}
        <div className="absolute -right-[10vw] -top-[16vw] size-[46vw] rounded-full bg-[radial-gradient(closest-side,rgb(206_222_250/0.13),rgb(157_193_242/0.04)_55%,transparent)]" />
      </div>

      {/* Tag: Sonnenglühen – Intensität folgt der Solarleistung */}
      <div className="ov-mood absolute inset-0" style={{ opacity: sunGlow }}>
        <div
          className="absolute -right-[8vw] -top-[14vw] size-[44vw] rounded-full bg-[radial-gradient(closest-side,rgb(255_216_115/0.24),rgb(245_167_15/0.06)_55%,transparent)]"
          style={{ animation: 'ov-glow-drift 18s ease-in-out infinite' }}
        />
      </div>
      <div className="ov-mood absolute inset-0" style={{ opacity: isDay ? 1 : 0.5 }}>
        <div
          className="absolute -bottom-[18vw] -left-[10vw] size-[40vw] rounded-full bg-[radial-gradient(closest-side,rgb(102_153_51/0.26),transparent)]"
          style={{ animation: 'ov-glow-drift-2 22s ease-in-out infinite' }}
        />
      </div>
      <div
        className="absolute left-[30%] top-[35%] size-[36vw] rounded-full bg-[radial-gradient(closest-side,rgb(0_52_115/0.35),transparent)]"
        style={{ animation: 'ov-glow-drift 26s ease-in-out infinite reverse' }}
      />
      {/* Sonnenbahn über die untere Bühnenhälfte */}
      <div className={`absolute left-0 top-[34%] h-[66%] w-full ${arc ? 'portrait:hidden' : 'hidden'}`}>
        <svg className="absolute inset-0 size-full" viewBox="0 0 1200 400" preserveAspectRatio="none" fill="none">
          <defs>
            <linearGradient id="ov-stage-arc" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#AED083" stopOpacity="0" />
              <stop offset="0.45" stopColor="#AED083" stopOpacity="0.4" />
              <stop offset="1" stopColor="#FFD873" stopOpacity="0.85" />
            </linearGradient>
          </defs>
          <path
            ref={pathRef}
            d={ARC_PATH}
            stroke="url(#ov-stage-arc)"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
            pathLength={1}
            strokeDasharray={1}
            style={{ animation: 'ov-draw 2.4s cubic-bezier(0.16,1,0.3,1) 300ms both' }}
          />
          {/* Lichtfunke, der die Bahn entlangläuft */}
          <path
            d={ARC_PATH}
            stroke="#FFE7A3"
            strokeWidth="3"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            pathLength={1}
            strokeDasharray="0.05 3"
            opacity={0.85}
          >
            {!prefersReducedMotion() && <animate attributeName="stroke-dashoffset" from="0.05" to="-1" begin="2.5s" dur="7s" repeatCount="indefinite" fill="freeze" />}
          </path>
        </svg>
        {sun && isDay && (
          <span
            className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FFE7A3] transition-[left,top] duration-[2000ms]"
            style={{ left: `${sun.x}%`, top: `${sun.y}%`, animation: 'ov-sun-pulse 4s ease-in-out infinite' }}
          />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Kleinteile */

/** „● LIVE“-Pille in Glas */
export function LivePill({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <span className={`glass-pill inline-flex items-center gap-[0.7em] rounded-full px-[1.1em] py-[0.55em] ${className ?? ''}`}>
      <span className="live-dot" />
      <span className="eyebrow-plain text-[#aed083]">Live</span>
      {children && (
        <>
          <span className="h-[1.1em] w-px bg-white/15" />
          <span className="text-white/80">{children}</span>
        </>
      )}
    </span>
  );
}
