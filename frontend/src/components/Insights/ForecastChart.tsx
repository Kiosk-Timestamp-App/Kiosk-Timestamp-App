import { useEffect, useRef } from 'react';
import { Sunrise, Sunset } from 'lucide-react';
import { prefersReducedMotion } from '../../design/hooks';
import type { PriceSlot, PvSlot, SunDay } from './data';
import { PAST_GREY, TONE, dayStats, verdictOf, type Range } from './derive';
import { useFontPx, useSize } from './hooks';
import { useI18n } from './i18n';
import { HOUR, hh, hhmm, viennaMidnight, viennaParts, weekday } from './time';

/** Monotone kubische Kurve (wie d3 curveMonotoneX) – keine Überschwinger unter 0 */
function monotonePath(pts: [number, number][]) {
  const n = pts.length;
  if (n < 2) return '';
  const dx: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(pts[i + 1][0] - pts[i][0]);
    m.push((pts[i + 1][1] - pts[i][1]) / (dx[i] || 1));
  }
  const t: number[] = [m[0]];
  for (let i = 1; i < n - 1; i++) t.push(m[i - 1] * m[i] <= 0 ? 0 : (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / m[i - 1] + (dx[i] + 2 * dx[i - 1]) / m[i]));
  t.push(m[n - 2]);
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += ` C${pts[i][0] + h},${pts[i][1] + h * t[i]} ${pts[i + 1][0] - h},${pts[i + 1][1] - h * t[i + 1]} ${pts[i + 1][0]},${pts[i + 1][1]}`;
  }
  return d;
}

const tab = { fontVariantNumeric: 'tabular-nums' } as const;
const display = { fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums' } as const;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Weglänge auf dem Pfad, an der die x-Koordinate erreicht wird (Binärsuche; Kurve ist in x monoton) */
function lengthAtX(path: SVGPathElement, x: number) {
  let lo = 0;
  let hi = path.getTotalLength();
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (path.getPointAtLength(mid).x < x) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Signatur-Animation „Sonnenlauf“: Eine Sonnenscheibe läuft beim Eintritt vom heutigen Sonnenaufgang exakt auf der
 * Prognosekurve bis zur echten aktuellen Uhrzeit und wirft einen Lichtkegel auf die Preiszelle darunter.
 * Nachts ruht sie halb versunken am nächsten Sonnenaufgang. Bewegung per rAF (einmalig, ~2,4 s) über transform;
 * danach atmet nur der Schein (CSS-Transform). Reduzierte Bewegung → sofort am Ziel.
 */
function SunTravel({
  line,
  startX,
  targetX,
  day,
  base,
  stripY,
  stripH,
  cellW,
  fs,
  epoch,
}: {
  line: string;
  startX: number;
  targetX: number;
  day: boolean;
  base: number;
  stripY: number;
  stripH: number;
  cellW: number;
  fs: number;
  epoch: number;
}) {
  const pathRef = useRef<SVGPathElement>(null);
  const sunRef = useRef<SVGGElement>(null);
  const beamRef = useRef<SVGGElement>(null);
  // Aktuelle Geometrie in Refs: Layout-Änderungen während der Fahrt unterbrechen die Animation nicht
  const geo = useRef({ startX, targetX, day, base, fs });
  const anim = useRef<{ fromX: number; t0: number; dur: number } | null>(null);
  const placedX = useRef<number | null>(null);
  const raf = useRef(0);

  // Position aus x berechnen (exakt auf der gezeichneten Kurve) und setzen – ohne React-Render
  const placeAt = (px: number) => {
    const path = pathRef.current;
    const sun = sunRef.current;
    const beam = beamRef.current;
    if (!path || !sun || !beam) return;
    const g = geo.current;
    const pt = g.day ? path.getPointAtLength(lengthAtX(path, px)) : { x: px, y: g.base - g.fs * 0.25 };
    sun.setAttribute('transform', `translate(${pt.x} ${pt.y})`);
    beam.setAttribute('transform', `translate(${pt.x} 0)`);
    placedX.current = px;
  };
  const run = () => {
    cancelAnimationFrame(raf.current);
    const tick = (ts: number) => {
      const a = anim.current;
      const to = geo.current.targetX;
      if (!a) return placeAt(to);
      const k = Math.max(0, Math.min(1, (ts - a.t0) / a.dur));
      placeAt(a.fromX + (to - a.fromX) * easeInOut(k));
      if (k < 1) raf.current = requestAnimationFrame(tick);
      else anim.current = null;
    };
    raf.current = requestAnimationFrame(tick);
  };

  // Geometrie aktualisieren; ohne laufende Fahrt sofort neu setzen (z. B. nach Größenänderung)
  useEffect(() => {
    geo.current = { startX, targetX, day, base, fs };
    if (!anim.current) placeAt(targetX);
  });

  // Eintritt: Fahrt vom Sonnenaufgang bis jetzt (nur tagsüber, nicht bei reduzierter Bewegung)
  useEffect(() => {
    if (!geo.current.day || prefersReducedMotion()) {
      anim.current = null;
      placeAt(geo.current.targetX);
      return;
    }
    anim.current = { fromX: geo.current.startX, t0: performance.now() + 1100, dur: 2600 };
    placeAt(geo.current.startX);
    run();
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [epoch, day]);

  // Minütliche Weiterbewegung: kurzes Gleiten zur neuen Uhrzeit
  const roundedTarget = Math.round(targetX);
  useEffect(() => {
    if (anim.current || placedX.current == null || !geo.current.day || prefersReducedMotion()) return;
    if (Math.abs(placedX.current - geo.current.targetX) < 0.5) return;
    anim.current = { fromX: placedX.current, t0: performance.now(), dur: 1200 };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundedTarget]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const r = fs * 0.7;
  return (
    <g pointerEvents="none">
      <defs>
        <radialGradient id="ov-ins-sun-core">
          <stop offset="0" stopColor="#FFFBEA" />
          <stop offset="0.55" stopColor="#FFE7A3" />
          <stop offset="1" stopColor="#F5A70F" />
        </radialGradient>
        <radialGradient id="ov-ins-sun-glow">
          <stop offset="0" stopColor="#FFE7A3" stopOpacity="0.55" />
          <stop offset="0.45" stopColor="#FFD873" stopOpacity="0.18" />
          <stop offset="1" stopColor="#FFD873" stopOpacity="0" />
        </radialGradient>
        <clipPath id="ov-ins-horizon">
          <rect x={-1e4} y={-1e4} width={2e4} height={1e4 + base} />
        </clipPath>
      </defs>
      <path ref={pathRef} d={line} fill="none" stroke="none" />

      {/* Lichtkegel auf das Preisband (nur tagsüber) */}
      <g ref={beamRef} opacity={day ? 1 : 0}>
        <g key={`beam-${epoch}`} style={{ animation: `ov-fade 1200ms var(--ease-out-quart) ${day ? 3500 : 0}ms both` }}>
          {/* Lichtpunkt: die Zelle der aktuellen Stunde leuchtet auf (ohne Kegel über dem Band) */}
          <rect x={-cellW / 2 - fs * 0.1} y={stripY - fs * 0.1} width={cellW + fs * 0.2} height={stripH + fs * 0.2} fill="#FFE7A3" fillOpacity={0.22} stroke="#FFF2C4" strokeWidth={fs * 0.13} rx={fs * 0.25} />
        </g>
      </g>

      <g clipPath={day ? undefined : 'url(#ov-ins-horizon)'}>
        <g ref={sunRef} key={`sun-${epoch}`} style={{ animation: `ov-fade 900ms var(--ease-out-quart) ${day ? 900 : 1200}ms both` }}>
          <circle r={fs * 2.6} fill="url(#ov-ins-sun-glow)" className="ov-breathe" style={{ transformBox: 'fill-box', transformOrigin: 'center', ['--breathe' as string]: '1.12' }} opacity={day ? 1 : 0.75} />
          <circle r={r} fill="url(#ov-ins-sun-core)" opacity={day ? 1 : 0.9} />
        </g>
      </g>
    </g>
  );
}

/**
 * Nacht-Variante des Sonnenlaufs: Ein ruhiger Mond markiert die aktuelle Uhrzeit hoch über der Kurve,
 * eine gepunktete Bahn zeichnet sich zum nächsten Sonnenaufgang, wo eine halbe Sonne am Horizont glimmt.
 * Die Aufgangszeit steht rechts neben der Horizont-Sonne – keine Kreuzung mit Jetzt-Linie oder Kurve.
 * Nur transform/opacity; die Bahn zeichnet sich einmalig (stroke-dashoffset), reduzierte Bewegung → statisch.
 */
function NightSky({ nowX, riseX, riseText, top, base, plotH, fs, epoch }: { nowX: number; riseX: number; riseText: string; top: number; base: number; plotH: number; fs: number; epoch: number }) {
  const my = top + Math.max(fs * 1.8, plotH * 0.3);
  const mr = fs * 0.75;
  const sr = fs * 0.75;
  // Bahn: vom Mond in sanftem Bogen hinab zum Horizontpunkt des Aufgangs
  // Bahn endet schräg über der Horizont-Sonne; die Zeit steht links daneben auf Horizonthöhe
  const ex = riseX - fs * 0.5;
  const ey = base - fs * 1.5;
  const showArc = ex - nowX > fs * 2.5;
  const cx = nowX + (ex - nowX) * 0.55;
  const cy = my - fs * 0.6;
  const path = `M${nowX + mr * 1.3},${my} Q${cx},${cy} ${ex},${ey}`;
  const k = fs / 16;
  return (
    <g key={`night-${epoch}`} pointerEvents="none">
      <defs>
        <radialGradient id="ov-ins-moon-glow">
          <stop offset="0" stopColor="#DCE7FA" stopOpacity="0.4" />
          <stop offset="0.5" stopColor="#9DC1F2" stopOpacity="0.12" />
          <stop offset="1" stopColor="#9DC1F2" stopOpacity="0" />
        </radialGradient>
        <mask id="ov-ins-moon-mask">
          <rect x={-mr * 2} y={-mr * 2} width={mr * 4} height={mr * 4} fill="#fff" />
          <circle cx={mr * 0.55} cy={-mr * 0.3} r={mr * 0.92} fill="#000" />
        </mask>
        <radialGradient id="ov-ins-rise-glow">
          <stop offset="0" stopColor="#FFD873" stopOpacity="0.55" />
          <stop offset="0.5" stopColor="#F5A70F" stopOpacity="0.16" />
          <stop offset="1" stopColor="#F5A70F" stopOpacity="0" />
        </radialGradient>
        <clipPath id="ov-ins-horizon">
          <rect x={-1e4} y={-1e4} width={2e4} height={1e4 + base} />
        </clipPath>
      </defs>

      {showArc && <path
        d={path}
        fill="none"
        stroke="#9DC1F2"
        strokeOpacity={0.55}
        strokeWidth={1.6 * k}
        strokeLinecap="round"
        strokeDasharray={`${0.1 * fs} ${0.55 * fs}`}
        style={{ animation: 'ov-fade 1600ms var(--ease-out-quart) 1500ms both' }}
      />}

      {/* Horizont-Sonne am nächsten Aufgang */}
      <g clipPath="url(#ov-ins-horizon)" style={{ animation: 'ov-fade 1200ms var(--ease-out-quart) 2400ms both' }}>
        <circle cx={riseX} cy={base} r={fs * 2.4} fill="url(#ov-ins-rise-glow)" className="ov-ring-tip" />
        <circle cx={riseX} cy={base + sr * 0.15} r={sr} fill="url(#ov-ins-sun-core-n)" />
      </g>
      <defs>
        <radialGradient id="ov-ins-sun-core-n">
          <stop offset="0" stopColor="#FFFBEA" />
          <stop offset="0.6" stopColor="#FFE7A3" />
          <stop offset="1" stopColor="#F5A70F" />
        </radialGradient>
      </defs>
      <text x={riseX - sr - fs * 0.3} y={base - fs * 0.25} textAnchor="end" fill="#FFD873" fontSize={fs} fontWeight={800} style={{ ...display, animation: 'ov-fade 900ms var(--ease-out-quart) 2600ms both' }}>
        {riseText}
      </text>

      {/* Mond als Jetzt-Marke, schwebt sanft */}
      <g transform={`translate(${nowX} ${my})`}>
        <g style={{ animation: 'ov-fade 1000ms var(--ease-out-quart) 1100ms both' }}>
          <g className="ov-ins-float">
            <circle r={fs * 2.2} fill="url(#ov-ins-moon-glow)" />
            <circle r={mr} fill="#EEF3FC" mask="url(#ov-ins-moon-mask)" />
          </g>
        </g>
      </g>
    </g>
  );
}

/**
 * PV-Prognose heute + morgen (Fläche) mit darunterliegendem, zeitgleichem Preisband.
 * Goldene Stunden ziehen sich als Band über beide Ebenen. Eine y-Achse (kW); der Preis erscheint nur als
 * Farbband mit Klartext-Legende. Die „jetzt“-Marke sitzt in der Zeitachse, Beschriftungen nahe der Jetzt-Linie
 * werden ausgeblendet – keine Überlappungen.
 */
export function ForecastChart({
  pv,
  prices,
  golden,
  sun,
  now,
  kwp,
  epoch,
}: {
  pv: PvSlot[];
  prices: PriceSlot[];
  golden: Range[];
  sun: SunDay[];
  now: number;
  kwp: number;
  epoch: number;
}) {
  const { t, nf, hour, shortSpan, locale } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const { w, h } = useSize(ref);
  const fs = useFontPx(ref, w);
  const k = fs / 16;

  const t0 = viennaMidnight(now);
  const tMid = viennaMidnight(now, 1);
  const t1 = viennaMidnight(now, 2);
  const left = fs * 2.6;
  const right = fs * 0.4;
  const top = fs * 3.5;
  const stripH = fs * 1.35;
  const axisH = fs * 2.1;
  const plotH = Math.max(20, h - top - stripH - axisH - fs * 0.7);
  const base = top + plotH;
  const stripY = base + fs * 0.55;
  const axisY = stripY + stripH + axisH * 0.6;
  const pw = Math.max(10, w - left - right);
  const x = (ms: number) => left + ((ms - t0) / (t1 - t0)) * pw;
  const cellW = (pw / 48) * 1;

  const slots = pv.filter((s) => s.start >= t0 - HOUR && s.start < t1);
  const peakKw = Math.max(kwp * 0.25, ...slots.map((s) => s.kw));
  // Platz über der Spitze für deren Beschriftung (≈ 2,6 Zeilen) einplanen
  const headroom = Math.min(0.45, (fs * 2.6) / plotH);
  const maxKw = Math.max(peakKw * 1.12, peakKw / (1 - headroom));
  // „Schöne“ Rasterschritte (1/2/2,5/5 × 10^n); Linienabstand mindestens ≈ 2,2 Zeilen
  const lines = Math.max(2, Math.min(4, Math.floor(plotH / (fs * 1.8))));
  const step = (() => {
    const p = Math.pow(10, Math.floor(Math.log10(maxKw)) - 1);
    const cands = [1, 2, 2.5, 5, 10, 20, 25, 50, 100].map((m) => m * p);
    return cands.find((c) => Math.floor(maxKw / c) <= lines) ?? cands[cands.length - 1];
  })();
  const y = (kw: number) => base - (kw / maxKw) * plotH;
  const pts: [number, number][] = [[x(t0), base], ...slots.map((s) => [x(s.start + HOUR / 2), y(s.kw)] as [number, number]), [x(t1), base]];
  const line = monotonePath(pts);
  const area = `${line} L${x(t1)},${base} L${x(t0)},${base} Z`;
  const nowX = x(now);
  const showNow = nowX >= left && nowX <= w - right;

  // Sonnenstand heute: tagsüber läuft die Sonne auf der Kurve, sonst ruht sie am nächsten Sonnenaufgang
  const sunToday = sun.find((d) => d.day >= t0 - HOUR && d.day < t0 + HOUR);
  const sunTomorrow = sun.find((d) => d.day >= tMid - HOUR && d.day < tMid + HOUR);
  const isDay = !!sunToday && now >= sunToday.sunrise && now < sunToday.sunset;
  const nextRise = sunToday && now < sunToday.sunrise ? sunToday.sunrise : sunTomorrow?.sunrise;
  const sunStartX = sunToday ? x(sunToday.sunrise) : left;
  const sunTargetX = isDay ? nowX : nextRise ? x(nextRise) : nowX;
  const nightSky = !isDay && !!nextRise && showNow && x(nextRise) > nowX;

  const days = [
    { start: t0, end: tMid, name: t('today'), wd: weekday(t0, locale) },
    { start: tMid, end: t1, name: t('tomorrow'), wd: weekday(tMid, locale) },
  ];
  const peaks = days.map((d) => slots.filter((s) => s.start >= d.start && s.start < d.end).reduce<PvSlot | null>((p, s) => (!p || s.kw > p.kw ? s : p), null));
  const priceDays = days.map((d) => prices.filter((p) => p.start >= d.start && p.start < d.end));
  const gridKw = Array.from({ length: Math.floor(maxKw / step) }, (_, i) => (i + 1) * step);
  const nowText = t('nowShort');
  const nowPillW = nowText.length * fs * 0.55 + fs * 1.4;
  const nearNow = (px: number, halfW: number) => showNow && Math.abs(px - nowX) < halfW + fs * 0.5;
  const delayedTomorrow = viennaParts(now).h >= 14;

  return (
    <div ref={ref} className="relative min-h-0 flex-1">
      {w > 0 && h > 0 && (
        <>
          {/* Hintergrund: Raster, Tage, Goldene Stunden */}
          <svg width={w} height={h} className="absolute inset-0 overflow-visible">
            <defs>
              <linearGradient id="ov-ins-gold" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#FFD873" stopOpacity="0.05" />
                <stop offset="1" stopColor="#FFD873" stopOpacity="0.22" />
              </linearGradient>
            </defs>
            {gridKw.map((g) => (
              <g key={g}>
                <line x1={left} x2={w - right} y1={y(g)} y2={y(g)} stroke="rgb(255 255 255 / 0.08)" strokeWidth={k} />
                <text x={left - fs * 0.5} y={y(g)} dy="0.35em" textAnchor="end" fill="rgb(255 255 255 / 0.65)" fontSize={fs} style={tab}>
                  {nf(g, 0)}
                </text>
              </g>
            ))}
            <text x={left - fs * 0.5} y={top - fs * 1.1} textAnchor="end" fill="rgb(255 255 255 / 0.65)" fontSize={fs}>
              kW
            </text>

            {days.map((d, i) => (
              <text key={d.name} x={x(d.start) + fs * (i ? 0.7 : 0.2)} y={fs * 1.05} fill={i ? 'rgb(255 255 255 / 0.75)' : '#fff'} fontSize={fs * 1.05} fontWeight={800} style={display}>
                {d.name}
                <tspan fill="rgb(255 255 255 / 0.6)" fontWeight={600}>{` · ${d.wd}`}</tspan>
              </text>
            ))}
            <line x1={x(tMid)} x2={x(tMid)} y1={fs * 0.1} y2={stripY + stripH} stroke="rgb(255 255 255 / 0.22)" strokeWidth={k} />

            {golden.map((g) => {
              const gx = (x(g.start) + x(g.end)) / 2;
              const label = shortSpan(g.start, g.end);
              return (
                <g key={g.start} style={{ animation: 'ov-fade 900ms var(--ease-out-quart) 1500ms both' }}>
                  <rect x={x(g.start)} y={top} width={x(g.end) - x(g.start)} height={stripY + stripH - top} rx={fs * 0.45} fill="url(#ov-ins-gold)" />
                  <line x1={x(g.start)} x2={x(g.end)} y1={top} y2={top} stroke="#FFD873" strokeWidth={2.2 * k} strokeLinecap="round" />
                  {/* Beschriftung immer (auch bei kurzen Bändern), oberhalb der Kante – die Jetzt-Linie beginnt erst darunter */}
                  <text x={gx} y={top - fs * 0.45} textAnchor="middle" fill="#FFD873" fontSize={fs} fontWeight={800} style={display}>
                    {label}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Kurve + Preisband: zeichnet sich von links nach rechts */}
          <svg key={epoch} width={w} height={h} className="absolute inset-0 overflow-visible" style={{ animation: 'ov-wipe 2000ms var(--ease-out-quart) 300ms both' }}>
            <defs>
              <linearGradient id="ov-ins-pv" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#FFD873" stopOpacity="0.55" />
                <stop offset="0.55" stopColor="#8CBA58" stopOpacity="0.22" />
                <stop offset="1" stopColor="#669933" stopOpacity="0.02" />
              </linearGradient>
              <linearGradient id="ov-ins-pv-line" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#FFE7A3" />
                <stop offset="1" stopColor="#AED083" />
              </linearGradient>
              <clipPath id="ov-ins-past">
                <rect x={0} y={0} width={Math.max(0, nowX)} height={h} />
              </clipPath>
              <clipPath id="ov-ins-future">
                <rect x={nowX} y={0} width={Math.max(0, w - nowX)} height={h} />
              </clipPath>
            </defs>
            <g clipPath="url(#ov-ins-past)" opacity={0.4}>
              <path d={area} fill="url(#ov-ins-pv)" />
              <path d={line} fill="none" stroke="url(#ov-ins-pv-line)" strokeWidth={2 * k} />
            </g>
            <g clipPath="url(#ov-ins-future)">
              <path d={area} fill="url(#ov-ins-pv)" />
              <path d={line} fill="none" stroke="url(#ov-ins-pv-line)" strokeWidth={2.6 * k} strokeLinejoin="round" />
            </g>
            <line x1={left} x2={w - right} y1={base + 0.5} y2={base + 0.5} stroke="rgb(255 255 255 / 0.22)" strokeWidth={k} />

            {priceDays.map((ds, i) => {
              const st = dayStats(ds);
              if (!st)
                return (
                  <g key={i}>
                    <rect
                      x={x(days[i].start) + fs * 0.3}
                      y={stripY}
                      width={x(days[i].end) - x(days[i].start) - fs * 0.6}
                      height={stripH}
                      rx={fs * 0.35}
                      fill="rgb(255 255 255 / 0.03)"
                      stroke="rgb(255 255 255 / 0.25)"
                      strokeWidth={k}
                      strokeDasharray={`${4 * k} ${4 * k}`}
                    />
                    <text x={(x(days[i].start) + x(days[i].end)) / 2} y={stripY + stripH / 2} dy="0.35em" textAnchor="middle" fill="rgb(255 255 255 / 0.7)" fontSize={fs}>
                      {i ? t(delayedTomorrow ? 'tomorrowDelayed' : 'tomorrowFrom13') : t('noPrices')}
                    </text>
                  </g>
                );
              return ds.map((p) => {
                const past = p.start + HOUR <= now;
                return (
                  <rect
                    key={p.start}
                    x={x(p.start) + k}
                    y={stripY}
                    width={Math.max(1, x(p.start + HOUR) - x(p.start) - 2 * k)}
                    height={stripH}
                    rx={2 * k}
                    fill={past ? PAST_GREY : TONE[verdictOf(p.ct, st)].bar}
                    opacity={past ? 0.35 : 0.88}
                  />
                );
              });
            })}
          </svg>

          {/* Vordergrund: Jetzt-Linie (hinter Beschriftungen), Sonnenlauf, Achse, Sonnenzeiten, Spitzen */}
          <svg width={w} height={h} className="pointer-events-none absolute inset-0 overflow-visible">
            {showNow && (
              <line
                x1={nowX}
                x2={nowX}
                y1={top + fs * 0.2}
                y2={base}
                stroke="#fff"
                strokeOpacity={0.8}
                strokeWidth={1.6 * k}
                strokeDasharray={`${2 * k} ${3 * k}`}
                style={{ animation: 'ov-fade 700ms var(--ease-out-quart) 1300ms both' }}
              />
            )}

            {slots.length > 0 && nightSky && nextRise && (
              <NightSky nowX={nowX} riseX={x(nextRise)} riseText={hhmm(nextRise)} top={top} base={base} plotH={plotH} fs={fs} epoch={epoch} />
            )}
            {slots.length > 0 && isDay && (
              <SunTravel
                line={line}
                startX={sunStartX}
                targetX={sunTargetX}
                day={isDay}
                base={base}
                stripY={stripY}
                stripH={stripH}
                cellW={cellW}
                fs={fs}
                epoch={epoch}
              />
            )}

            {[0, 6, 12, 18, 24, 30, 36, 42, 48].map((hr) => {
              const ms = t0 + hr * HOUR;
              const tx = Math.min(Math.max(x(ms), left + fs * 0.6), w - right - fs * 0.6);
              if (nearNow(tx, nowPillW / 2 + fs * 0.4)) return null; // Platz für die Jetzt-Marke
              return (
                <text key={hr} x={tx} y={axisY} dy="0.35em" textAnchor="middle" fill="rgb(255 255 255 / 0.7)" fontSize={fs} style={tab}>
                  {hh(ms)}
                </text>
              );
            })}

            {sun
              .filter((d) => d.day >= t0 - HOUR && d.day < t1)
              .flatMap((d) => [
                { ms: d.sunrise, Icon: Sunrise, key: `r${d.day}` },
                { ms: d.sunset, Icon: Sunset, key: `s${d.day}` },
              ])
              .filter(({ ms }) => !(nightSky && nextRise === ms)) // nachts zeigt die Horizont-Sonne den Aufgang
              .map(({ ms, Icon, key }) => {
                const sx = x(ms);
                // Nahe der Jetzt-Linie: Zeit seitlich versetzt statt ausgeblendet
                const side = nearNow(sx, fs * 1.4) ? (sx < nowX ? -1 : 1) : 0;
                return (
                  <g key={key} style={{ animation: 'ov-fade 800ms var(--ease-out-quart) 1800ms both' }}>
                    <Icon x={sx - fs * 0.6} y={base - fs * 1.45} width={fs * 1.2} height={fs * 1.2} color="#FFD873" strokeWidth={2} />
                    <text
                      x={side ? nowX + side * fs * 0.45 : sx}
                      y={base - fs * 1.8}
                      textAnchor={side < 0 ? 'end' : side > 0 ? 'start' : 'middle'}
                      fill="rgb(255 255 255 / 0.78)"
                      fontSize={fs}
                      style={tab}
                    >
                      {hhmm(ms)}
                    </text>
                  </g>
                );
              })}

            {peaks.map((p, i) => {
              if (!p || p.kw <= 0.05) return null;
              const px = x(p.start + HOUR / 2);
              const py = y(p.kw);
              const text = `${nf(p.kw)} kW · ${hour(p.start)}`;
              const pfs = fs;
              const tw = text.length * pfs * 0.56 + fs * 1.2;
              const ph = fs * 1.6;
              let lx = Math.min(Math.max(px - tw / 2, left), w - right - tw);
              // Nachts: Pille weicht dem Mond (Jetzt-Marke) seitlich aus
              if (nightSky && lx < nowX + fs * 1.6 && lx + tw > nowX - fs * 1.6) lx = px < nowX ? nowX - fs * 1.6 - tw : nowX + fs * 1.6;
              // Pille stets oberhalb der Zeile mit Auf-/Untergangszeiten; bei niedriger Spitze mit Führungslinie
              const ly = Math.max(top + fs * 0.2, Math.min(py - fs * 0.6 - ph, base - fs * 2.7 - ph));
              return (
                <g key={i} style={{ animation: `ov-rise 900ms var(--ease-out-expo) ${1700 + i * 200}ms both` }}>
                  {py - (ly + ph) > fs * 0.8 && <line x1={px} x2={px} y1={ly + ph} y2={py} stroke="#FFD873" strokeOpacity={0.5} strokeWidth={k} />}
                  <circle cx={px} cy={py} r={fs * 0.26} fill="#FFE7A3" />
                  <rect x={lx} y={ly} width={tw} height={ph} rx={ph / 2} fill="#0a1c3b" stroke="#FFD873" strokeOpacity={0.6} strokeWidth={k} />
                  <text x={lx + tw / 2} y={ly + ph / 2} dy="0.35em" textAnchor="middle" fill="#FFD873" fontSize={pfs} fontWeight={800} style={display}>
                    {text}
                  </text>
                </g>
              );
            })}

            {showNow && (
              <g style={{ animation: 'ov-fade 700ms var(--ease-out-quart) 1300ms both' }}>
                <line x1={nowX} x2={nowX} y1={stripY + stripH} y2={axisY - fs * 0.72} stroke="#fff" strokeOpacity={0.8} strokeWidth={1.6 * k} />
                <rect x={nowX - nowPillW / 2} y={axisY - fs * 0.75} width={nowPillW} height={fs * 1.5} rx={fs * 0.75} fill="#fff" />
                <text x={nowX} y={axisY} dy="0.35em" textAnchor="middle" fill="#0a1c3b" fontSize={fs} fontWeight={800} style={display}>
                  {nowText}
                </text>
              </g>
            )}
          </svg>
        </>
      )}
    </div>
  );
}
