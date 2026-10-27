import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, CalendarDays, House, Moon, Sparkles, Sun, Sunrise, Sunset, UtilityPole, WifiOff } from 'lucide-react';
import type { SystemData } from '../../hooks/useSystemData';
import { CountUp, Metric } from '../primitives';
import { autoPower, fmtNum, NNBSP, prefersReducedMotion, tr, useScreenActive } from '../hooks';
import { fmtClock, useDaylight } from '../daylight';
import type { LiveState } from '../status';

interface Props {
  energy: SystemData | null;
  peakKwp: number | null;
  hasBattery: boolean;
  todayKwh: number | null;
  language: string | null;
  /** Aktualität der Live-Werte (Partikel laufen nur bei „live“) */
  live?: LiveState;
  /** Standort der Anlage (Sonnenauf-/-untergang); ohne Koordinaten kein Tagesbogen */
  coords?: [number, number] | null;
  /** auf dem Kiosk gemessene Tagesspitze (kW) samt Uhrzeit */
  todayPeak?: { kw: number; at: string } | null;
  /** gestern erzeugte Energie (kWh, Tagessumme aus dem Backend) */
  yesterdayKwh?: number | null;
  /** Spotlight-Satz, der kurz die Statuszeile übernimmt */
  insight?: { text: string; note?: string; key: number } | null;
}

/* ------------------------------------------------------------------ Geometrie
   100×100-Raster (Container ist quadratisch → Partikel bleiben rund). Kubische Bézier-Kurven
   werden in JS ausgewertet: keine DOM-Messung, Partikel laufen über eine vorberechnete Tabelle. */

type Pt = readonly [number, number];
type Curve = readonly [Pt, Pt, Pt, Pt];

const NODES = {
  house: { x: 24, y: 67 },
  grid: { x: 76, y: 67 },
};
/** Knotendurchmesser in % der Diagrammbreite */
const NODE_D = 24;
const CURVES = {
  sunHouse: [
    [52, 52],
    [50, 57],
    [42, 56.5],
    [33.5, 59],
  ],
  houseGrid: [
    [37, 67],
    [46, 67],
    [54, 67],
    [63, 67],
  ],
} satisfies Record<string, Curve>;

const bez = (c: Curve, t: number): [number, number] => {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const d = 3 * u * t * t;
  const e = t * t * t;
  return [a * c[0][0] + b * c[1][0] + d * c[2][0] + e * c[3][0], a * c[0][1] + b * c[1][1] + d * c[2][1] + e * c[3][1]];
};
const pathOf = (c: Curve) => `M${c[0][0]} ${c[0][1]} C ${c[1][0]} ${c[1][1]}, ${c[2][0]} ${c[2][1]}, ${c[3][0]} ${c[3][1]}`;
const SAMPLES = 96;
const lutOf = (c: Curve) => Array.from({ length: SAMPLES + 1 }, (_, i) => bez(c, i / SAMPLES));

const fmt = fmtNum;
const kwText = (v: number) => {
  const p = autoPower(v);
  return `${fmt(p.value, p.decimals)}${NNBSP}${p.unit}`;
};

/** Größtes Quadrat, das in die Zelle passt (ResizeObserver – ohne Container-Query-Einheiten, läuft auch auf älteren TV-Browsern) */
function SquareFit({ className, children, scaleText = false }: { className?: string; children: ReactNode; scaleText?: boolean }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const fit = () => {
      const side = Math.max(0, Math.min(o.clientWidth, o.clientHeight));
      i.style.width = `${side}px`;
      i.style.height = `${side}px`;
      // Schrift wächst mit dem Diagramm (Komposition bleibt in jeder Zellgröße gleich)
      if (scaleText) i.style.fontSize = `${Math.max(13, side * 0.052)}px`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(o);
    return () => ro.disconnect();
  }, [scaleText]);
  return (
    <div ref={outer} className="relative h-full min-h-0 w-full">
      <div ref={inner} className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${className ?? ''}`}>
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Partikel-Engine */

const MAX_PARTICLES = 7;
/** Reihenfolge, in der Partikel bei steigender Leistung dazukommen – bleiben gleichmäßig verteilt */
const REVEAL = [0, 4, 2, 6, 1, 5, 3];

interface FlowLine {
  id: string;
  curve: Curve;
  kw: number;
  color: string;
  reverse: boolean;
}

/**
 * Lichtpartikel auf allen Leitungen in einer einzigen rAF-Schleife.
 * Leistung wird weich nachgeführt (keine Sprünge bei neuen Werten): Tempo, Dichte, Größe und
 * Leuchten skalieren mit kW. Gesetzt werden nur `transform` und `opacity` der Partikel.
 * Pausiert, solange der Kiosk-Bildschirm nicht sichtbar ist.
 */
function FlowParticles({ lines, scaleKw, paused }: { lines: FlowLine[]; scaleKw: number; paused: boolean }) {
  const groupRefs = useRef<Record<string, (SVGGElement | null)[]>>({});
  const linesRef = useRef(lines);
  const stateRef = useRef<Record<string, { phase: number; kw: number }>>({});

  useEffect(() => {
    linesRef.current = lines;
  }, [lines]);

  const luts = useMemo(() => Object.fromEntries(lines.map((l) => [l.id, lutOf(l.curve)])), [lines]);
  const lutsRef = useRef(luts);
  useEffect(() => {
    lutsRef.current = luts;
  }, [luts]);

  useEffect(() => {
    const reduced = prefersReducedMotion();
    let raf = 0;
    let last = performance.now();
    const draw = (dt: number) => {
      for (const line of linesRef.current) {
        const st = (stateRef.current[line.id] ??= { phase: (line.id.length * 0.37) % 1, kw: 0 });
        st.kw += (line.kw - st.kw) * (reduced ? 1 : 1 - Math.exp(-dt / 0.9));
        const norm = Math.min(1, st.kw / scaleKw);
        const speed = st.kw > 0.05 ? 0.16 + norm * 0.42 : 0; // Umläufe pro Sekunde
        if (!reduced) st.phase = (st.phase + speed * dt) % 1;
        const count = st.kw > 0.05 ? 2 + norm * (MAX_PARTICLES - 2) : 0;
        const size = 0.75 + norm * 0.75;
        const lut = lutsRef.current[line.id];
        const els = groupRefs.current[line.id] ?? [];
        if (!lut) continue;
        for (let i = 0; i < MAX_PARTICLES; i++) {
          const el = els[i];
          if (!el) continue;
          const vis = Math.max(0, Math.min(1, count - REVEAL.indexOf(i)));
          let p = (st.phase + i / MAX_PARTICLES) % 1;
          if (line.reverse) p = 1 - p;
          const fade = Math.sin(Math.PI * p);
          const [x, y] = lut[Math.round(p * SAMPLES)];
          el.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${size.toFixed(3)})`);
          el.setAttribute('opacity', (vis * (0.2 + 0.8 * fade)).toFixed(3));
        }
      }
    };
    if (paused || reduced) {
      draw(paused ? 0 : 1);
      return;
    }
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      draw(dt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused, scaleKw, lines]);

  return (
    <g>
      {lines.map((line) => (
        <g key={line.id}>
          {Array.from({ length: MAX_PARTICLES }, (_, i) => (
            <g
              key={i}
              opacity={0}
              ref={(el) => {
                (groupRefs.current[line.id] ??= [])[i] = el;
              }}
            >
              <circle r="3.4" fill={`url(#ov-pglow-${line.id})`} />
              <circle r="1.25" fill={line.color} opacity="0.6" />
              <circle r="0.85" fill="#fff" opacity="0.92" />
            </g>
          ))}
        </g>
      ))}
    </g>
  );
}

/** Leitung: dezente Bahn, farbige Spur bei Fluss, Richtungspfeil in der Mitte */
function FlowTrack({ curve, color, active, reverse, id }: { curve: Curve; color: string; active: boolean; reverse: boolean; id: string }) {
  const d = pathOf(curve);
  const t0 = 0.52;
  const [x, y] = bez(curve, t0);
  const [x2, y2] = bez(curve, t0 + 0.02);
  const angle = (Math.atan2(y2 - y, x2 - x) * 180) / Math.PI + (reverse ? 180 : 0);
  return (
    <g>
      <defs>
        <radialGradient id={`ov-pglow-${id}`}>
          <stop offset="0" stopColor={color} stopOpacity="0.75" />
          <stop offset="0.45" stopColor={color} stopOpacity="0.22" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d={d} stroke="rgb(255 255 255 / 0.09)" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <path
        d={d}
        stroke={color}
        strokeWidth="0.7"
        strokeLinecap="round"
        fill="none"
        strokeDasharray={active ? undefined : '0.6 1.8'}
        className="transition-opacity duration-[1200ms]"
        opacity={active ? 0.5 : 0.22}
      />
      <g transform={`translate(${x} ${y}) rotate(${angle})`}>
        <path
          d="M-1.4 -1.7 L0.9 0 L-1.4 1.7"
          stroke={color}
          strokeWidth="0.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          className="transition-opacity duration-[1200ms]"
          opacity={active ? 0.95 : 0}
        />
      </g>
    </g>
  );
}

/* ------------------------------------------------------------------ Signatur: Sonnenlicht trifft das Modulfeld */

/** Modulfeld in Perspektive: Ecken (oben links, oben rechts, unten rechts, unten links) im 100er-Raster */
const PANEL = { tl: [8, 23], tr: [62, 9], br: [80, 30], bl: [26, 45] } as const;
const COLS = 6;
const ROWS = 3;
/** Punkt im Modulfeld (u = 0…1 entlang der Breite, v = 0…1 entlang der Tiefe) */
const panelAt = (u: number, v: number): [number, number] => {
  const top = [PANEL.tl[0] + (PANEL.tr[0] - PANEL.tl[0]) * u, PANEL.tl[1] + (PANEL.tr[1] - PANEL.tl[1]) * u];
  const bot = [PANEL.bl[0] + (PANEL.br[0] - PANEL.bl[0]) * u, PANEL.bl[1] + (PANEL.br[1] - PANEL.bl[1]) * u];
  return [top[0] + (bot[0] - top[0]) * v, top[1] + (bot[1] - top[1]) * v];
};
const PANEL_PTS = [PANEL.tl, PANEL.tr, PANEL.br, PANEL.bl].map((p) => p.join(',')).join(' ');
const SUN: Pt = [90, 7];
/** Landepunkte der drei Strahlen auf dem Modulfeld */
const LANDINGS = [panelAt(0.74, 0.32), panelAt(0.48, 0.5), panelAt(0.24, 0.66)];
/** Sammelpunkt unter dem Feld – von hier fließt der Strom ins Gebäude */
const GATHER: Pt = [52, 50];

/**
 * Signatur des Kiosks: Sonnenlicht fällt in drei Strahlen auf ein großes Modulfeld (fein gerastert,
 * tiefblau-schwarz mit Himmelsreflex). Jeder Strahl LANDET mit einem hellen Aufprall, dessen Licht
 * sich über die Zellen ausbreitet; ein Reflex wandert synchron über das Feld. Darunter sammelt sich
 * die Energie in einem leuchtenden Punkt und fließt (Partikel) ins Gebäude.
 * Helligkeit, Zahl der Strahlen und Aufpralle folgen der echten Leistung (0…1). Nachts ruht das Feld
 * im Mondlicht. Nur transform/opacity; alle Teile eines Strahls teilen sich Takt und Verzögerung.
 */
function SolarArray({ power, night }: { power: number; night: boolean }) {
  const p = Math.max(0, Math.min(1, power));
  const beams = night || p < 0.02 ? 0 : p > 0.5 ? 3 : p > 0.18 ? 2 : 1;
  const cellLines: ReactNode[] = [];
  for (let c = 1; c < COLS; c++) {
    const a = panelAt(c / COLS, 0);
    const b = panelAt(c / COLS, 1);
    cellLines.push(<line key={`c${c}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />);
  }
  for (let r = 1; r < ROWS; r++) {
    const a = panelAt(0, r / ROWS);
    const b = panelAt(1, r / ROWS);
    cellLines.push(<line key={`r${r}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />);
  }
  // feine Busbars (halbe Zellen) für Tiefe
  for (let c = 0; c < COLS; c++) {
    const a = panelAt((c + 0.5) / COLS, 0);
    const b = panelAt((c + 0.5) / COLS, 1);
    cellLines.push(<line key={`b${c}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} strokeOpacity={0.12} />);
  }
  const bottomMid = panelAt(0.55, 1);

  return (
    <g>
      <defs>
        <linearGradient id="sa-cell" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0f2649" />
          <stop offset="0.55" stopColor="#061024" />
          <stop offset="1" stopColor="#02070f" />
        </linearGradient>
        <linearGradient id="sa-sky" x1="0" y1="0" x2="1" y2="0.6">
          <stop offset="0" stopColor="#9dc1f2" stopOpacity="0" />
          <stop offset="0.42" stopColor="#cfe0f7" stopOpacity="0.1" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.05" />
          <stop offset="0.62" stopColor="#9dc1f2" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="sa-sun">
          <stop offset="0" stopColor="#fff7dc" />
          <stop offset="0.3" stopColor="#ffd873" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ffd873" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="sa-hit">
          <stop offset="0" stopColor="#fffbe8" />
          <stop offset="0.25" stopColor="#ffe08a" stopOpacity="0.85" />
          <stop offset="1" stopColor="#ffd873" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sa-beam" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff2c4" stopOpacity="0.05" />
          <stop offset="1" stopColor="#ffe08a" stopOpacity="0.5" />
        </linearGradient>
        <clipPath id="sa-clip">
          <polygon points={PANEL_PTS} />
        </clipPath>
      </defs>

      {/* Sonne bzw. Mond */}
      {night ? (
        <g transform={`translate(${SUN[0]} ${SUN[1]})`}>
          <circle r="9" fill="#9dc1f2" opacity="0.1" />
          <path d="M1.8 -4.6a5 5 0 1 0 3.6 8 4.1 4.1 0 0 1 -3.6 -8Z" fill="#dce6f7" />
        </g>
      ) : (
        <g transform={`translate(${SUN[0]} ${SUN[1]})`} style={{ opacity: 0.5 + 0.5 * p }} className="transition-opacity duration-[1600ms]">
          <circle r={9 + 7 * p} fill="url(#sa-sun)" opacity="0.6" />
          <circle r="4" fill="#ffd873" />
          <circle r="2.2" cx="-0.9" cy="-0.9" fill="#fff7dc" opacity="0.8" />
        </g>
      )}

      {/* Lichtwege (ruhig) – Deckkraft folgt der Leistung */}
      {LANDINGS.map((l, i) => (
        <line
          key={`path${i}`}
          x1={SUN[0] - 3}
          y1={SUN[1] + 3}
          x2={l[0]}
          y2={l[1]}
          stroke="url(#sa-beam)"
          strokeWidth="1.6"
          strokeLinecap="round"
          className="transition-opacity duration-[1600ms]"
          style={{ opacity: i < beams ? 0.25 + 0.55 * p : 0 }}
        />
      ))}

      {/* Modulfeld: Rahmen, tiefblau-schwarze Zellen, feines Raster */}
      <polygon points={PANEL_PTS} fill="rgb(0 0 0 / 0.35)" transform="translate(1.2 1.8)" />
      <polygon points={PANEL_PTS} fill="url(#sa-cell)" stroke="rgb(205 220 240 / 0.7)" strokeWidth="0.7" strokeLinejoin="round" />
      <g stroke="rgb(127 168 224)" strokeOpacity="0.42" strokeWidth="0.26">
        {cellLines}
      </g>
      <g clipPath="url(#sa-clip)">
        {/* Himmelsreflex (statisch) */}
        <polygon points={PANEL_PTS} fill="url(#sa-sky)" />
        {/* Zellen erwärmen sich mit der Leistung */}
        <polygon points={PANEL_PTS} fill="#ffd873" className="transition-opacity duration-[1600ms]" style={{ opacity: night ? 0 : 0.02 + 0.08 * p }} />
        {/* Aufprall-Licht breitet sich über die Zellen aus (synchron zum Strahl) */}
        {LANDINGS.map((l, i) =>
          i < beams ? (
            <circle key={`spread${i}`} className="sig-spread" cx={l[0]} cy={l[1]} r="9" fill="url(#sa-hit)" style={{ animationDelay: `${i * -0.8}s`, opacity: 0 }} />
          ) : null,
        )}
        {/* Reflex wandert über das Feld – startet mit dem ersten Aufprall */}
        {beams > 0 && (
          <g style={{ opacity: 0.35 + 0.65 * p }}>
            <rect className="sig-glint" x="-20" y="0" width="7" height="60" fill="#fff6d6" opacity="0.32" />
          </g>
        )}
        {night && <rect x="30" y="0" width="5" height="60" fill="#dce6f7" opacity="0.07" transform="skewX(-28)" />}
      </g>

      {/* Photonen fliegen die Lichtwege entlang und landen mit hellem Aufprall */}
      {LANDINGS.map((l, i) => {
        if (i >= beams) return null;
        const dx = l[0] - (SUN[0] - 3);
        const dy = l[1] - (SUN[1] + 3);
        const d = Math.hypot(dx, dy);
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        return (
          <g key={`ph${i}`}>
            <g transform={`translate(${SUN[0] - 3} ${SUN[1] + 3}) rotate(${angle})`}>
              <line
                className="sig-photon"
                style={{ animationDelay: `${i * -0.8}s`, ['--d' as string]: `${d}px` } as CSSProperties}
                x1="0"
                y1="0"
                x2="-7"
                y2="0"
                stroke="#fff3c9"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </g>
            <circle className="sig-impact" cx={l[0]} cy={l[1]} r="3.4" fill="url(#sa-hit)" style={{ animationDelay: `${i * -0.8}s`, opacity: 0 }} />
          </g>
        );
      })}

      {/* Sammeln: Anschluss unter dem Feld leuchtet mit der Leistung */}
      <line x1={bottomMid[0]} y1={bottomMid[1]} x2={GATHER[0]} y2={GATHER[1]} stroke="rgb(205 220 240 / 0.45)" strokeWidth="0.7" />
      <g transform={`translate(${GATHER[0]} ${GATHER[1]})`}>
        <circle r={4 + 3 * p} fill="url(#sa-hit)" className={beams > 0 ? 'sig-gather' : undefined} style={{ opacity: night ? 0.15 : 0.3 + 0.7 * p }} />
        <circle r="1.3" fill={night ? '#9aa6bc' : '#fff3c9'} />
      </g>
    </g>
  );
}

/* ------------------------------------------------------------------ Knoten */

/**
 * Knoten unter dem Modulfeld (Gebäude, Netz): räumliche Scheibe mit Lichtkante, innerem Ring und
 * Schatten; Leuchthof nach Leistung. Darunter eine saubere, zentrierte Zeile: Beschriftung + Wert.
 */
function FlowNode({
  at,
  icon,
  ring,
  tint,
  label,
  value,
  caption,
  power = 0,
}: {
  at: { x: number; y: number };
  icon: ReactNode;
  ring: string;
  /** RGB-Tripel für Leuchthof/Lichtkante, z. B. "140 186 88" */
  tint: string;
  label: string;
  value?: ReactNode;
  /** kleine Unterzeile (Rolle bzw. Richtung), farbig möglich */
  caption?: ReactNode;
  power?: number;
}) {
  const r = NODE_D / 2;
  return (
    <>
      <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${at.x}%`, top: `${at.y}%`, width: `${NODE_D}%`, aspectRatio: '1' }}>
        <span
          aria-hidden
          className="absolute inset-[-45%] rounded-full transition-opacity duration-[1600ms]"
          style={{ background: `radial-gradient(closest-side, rgb(${tint} / 0.45), transparent 70%)`, opacity: 0.2 + 0.8 * power }}
        />
        <div
          className="relative grid size-full place-items-center rounded-full border-[1.5px]"
          style={{
            borderColor: ring,
            background: `radial-gradient(circle at 34% 26%, rgb(52 86 140) 0%, rgb(18 40 76) 52%, rgb(7 18 38) 100%)`,
            boxShadow: `0 0.7em 1.4em -0.5em rgb(0 0 0 / 0.65), inset 0 1px 0 rgb(255 255 255 / 0.18), inset 0 -0.6em 1.2em -0.6em rgb(${tint} / 0.55)`,
          }}
        >
          <span aria-hidden className="absolute inset-[9%] rounded-full border border-white/[0.08]" />
          {icon}
        </div>
      </div>
      <div
        className="absolute flex -translate-x-1/2 flex-col items-center text-center leading-tight"
        style={{ left: `${at.x}%`, top: `${at.y + r + 2.5}%`, width: '46%' }}
      >
        <span className="eyebrow-plain max-w-full truncate !text-[0.82em] !tracking-[0.08em] text-white/75">{label}</span>
        {value != null && <span className="num-display mt-[0.15em] whitespace-nowrap text-[1.2em] leading-none">{value}</span>}
        {caption != null && <span className="mt-[0.2em] whitespace-nowrap text-[0.78em] font-semibold">{caption}</span>}
      </div>
    </>
  );
}

/** Wert-Chip an einer Leitung */
function Chip({ x, y, color, children, anchor = 'center' }: { x: number; y: number; color: string; children: ReactNode; anchor?: 'left' | 'center' }) {
  return (
    <span
      className="absolute inline-flex items-center gap-[0.3em] whitespace-nowrap rounded-full border bg-[rgb(8_22_46/0.94)] px-[0.65em] py-[0.24em] text-[0.95em] shadow-[0_6px_18px_-6px_rgb(0_0_0/0.6)]"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        borderColor: `${color}66`,
        color,
        transform: anchor === 'center' ? 'translate(-50%,-50%)' : 'translateY(-50%)',
      }}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ Sonnenbogen (Tagesfortschritt) */

const ARC: Curve = [
  [6, 40],
  [40, 2],
  [120, 2],
  [154, 40],
];

/** Kleiner Tagesbogen: Sonnenaufgang → Sonnenuntergang am Standort der Anlage (nur mit echten Koordinaten) */
function SunArc({ language, coords }: { language: string | null; coords: [number, number] | null }) {
  const { isDay, progress, sunrise, sunset, nextSunrise, known } = useDaylight(coords);
  if (!known) return null;
  const [sx, sy] = bez(ARC, progress);
  const d = pathOf(ARC);
  return (
    <div className="flex items-end gap-[0.7em] text-[0.95em]">
      <div className="flex flex-col items-end leading-tight">
        <span className="inline-flex items-center gap-[0.35em] text-white/70">
          <Sunrise className="size-[1.1em]" strokeWidth={2} />
          <span className="tabular font-semibold text-white/90">{fmtClock(isDay ? sunrise : nextSunrise)}</span>
        </span>
        <span className="mt-[0.15em] text-[0.9em] text-white/70">{tr(language, { DE: 'Aufgang', EN: 'Sunrise', IT: 'Alba', FR: 'Lever', SQ: 'Lindja' })}</span>
      </div>
      <svg viewBox="0 0 160 44" className="h-[2.6em] w-auto overflow-visible" fill="none" aria-hidden>
        <defs>
          <linearGradient id="ov-sunarc" x1="0" x2="1">
            <stop offset="0" stopColor="#AED083" />
            <stop offset="1" stopColor="#FFD873" />
          </linearGradient>
        </defs>
        <line x1="0" x2="160" y1="40" y2="40" stroke="rgb(255 255 255 / 0.16)" strokeWidth="1" />
        <path d={d} stroke="rgb(255 255 255 / 0.22)" strokeWidth="1.5" strokeDasharray="2 4" strokeLinecap="round" />
        {isDay && (
          <>
            <path d={d} stroke="url(#ov-sunarc)" strokeWidth="2.5" strokeLinecap="round" pathLength={1} strokeDasharray={`${progress} 1`} />
            <g transform={`translate(${sx} ${sy})`}>
              <circle r="9" fill="#FFD873" opacity="0.2" />
              <circle r="4.5" fill="#FFE7A3" />
            </g>
          </>
        )}
      </svg>
      <div className="flex flex-col items-start leading-tight">
        <span className="inline-flex items-center gap-[0.35em] text-white/70">
          <span className="tabular font-semibold text-white/90">{fmtClock(sunset)}</span>
          <Sunset className="size-[1.1em]" strokeWidth={2} />
        </span>
        <span className="mt-[0.15em] text-[0.9em] text-white/70">{tr(language, { DE: 'Untergang', EN: 'Sunset', IT: 'Tramonto', FR: 'Coucher', SQ: 'Perëndimi' })}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Live-Status-Satz */

type Words5 = { DE: string; EN: string; IT: string; FR: string; SQ: string };

/** Ersetzt {a}, {b} im Satz durch hervorgehobene Werte */
function fill(text: string, vals: Record<string, string>) {
  return text.split(/(\{\w\})/).map((part, i) => {
    const m = /^\{(\w)\}$/.exec(part);
    return m ? (
      <span key={i} className="num-display whitespace-nowrap text-white">
        {vals[m[1]]}
      </span>
    ) : (
      <span key={i}>{part}</span>
    );
  });
}

/**
 * Ein Satz, der den Moment einordnet, z. B. „Die Anlage deckt gerade den gesamten Verbrauch und
 * speist 6,2 kW ins Netz ein.“ Nur aus Live-Werten (Solar, Verbrauch, Netz) berechnet; bei nicht
 * aktuellen Daten ein ehrlicher Hinweis. Während eines Spotlights steht hier dessen Einordnung.
 */
function LiveStatus({
  solar,
  use,
  gridKw,
  selling,
  isDay,
  language,
  live,
  insight,
}: {
  solar: number;
  use: number;
  gridKw: number;
  selling: boolean;
  isDay: boolean;
  language: string | null;
  live: LiveState;
  insight?: Props['insight'];
}) {
  let words: Words5;
  let vals: Record<string, string> = {};
  let Icon = Sun;
  let tone = '#ffd873';
  const at = live.at ? fmtClock(new Date(live.at)) : '–';
  if (insight) {
    return (
      <div className="ov-well relative z-10 flex h-[3.7em] items-center gap-[0.9em] overflow-hidden rounded-[1.1em] border border-[#ffd873]/35 px-[1em]" role="status">
        <span className="grid size-[2.2em] shrink-0 place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#ffe7a3,#f5a70f)] text-[#3a2a00]">
          <Sparkles className="size-[1.1em]" strokeWidth={2.2} />
        </span>
        <p key={insight.key} className="ov-fade line-clamp-2 min-w-0 leading-snug">
          <span className="block text-[0.95em] font-semibold text-white">{insight.text}</span>
          {insight.note && <span className="block text-[0.85em] text-white/65">{insight.note}</span>}
        </p>
      </div>
    );
  }
  if (live.kind === 'offline' || live.kind === 'stale') {
    Icon = WifiOff;
    tone = '#ffd873';
    vals = { a: at };
    words =
      live.kind === 'stale'
        ? { DE: 'Letzte Messwerte von {a} – neue Daten folgen in Kürze.', EN: 'Last readings from {a} – new data will follow shortly.', IT: 'Ultime misure delle {a} – nuovi dati a breve.', FR: 'Dernières mesures de {a} – nouvelles données sous peu.', SQ: 'Matjet e fundit nga {a} – të dhëna të reja së shpejti.' }
        : live.at
          ? { DE: 'Verbindung zur Anlage unterbrochen – angezeigt werden die Werte von {a}.', EN: 'Connection interrupted – showing the values from {a}.', IT: 'Connessione interrotta – valori delle {a}.', FR: 'Connexion interrompue – valeurs de {a}.', SQ: 'Lidhja u ndërpre – vlerat nga {a}.' }
          : { DE: 'Verbindung zur Anlage unterbrochen – Live-Werte derzeit nicht verfügbar.', EN: 'Connection interrupted – live values currently unavailable.', IT: 'Connessione interrotta – valori live non disponibili.', FR: 'Connexion interrompue – valeurs en direct indisponibles.', SQ: 'Lidhja u ndërpre – vlerat live nuk janë të disponueshme.' };
  } else if (solar < 0.05) {
    Icon = isDay ? UtilityPole : Moon;
    tone = isDay ? '#ff9c92' : '#c9d8f2';
    vals = { a: kwText(use) };
    words = isDay
      ? { DE: 'Gerade kein Solarertrag – der Bedarf von {a} kommt aus dem Netz.', EN: 'No solar yield right now – the demand of {a} comes from the grid.', IT: 'Nessuna resa solare – il fabbisogno di {a} arriva dalla rete.', FR: 'Pas de production solaire – les {a} consommés viennent du réseau.', SQ: 'Asnjë prodhim diellor – nevoja prej {a} vjen nga rrjeti.' }
      : { DE: 'Nach Sonnenuntergang kommt der Bedarf von {a} aus dem Netz.', EN: 'After sunset, the demand of {a} comes from the grid.', IT: 'Dopo il tramonto il fabbisogno di {a} arriva dalla rete.', FR: 'Après le coucher du soleil, les {a} consommés viennent du réseau.', SQ: 'Pas perëndimit, nevoja prej {a} vjen nga rrjeti.' };
  } else if (selling && gridKw >= 0.05) {
    Icon = ArrowUp;
    tone = '#aed083';
    vals = { a: kwText(gridKw) };
    words = { DE: 'Die Anlage deckt gerade den gesamten Verbrauch und speist {a} ins Netz ein.', EN: 'The system covers all consumption right now and feeds {a} into the grid.', IT: "L'impianto copre ora tutto il consumo e immette {a} in rete.", FR: "L'installation couvre toute la consommation et injecte {a} dans le réseau.", SQ: 'Sistemi mbulon tani gjithë konsumin dhe dërgon {a} në rrjet.' };
  } else if (gridKw < 0.05 || use <= 0) {
    words = { DE: 'Die Anlage deckt gerade den gesamten Verbrauch.', EN: 'The system covers all consumption right now.', IT: "L'impianto copre ora tutto il consumo.", FR: "L'installation couvre actuellement toute la consommation.", SQ: 'Sistemi mbulon tani gjithë konsumin.' };
  } else {
    const cover = Math.max(0, Math.min(100, ((use - gridKw) / use) * 100));
    Icon = ArrowDown;
    tone = '#ff9c92';
    vals = { a: `${fmt(cover, 0)}${NNBSP}%`, b: kwText(gridKw) };
    words = { DE: 'Die Anlage deckt gerade {a} des Verbrauchs – {b} kommen aus dem Netz.', EN: 'The system covers {a} of consumption right now – {b} come from the grid.', IT: "L'impianto copre ora il {a} del consumo – {b} arrivano dalla rete.", FR: "L'installation couvre {a} de la consommation – {b} viennent du réseau.", SQ: 'Sistemi mbulon tani {a} të konsumit – {b} vijnë nga rrjeti.' };
  }
  const text = (language && (words as Record<string, string>)[language]) || words.DE;
  return (
    <div className="ov-well relative z-10 flex h-[3.7em] items-center gap-[0.9em] overflow-hidden rounded-[1.1em] border px-[1em]" role="status">
      <span className="grid size-[2.2em] shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04]" style={{ color: tone }}>
        <Icon className="size-[1.1em]" strokeWidth={2.4} />
      </span>
      <p key={text} className="ov-fade line-clamp-2 min-w-0 text-[0.95em] font-medium leading-snug text-white/80">
        {fill(text, vals)}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ Hero */

/**
 * Hero „Live-Energiefluss“: links die Sonnenleistung riesig mit Anlagenauslastung,
 * rechts das Flussdiagramm Sonne → Modul → Gebäude → Netz mit Lichtpartikeln, unten der Status-Satz.
 * Passt sich der eigenen Zellgröße an (flache Zellen in der Multi-Ansicht: weniger Zusatzinfos).
 */
export function EnergyFlowHero({ energy, peakKwp, todayKwh, language, live = { kind: 'live', at: null }, coords = null, todayPeak = null, yesterdayKwh = null, insight = null }: Props) {
  const rootRef = useRef<HTMLElement>(null);
  const active = useScreenActive(rootRef);
  const { isDay } = useDaylight(coords);
  const [shape, setShape] = useState<'full' | 'compact' | 'tight'>('full');

  // Inhalt an die eigene Zelle anpassen: passt die linke Spalte nicht in ihre Zeile, werden
  // schrittweise Zusatzinfos ausgeblendet (erst Mini-Kacheln, dann Auslastung) – nie Überlappung.
  const bodyRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // bei neuer Größe oder anderem Inhalt wieder mit allem beginnen und dann schrittweise reduzieren
  const contentKey = `${!!energy}|${live.kind}`;
  const fitKey = `${size.w}x${size.h}|${contentKey}`;
  const lastFit = useRef('');
  useLayoutEffect(() => {
    const body = bodyRef.current;
    const left = leftRef.current;
    if (!body || !left) return;
    if (lastFit.current !== fitKey) {
      // neue Größe/neuer Inhalt: zuerst wieder alles zeigen, dann (nächster Durchlauf) prüfen
      lastFit.current = fitKey;
      if (shape !== 'full') {
        setShape('full');
        return;
      }
    }
    if (left.scrollHeight > body.clientHeight + 2 && shape !== 'tight') setShape(shape === 'full' ? 'compact' : 'tight');
  }, [shape, fitKey]);

  const isLive = live.kind === 'live';
  // Werte älter als 3 h werden nicht mehr als Leistung gezeigt (nur noch der Hinweis)
  const tooOld = live.at != null && Date.now() - live.at > 3 * 60 * 60_000;
  const has = !!energy && !tooOld;
  const solar = Math.max(0, energy?.solar_energy ?? 0);
  const use = Math.max(0, energy?.spend_energy ?? 0);
  const grid = energy?.grid ?? 0;
  const selling = grid < 0;
  const gridKw = Math.abs(grid);
  const utilisation = peakKwp && has ? Math.min(100, (solar / peakKwp) * 100) : null;
  const scaleKw = Math.max(5, (peakKwp ?? 30) * 0.6);
  const norm = (kw: number) => (isLive ? Math.min(1, kw / scaleKw) : 0);

  // Farbsemantik: Netzbezug immer #ff9c92, Einspeisung grün, ohne Daten neutral
  const gridColor = !has ? '#9aa6bc' : selling ? '#aed083' : '#ff9c92';
  const GridArrow = selling ? ArrowUp : ArrowDown;
  const big = autoPower(solar);

  const lines = useMemo<FlowLine[]>(
    () => [
      { id: 'sun', curve: CURVES.sunHouse, kw: isLive ? solar : 0, color: '#ffd873', reverse: false },
      { id: 'grid', curve: CURVES.houseGrid, kw: isLive ? gridKw : 0, color: gridColor, reverse: !selling },
    ],
    [solar, gridKw, gridColor, selling, isLive],
  );

  const at = live.at ? fmtClock(new Date(live.at)) : '';
  const eyebrow =
    live.kind === 'live'
      ? tr(language, { DE: 'Live · Energiefluss', EN: 'Live · Energy flow', IT: 'Live · Flusso energetico', FR: 'Live · Flux énergétique', SQ: 'Live · Rrjedha e energjisë' })
      : live.kind === 'pending'
        ? tr(language, { DE: 'Energiefluss', EN: 'Energy flow', IT: 'Flusso energetico', FR: 'Flux énergétique', SQ: 'Rrjedha e energjisë' })
        : at
          ? `${tr(language, { DE: 'Energiefluss · Stand', EN: 'Energy flow · as of', IT: 'Flusso · aggiornato', FR: 'Flux · état à', SQ: 'Rrjedha · gjendja' })} ${at}`
          : tr(language, { DE: 'Energiefluss · keine Daten', EN: 'Energy flow · no data', IT: 'Flusso · nessun dato', FR: 'Flux · aucune donnée', SQ: 'Rrjedha · pa të dhëna' });

  const minis = [
    <MiniStat
      key="today"
      label={tr(language, { DE: 'Heute', EN: 'Today', IT: 'Oggi', FR: "Aujourd'hui", SQ: 'Sot' })}
      hint={tr(language, { DE: 'erzeugt', EN: 'generated', IT: 'prodotto', FR: 'produit', SQ: 'prodhuar' })}
      icon={<Sun className="size-[0.95em]" strokeWidth={2.4} />}
      value={todayKwh}
      auto="energy"
      decimals={0}
      tone="sun"
    />,
    <MiniStat
      key="yesterday"
      label={tr(language, { DE: 'Gestern', EN: 'Yesterday', IT: 'Ieri', FR: 'Hier', SQ: 'Dje' })}
      hint={tr(language, { DE: 'erzeugt', EN: 'generated', IT: 'prodotto', FR: 'produit', SQ: 'prodhuar' })}
      icon={<CalendarDays className="size-[0.95em]" strokeWidth={2.4} />}
      value={yesterdayKwh}
      auto="energy"
      decimals={0}
    />,
    <MiniStat
      key="peak"
      label={tr(language, { DE: 'Spitze', EN: 'Peak', IT: 'Picco', FR: 'Pic', SQ: 'Kulmi' })}
      icon={<ArrowUp className="size-[0.95em]" strokeWidth={2.6} />}
      value={todayPeak?.kw ?? null}
      auto="power"
      hint={todayPeak ? `${tr(language, { DE: 'heute', EN: 'today', IT: 'oggi', FR: 'auj.', SQ: 'sot' })} ${todayPeak.at}` : undefined}
      emptyText={tr(language, { DE: 'noch keine Spitze heute', EN: 'no peak yet today', IT: 'nessun picco oggi', FR: 'pas encore de pic', SQ: 'ende pa kulm sot' })}
    />,
  ];

  return (
    <section
      ref={rootRef}
      className="ov-glass ov-hero relative grid h-full min-h-0 grid-rows-[auto_1fr_auto] gap-[2.2%] overflow-hidden rounded-[32px] px-[4.5%] pb-[3.5%] pt-[3.2%]"
    >
      {/* Sonnenglühen hinter dem Diagramm – stärker bei mehr Leistung (statisch, nur Deckkraft) */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-[6%] top-[-16%] size-[62%] rounded-full bg-[radial-gradient(closest-side,rgb(255_216_115/0.24),rgb(245_167_15/0.06)_55%,transparent)] transition-opacity duration-[2000ms]"
        style={{ opacity: 0.2 + 0.8 * norm(solar) }}
      />

      {/* Kopfzeile: Eyebrow (mit Aktualität) + Tagesbogen */}
      <div className="relative z-10 flex items-center justify-between gap-[1em]">
        <span className={`eyebrow ${live.kind === 'stale' || live.kind === 'offline' ? 'text-[#ffd873]' : ''}`}>{eyebrow}</span>
        <SunArc language={language} coords={coords} />
      </div>

      <div ref={bodyRef} className="relative z-10 grid min-h-0 grid-cols-[1fr_1.05fr] items-center gap-[3%]" style={{ opacity: isLive || live.kind === 'pending' ? 1 : 0.75 }}>
        {/* Links: Kennzahlen */}
        <div ref={leftRef} className="flex min-w-0 flex-col">
          <span className="text-[0.95em] font-medium text-white/75">
            {isLive || live.kind === 'pending'
              ? tr(language, { DE: 'Sonnenleistung jetzt', EN: 'Solar power now', IT: 'Potenza solare ora', FR: 'Puissance solaire', SQ: 'Fuqia diellore tani' })
              : live.at
                ? `${tr(language, { DE: 'Sonnenleistung · zuletzt', EN: 'Solar power · last', IT: 'Potenza solare · ultimo', FR: 'Puissance · dernière', SQ: 'Fuqia · e fundit' })} ${fmtClock(new Date(live.at))}`
                : tr(language, { DE: 'Sonnenleistung · keine Daten', EN: 'Solar power · no data', IT: 'Potenza solare · nessun dato', FR: 'Puissance · aucune donnée', SQ: 'Fuqia · pa të dhëna' })}
          </span>
          <div className="mt-[0.1em] flex items-baseline gap-[0.25em]">
            <span className={`num-display text-gradient-sun leading-[0.95] tracking-[-0.045em] ${big.value >= 100 ? 'text-[6em]' : 'text-[7.3em]'}`}>
              <CountUp value={has ? big.value : null} decimals={big.decimals} durationMs={1800} />
            </span>
            {has && <span className="ov-unit text-[1.8em]">{big.unit}</span>}
          </div>

          {utilisation !== null && (
            <div className="mt-[0.8em] max-w-[94%]" style={{ display: shape === 'tight' ? 'none' : undefined }}>
              <div className="flex justify-between gap-[0.6em] text-[0.95em] text-white/70">
                <span className="truncate">
                  {tr(language, { DE: 'Auslastung der Anlage', EN: 'System utilisation', IT: 'Utilizzo impianto', FR: "Taux d'utilisation", SQ: 'Shfrytëzimi' })}
                </span>
                <span className="tabular shrink-0 font-semibold text-white/90">
                  <CountUp value={utilisation} decimals={0} />
                  {NNBSP}% <span className="font-medium text-white/65">· {fmt(peakKwp ?? 0, 1)}{NNBSP}kWp</span>
                </span>
              </div>
              <div className="relative mt-[0.55em] h-[0.55em]">
                <div className="ov-well absolute inset-0 overflow-hidden rounded-full">
                  <div
                    className="h-full origin-left rounded-full bg-[linear-gradient(90deg,#669933,#aed083_60%,#ffd873)] transition-transform duration-[1600ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                    style={{ transform: `scaleX(${utilisation / 100})` }}
                  />
                </div>
                {[25, 50, 75].map((t) => (
                  <span key={t} className="absolute top-[-0.3em] h-[1.15em] w-px bg-white/20" style={{ left: `${t}%` }} />
                ))}
                <span
                  className="absolute top-1/2 size-[1.3em] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,#fff7d6,rgb(255_216_115/0.7)_40%,transparent)] transition-[left] duration-[1600ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                  style={{ left: `${utilisation}%` }}
                />
              </div>
            </div>
          )}

          <div className="mt-[0.9em] grid grid-cols-3 gap-[0.7em]" style={{ display: shape === 'full' ? undefined : 'none' }}>
            {minis}
          </div>
        </div>

        {/* Rechts: Signatur (Sonnenlicht → Modulfeld → Strom) und Fluss ins Gebäude / Netz.
            Schrift skaliert mit der Diagrammgröße → gleiche Komposition in jeder Zellgröße, keine Überlappung. */}
        <SquareFit scaleText>
          <svg viewBox="0 0 100 100" className="absolute inset-0 size-full overflow-visible" fill="none" aria-hidden>
            <SolarArray power={norm(solar)} night={!isDay && solar < 0.05} />
            <FlowTrack id="sun" curve={CURVES.sunHouse} color="#ffd873" active={isLive && solar > 0.05} reverse={false} />
            <FlowTrack id="grid" curve={CURVES.houseGrid} color={gridColor} active={isLive && gridKw > 0.05} reverse={!selling} />
            <FlowParticles lines={lines} scaleKw={scaleKw} paused={!active} />
          </svg>
          <span className="eyebrow-plain absolute left-[2%] top-[0%] !text-[0.8em] text-white/70">
            {tr(language, { DE: 'Photovoltaik', EN: 'Solar', IT: 'Fotovoltaico', FR: 'Solaire', SQ: 'Fotovoltaik' })}
          </span>

          {/* PV-Leistung neben dem Sammelpunkt (frei von Knoten und Beschriftungen) */}
          {has && (
            <Chip x={56} y={51} color="#ffd873" anchor="left">
              <Metric value={solar} auto="power" unitClassName="!text-current text-[0.72em] opacity-85" />
            </Chip>
          )}

          <FlowNode
            at={NODES.house}
            power={norm(use)}
            tint="91 148 224"
            ring="rgb(205 220 240 / 0.45)"
            icon={<House className="size-[46%] text-white" strokeWidth={1.7} />}
            label={tr(language, { DE: 'Gebäude', EN: 'Building', IT: 'Edificio', FR: 'Bâtiment', SQ: 'Ndërtesa' })}
            value={has ? <Metric value={use} auto="power" className="text-white" unitClassName="text-[0.66em]" /> : undefined}
            caption={has ? <span className="text-white/65">{tr(language, { DE: 'Verbrauch', EN: 'Consumption', IT: 'Consumo', FR: 'Consommation', SQ: 'Konsumi' })}</span> : undefined}
          />
          <FlowNode
            at={NODES.grid}
            power={norm(gridKw)}
            tint={!has ? '154 166 188' : selling ? '140 186 88' : '240 87 75'}
            ring={!has ? 'rgb(255 255 255 / 0.3)' : selling ? 'rgb(174 208 131 / 0.65)' : 'rgb(255 156 146 / 0.65)'}
            icon={<UtilityPole className="size-[46%]" style={{ color: gridColor }} strokeWidth={1.7} />}
            label={tr(language, { DE: 'Netz', EN: 'Grid', IT: 'Rete', FR: 'Réseau', SQ: 'Rrjeti' })}
            caption={
              has && gridKw >= 0.05 ? (
                <span style={{ color: gridColor }}>
                  {selling
                    ? tr(language, { DE: 'Einspeisung', EN: 'Export', IT: 'Immissione', FR: 'Injection', SQ: 'Eksport' })
                    : tr(language, { DE: 'Bezug', EN: 'Import', IT: 'Prelievo', FR: 'Soutirage', SQ: 'Import' })}
                </span>
              ) : undefined
            }
            value={
              has && gridKw >= 0.05 ? (
                <span className="inline-flex items-baseline gap-[0.2em]" style={{ color: gridColor }}>
                  <GridArrow className="size-[0.8em] self-center" strokeWidth={2.8} />
                  <Metric value={gridKw} auto="power" unitClassName="!text-current text-[0.66em] opacity-80" />
                </span>
              ) : has ? (
                <span className="text-[0.8em] font-medium text-white/65">{tr(language, { DE: 'ausgeglichen', EN: 'balanced', IT: 'in equilibrio', FR: 'équilibré', SQ: 'në ekuilibër' })}</span>
              ) : undefined
            }
          />
        </SquareFit>
            </div>

      {/* Live-Status in einem Satz – aus den echten Werten abgeleitet (oder Spotlight-Einordnung) */}
      {(has || live.kind === 'offline') && (
        <LiveStatus solar={solar} use={use} gridKw={gridKw} selling={selling} isDay={isDay} language={language} live={live} insight={insight} />
      )}
    </section>
  );
}

function MiniStat({
  label,
  value,
  unit,
  tone,
  icon,
  decimals = 1,
  auto,
  hint,
  emptyText,
}: {
  label: string;
  value: number | null;
  unit?: string;
  tone?: 'ok' | 'block' | 'sun';
  icon?: ReactNode;
  decimals?: number;
  auto?: 'power' | 'energy';
  hint?: string;
  /** statt Lade-Skelett, wenn (noch) kein Wert existiert */
  emptyText?: string;
}) {
  const color = tone === 'ok' ? 'text-[#aed083]' : tone === 'block' ? 'text-[#ff9c92]' : tone === 'sun' ? 'text-[#ffd873]' : 'text-white';
  return (
    <div className="ov-well min-w-0 rounded-2xl border px-[0.85em] py-[0.45em]">
      <div className={`flex items-center gap-[0.4em] ${tone ? color : 'text-white/70'}`}>
        {icon}
        <span className="truncate text-[0.92em] font-semibold text-white/85">{label}</span>
      </div>
      <div className="mt-[0.35em]">
        {value == null && emptyText ? (
          <div className="text-[0.92em] font-medium leading-snug text-white/70">{emptyText}</div>
        ) : (
          <Metric value={value} unit={unit} auto={auto} decimals={decimals} className={`text-[1.65em] ${color}`} unitClassName="text-[0.56em]" />
        )}
      </div>
      {hint && <div className="mt-[0.2em] truncate text-[0.88em] text-white/70">{hint}</div>}
    </div>
  );
}
