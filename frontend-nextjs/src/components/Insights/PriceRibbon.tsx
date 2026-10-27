import { useRef } from 'react';
import type { PriceSlot } from './data';
import type { DayStats, Window } from './derive';
import { PAST_GREY, TONE, verdictOf } from './derive';
import { useFontPx, useSize } from './hooks';
import { useI18n } from './i18n';
import { HOUR, hh } from './time';

/**
 * 24-h-Preisband: Balken je Stunde ab der Nulllinie (negative Preise zeigen nach unten), Farbe = Drittel der
 * Tagesspanne (Legende mit Text), Tief und Hoch zusätzlich beschriftet, vergangene Stunden grau.
 * Jetzt-Markierung mit Puls, günstigstes Fenster als Klammer. Balken wachsen gestaffelt (nur transform).
 */
export function PriceRibbon({
  slots,
  stats,
  now,
  cheap,
  epoch,
  compact = false,
  pastCheap = null,
  cheapKey = 'cheapest3',
}: {
  slots: PriceSlot[];
  stats: DayStats;
  now: number | null;
  cheap: Window | null;
  epoch: number;
  compact?: boolean;
  /** Bereits vergangenes Tages-Bestfenster: nur dezent markiert, ohne Beschriftung */
  pastCheap?: Window | null;
  cheapKey?: 'cheapest3' | 'nextCheap3';
}) {
  const { t, span, nf } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const { w, h } = useSize(ref);
  const fs = useFontPx(ref, w);
  if (!slots.length) return <div ref={ref} className="min-h-0 flex-1" />;

  const k = fs / 16;
  const t0 = slots[0].start;
  const n = Math.max(24, slots.length);
  const axisH = fs * 1.7;
  const valFs = fs;
  const valPad = compact ? 0 : valFs * 1.05;
  const topPad = (cheap && !compact ? fs * 2 : fs * 0.3) + valPad;
  const lo = Math.min(0, stats.min.ct);
  const hi = Math.max(0, stats.max.ct) || 1;
  const negPad = lo < 0 && !compact ? valFs * 1.3 : 0;
  const plotH = Math.max(10, h - axisH - topPad - negPad);
  const gap = Math.max(2 * k, (w / n) * 0.16);
  const bw = w / n - gap;
  const x = (ms: number) => ((ms - t0) / HOUR) * (w / n);
  const y = (ct: number) => topPad + plotH * (1 - (ct - lo) / (hi - lo));
  const zeroY = y(0);
  const axisTop = topPad + plotH + negPad;
  const cheapLabel = cheap
    ? `${t(cheapKey)} · ${span(cheap.start, cheap.end)} · Ø ${nf(cheap.avg)} ct`
    : '';
  const labelFs = fs;
  const labelW = cheapLabel.length * labelFs * 0.53;
  const nowIdx = now != null ? Math.floor((now - t0) / HOUR) : -1;
  const nowX = now != null ? x(now) : null;
  const gid = `ov-ins-win-${compact ? 'c' : 'h'}`;

  return (
    <div ref={ref} className="relative min-h-0 flex-1">
      {w > 0 && h > 0 && (
        <svg width={w} height={h} className="absolute inset-0 overflow-visible" key={epoch}>
          <defs>
            <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#AED083" stopOpacity="0.28" />
              <stop offset="1" stopColor="#AED083" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {pastCheap && (
            <rect
              x={x(pastCheap.start) - gap / 2}
              y={topPad - valPad}
              width={x(pastCheap.end) - x(pastCheap.start)}
              height={plotH + negPad + valPad}
              rx={fs * 0.5}
              fill="none"
              stroke="#AED083"
              strokeOpacity={0.35}
              strokeWidth={k}
              strokeDasharray={`${3 * k} ${4 * k}`}
            />
          )}
          {cheap && (
            <g style={{ animation: 'ov-fade 900ms var(--ease-out-quart) 900ms both' }}>
              <rect
                x={x(cheap.start) - gap / 2}
                y={topPad - valPad}
                width={x(cheap.end) - x(cheap.start)}
                height={plotH + negPad + valPad}
                rx={fs * 0.5}
                fill={`url(#${gid})`}
              />
              {!compact && (
                <>
                  <path
                    d={`M${x(cheap.start)} ${topPad - valPad - fs * 0.1} v${-fs * 0.45} H${x(cheap.end) - gap} v${fs * 0.45}`}
                    fill="none"
                    stroke="#AED083"
                    strokeWidth={1.8 * k}
                    strokeLinecap="round"
                  />
                  <text
                    x={Math.min(Math.max((x(cheap.start) + x(cheap.end) - gap) / 2 - labelW / 2, 0), w - labelW)}
                    y={topPad - valPad - fs * 0.85}
                    fill="#AED083"
                    fontSize={labelFs}
                    fontWeight={700}
                    style={{ fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums' }}
                  >
                    {cheapLabel}
                  </text>
                </>
              )}
            </g>
          )}

          <line x1={0} x2={w} y1={y(stats.avg)} y2={y(stats.avg)} stroke="rgb(255 255 255 / 0.35)" strokeWidth={k} strokeDasharray={`${3 * k} ${5 * k}`} />

          {slots.map((s, i) => {
            const v = verdictOf(s.ct, stats);
            const past = nowIdx >= 0 && i < nowIdx;
            const cur = i === nowIdx;
            const yv = y(s.ct);
            return (
              <rect
                key={s.start}
                x={x(s.start)}
                y={Math.min(yv, zeroY)}
                width={bw}
                height={Math.max(2 * k, Math.abs(zeroY - yv))}
                rx={Math.min(bw / 2, fs * 0.3)}
                fill={past ? PAST_GREY : TONE[v].bar}
                opacity={cur ? 1 : past ? 0.4 : 0.82}
                style={{
                  transformOrigin: s.ct < 0 ? 'top' : 'bottom',
                  transformBox: 'fill-box',
                  animation: `ov-bar-grow 900ms var(--ease-out-expo) ${120 + i * 28}ms both`,
                }}
              />
            );
          })}

          {/* Tief und Hoch beschriftet – Status nicht nur über Farbe */}
          {!compact &&
            [stats.min, stats.max].map((s, i) => {
              const yv = y(s.ct);
              const below = s.ct < 0;
              return (
                <text
                  key={i}
                  x={Math.min(Math.max(x(s.start) + bw / 2, fs), w - fs)}
                  y={below ? yv + valFs * 1.05 : yv - valFs * 0.35}
                  textAnchor="middle"
                  fill={i ? TONE.high.text : TONE.low.text}
                  fontSize={valFs}
                  fontWeight={800}
                  stroke="#0b1d3d"
                  strokeWidth={fs * 0.28}
                  strokeLinejoin="round"
                  paintOrder="stroke"
                  style={{ fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums', animation: 'ov-fade 700ms var(--ease-out-quart) 1100ms both' }}
                >
                  {nf(s.ct)}
                </text>
              );
            })}

          {/* Nulllinie (bei negativen Preisen betont und beschriftet) */}
          <line
            x1={0}
            x2={w}
            y1={zeroY + 0.5}
            y2={zeroY + 0.5}
            stroke={lo < 0 ? 'rgb(255 255 255 / 0.65)' : 'rgb(255 255 255 / 0.2)'}
            strokeWidth={(lo < 0 ? 1.5 : 1) * k}
          />
          {Array.from({ length: n + 1 }, (_, i) => i)
            .filter((i) => i % (compact ? 6 : 3) === 0)
            .map((i) => (
              <text
                key={i}
                x={Math.min(Math.max(i * (w / n) - gap / 2, fs * 0.9), w - fs * 0.9)}
                y={axisTop + axisH * 0.75}
                textAnchor="middle"
                fill="rgb(255 255 255 / 0.7)"
                fontSize={fs}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {hh(t0 + i * HOUR)}
              </text>
            ))}

          {nowX != null && nowX >= 0 && nowX <= w && (
            <g style={{ animation: 'ov-fade 700ms var(--ease-out-quart) 1200ms both' }}>
              <line x1={nowX} x2={nowX} y1={topPad - fs * 0.3} y2={axisTop} stroke="#fff" strokeWidth={1.6 * k} strokeDasharray={`${2 * k} ${3 * k}`} />
              <circle cx={nowX} cy={zeroY} r={fs * 0.32} fill="#fff" />
              <circle
                cx={nowX}
                cy={zeroY}
                r={fs * 0.32}
                fill="none"
                stroke="#fff"
                strokeWidth={1.6 * k}
                style={{ transformOrigin: `${nowX}px ${zeroY}px`, animation: 'ov-pulse-ring 2.6s cubic-bezier(0.2,0.6,0.3,1) infinite' }}
              />
            </g>
          )}
        </svg>
      )}
    </div>
  );
}

/** Legende: Farbe immer mit Text */
export function ToneLegend({ className, past = true }: { className?: string; past?: boolean }) {
  const { t } = useI18n();
  return (
    <div className={`flex flex-wrap items-center gap-x-[1.1em] gap-y-[0.2em] text-[1em] text-white/70 ${className ?? ''}`}>
      {(['low', 'mid', 'high'] as const).map((key) => (
        <span key={key} className="inline-flex items-center gap-[0.4em]">
          <span className="size-[0.75em] rounded-[0.2em]" style={{ background: TONE[key].bar }} />
          {t(key)}
        </span>
      ))}
      {past && (
        <span className="inline-flex items-center gap-[0.4em]">
          <span className="size-[0.75em] rounded-[0.2em] opacity-60" style={{ background: PAST_GREY }} />
          {t('past')}
        </span>
      )}
      <span className="inline-flex items-center gap-[0.4em]">
        <span className="w-[1.2em] border-t border-dashed border-white/60" />
        {t('avgDay')}
      </span>
    </div>
  );
}
