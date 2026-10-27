import { useId, useMemo } from 'react';
import { tr } from '../../../design/hooks';
import { CI_THRESHOLDS, T, ciColor, localeOf, type Lang } from './config';
import { baseEm, useSize } from './useSize';
import type { HistoryPoint } from './useGridData';

const fmtHour = (t: number, loc = 'de-AT') => new Intl.DateTimeFormat(loc, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Europe/Vienna' }).format(new Date(t));
const hourOf = (t: number) => Number(new Intl.DateTimeFormat('de-AT', { hour: '2-digit', hourCycle: 'h23', timeZone: 'Europe/Vienna' }).format(new Date(t)));

interface Props {
  history: HistoryPoint[] | null;
  loading: boolean;
  language: Lang;
  staleLabel: string | null;
}

/** Verlauf der CO₂-Intensität der letzten 24 h (echte Stundenwerte von electricitymaps), Linie in den Farben der CO₂-Skala. */
export function CarbonHistory({ history, loading, language, staleLabel }: Props) {
  const uid = useId().replace(/:/g, '');
  const L = (t: Parameters<typeof tr>[1]) => tr(language, t);
  const [ref, { w: W, h: H }] = useSize<HTMLDivElement>();
  const loc = localeOf(language);
  const nf = (v: number) => new Intl.NumberFormat(loc, { maximumFractionDigits: 0 }).format(v);

  const pts = useMemo(() => (history ? [...history].sort((a, b) => a.t - b.t).slice(-24) : []), [history]);
  const stats = useMemo(() => {
    if (pts.length < 2) return null;
    const vs = pts.map((p) => p.v);
    const min = Math.min(...vs);
    const max = Math.max(...vs);
    return { min, max, avg: vs.reduce((s, v) => s + v, 0) / vs.length };
  }, [pts]);

  const geo = useMemo(() => {
    if (!stats || !W || !H) return null;
    const em = baseEm();
    const padL = 3.2 * em;
    const padR = 4.6 * em;
    const padT = 1.2 * em;
    const padB = 1.9 * em;
    const span = Math.max(100, stats.max - stats.min);
    const lo = Math.max(0, Math.floor((stats.min - span * 0.35) / 50) * 50);
    const hi = Math.ceil((stats.max + span * 0.35) / 50) * 50;
    const t0 = pts[0].t;
    const t1 = pts[pts.length - 1].t;
    const x = (t: number) => padL + ((t - t0) / Math.max(1, t1 - t0)) * (W - padL - padR);
    const y = (v: number) => padT + (1 - (v - lo) / (hi - lo)) * (H - padT - padB);
    // weiche Kurve (Catmull-Rom → Bézier)
    const P = pts.map((p) => [x(p.t), y(p.v)] as const);
    let d = `M${P[0][0]} ${P[0][1]}`;
    for (let i = 0; i < P.length - 1; i++) {
      const p0 = P[i - 1] ?? P[i];
      const p1 = P[i];
      const p2 = P[i + 1];
      const p3 = P[i + 2] ?? p2;
      d += `C${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]} ${p2[1]}`;
    }
    const area = `${d}L${P[P.length - 1][0]} ${H - padB}L${P[0][0]} ${H - padB}Z`;
    const step = [50, 100, 200, 250, 500].find((st) => (hi - lo) / st <= 3) ?? 500;
    const ticks: number[] = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ticks.push(v);
    const hours = pts.filter((p) => hourOf(p.t) % 6 === 0);
    const stops = Array.from({ length: 7 }, (_, i) => {
      const v = hi - ((hi - lo) * i) / 6;
      return { o: i / 6, c: ciColor(v) };
    });
    return { em, padB, padT, x, y, d, area, ticks, hours, stops, last: P[P.length - 1], lo, hi };
  }, [stats, W, H, pts]);

  const lastV = pts.length ? pts[pts.length - 1].v : null;
  const estimated = pts.some((p) => p.estimated);

  return (
    <div className="ov-glass relative flex h-full min-h-0 flex-col overflow-hidden rounded-[30px] px-[4.5%] pb-[1.6%] pt-[2.6%]">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className={staleLabel ? 'eyebrow-plain !text-[1em] text-white/65' : 'eyebrow !text-[1em]'}>
          {L(T.historyTitle)}
          {staleLabel && <span className="font-semibold normal-case tracking-normal"> · {staleLabel}</span>}
        </div>
        {stats && (
          <div className="flex items-baseline gap-[1.1em]">
            {[
              { k: T.min, v: stats.min },
              { k: T.avg, v: stats.avg },
              { k: T.max, v: stats.max },
            ].map((x) => (
              <span key={x.k.DE} className="inline-flex items-baseline gap-[0.35em]">
                <span className="text-[1em] font-semibold text-white/65">{L(x.k)}</span>
                <span className="num-display text-[1.35em] leading-none text-white">{nf(x.v)}</span>
              </span>
            ))}
            <span className="text-[1em] font-semibold text-white/65">
              g CO<sub>2</sub>eq/kWh
            </span>
          </div>
        )}
      </div>

      <div ref={ref} className="relative mt-[0.3em] min-h-0 flex-1">
        {geo && (
          <svg width={W} height={H} className="absolute inset-0 overflow-visible" aria-hidden>
            <defs>
              <linearGradient id={`ln-${uid}`} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1={geo.padT} y2={H - geo.padB}>
                {geo.stops.map((s) => (
                  <stop key={s.o} offset={s.o} stopColor={s.c} />
                ))}
              </linearGradient>
              <linearGradient id={`ar-${uid}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#fff" stopOpacity="0.16" />
                <stop offset="1" stopColor="#fff" stopOpacity="0" />
              </linearGradient>
              <mask id={`mk-${uid}`}>
                <path d={geo.area} fill={`url(#ar-${uid})`} />
              </mask>
            </defs>
            {/* Raster + Werte */}
            {geo.ticks.map((v) => (
              <g key={v}>
                <line x1={geo.x(pts[0].t)} x2={W - geo.em * 4.6} y1={geo.y(v)} y2={geo.y(v)} stroke="rgb(255 255 255 / 0.07)" />
                <text x={geo.em * 2.6} y={geo.y(v)} textAnchor="end" dominantBaseline="middle" fill="rgb(255 255 255 / 0.65)" fontSize={geo.em} fontWeight={600} className="tabular">
                  {v}
                </text>
              </g>
            ))}
            {/* Schwellen niedrig/hoch, falls im Bereich */}
            {[CI_THRESHOLDS.low, CI_THRESHOLDS.high]
              .filter((v) => v > geo.lo && v < geo.hi)
              .map((v) => (
                <g key={v}>
                  <line x1={geo.x(pts[0].t)} x2={W - geo.em * 4.6} y1={geo.y(v)} y2={geo.y(v)} stroke={ciColor(v)} strokeOpacity="0.55" strokeDasharray="4 6" />
                  <text x={geo.x(pts[0].t) + geo.em * 0.3} y={geo.y(v) - geo.em * 0.35} fill="rgb(255 255 255 / 0.65)" fontSize={geo.em} fontWeight={600}>
                    {v === CI_THRESHOLDS.low ? `${L(T.low)} < ${v}` : `${L(T.high)} > ${v}`}
                  </text>
                </g>
              ))}
            {/* Fläche in Skalenfarben, ausgeblendet nach unten */}
            <rect x="0" y="0" width={W} height={H} fill={`url(#ln-${uid})`} mask={`url(#mk-${uid})`} />
            <path d={geo.d} fill="none" stroke={`url(#ln-${uid})`} strokeWidth={geo.em * 0.22} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} className="ov-map-draw" />
            {/* Zeitachse */}
            {geo.hours.map((p) => (
              <text key={p.t} x={geo.x(p.t)} y={H - geo.em * 0.35} textAnchor="middle" fill="rgb(255 255 255 / 0.65)" fontSize={geo.em} fontWeight={600} className="tabular">
                {fmtHour(p.t, loc)}
              </text>
            ))}
            {/* letzter Wert */}
            <circle cx={geo.last[0]} cy={geo.last[1]} r={geo.em * 0.9} fill={ciColor(lastV ?? 0)} opacity="0.3" />
            <circle cx={geo.last[0]} cy={geo.last[1]} r={geo.em * 0.38} fill="#fff" stroke={ciColor(lastV ?? 0)} strokeWidth={geo.em * 0.14} />
            <text x={geo.last[0] + geo.em * 0.9} y={geo.last[1]} dominantBaseline="middle" fill="#fff" fontSize={geo.em * 1.05} fontWeight={800} style={{ fontFamily: 'var(--font-display)' }} className="tabular">
              {nf(lastV ?? 0)}
            </text>
          </svg>
        )}
        {!stats &&
          (loading ? (
            <div className="ov-skeleton absolute inset-x-0 bottom-[20%] top-[10%] rounded-2xl" />
          ) : (
            <div className="grid h-full place-items-center text-[1em] text-white/65">{L(T.historyNone)}</div>
          ))}
      </div>
      {estimated && <div className="absolute bottom-[3%] right-[4.5%] text-[1em] text-white/65">{L(T.historyEstimated)}</div>}
    </div>
  );
}
