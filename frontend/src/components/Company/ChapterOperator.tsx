import { BadgeEuro, HardHat, RefreshCw, Sun, Tractor, Truck, UtilityPole, Wrench, type LucideIcon } from 'lucide-react';
import { delay } from '../../design/hooks';
import { OPERATOR } from './facts';
import { Card } from './ui';

const KNOW_ICON: LucideIcon[] = [Sun, Wrench, RefreshCw, UtilityPole, BadgeEuro];
/** Anzeige mit weichem Trennzeichen, damit „Wechselrichtertausch“ sauber umbricht */
const KNOW_LABEL: Record<string, string> = { Wechselrichtertausch: 'Wechselrichter­tausch' };

/** Modulband: Spalten × 2 Reihen – symbolisiert durchgehenden Betrieb seit 2012, keine Anzahl von Parks */
const COLS = 34;
const BAND_START_MS = 450;
const COL_MS = 62;

function ModuleBand() {
  const w = 1000;
  const h = 64;
  const gap = 3;
  const cw = (w - gap * (COLS - 1)) / COLS;
  const rh = (h - gap) / 2;
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="block h-[3.4em] w-full" aria-hidden>
        <defs>
          <linearGradient id="cp-mod" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#4a80c8" />
            <stop offset="0.5" stopColor="#1f4f92" />
            <stop offset="1" stopColor="#0d2a5a" />
          </linearGradient>
        </defs>
        {Array.from({ length: COLS }, (_, c) =>
          [0, 1].map((r) => (
            <rect
              key={`${c}-${r}`}
              x={c * (cw + gap)}
              y={r * (rh + gap)}
              width={cw}
              height={rh}
              rx="1.5"
              fill="url(#cp-mod)"
              stroke="#cfe0f5"
              strokeOpacity="0.28"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
              className="cp-module"
              style={{ transformBox: 'fill-box', ...delay(BAND_START_MS + c * COL_MS + r * 40) }}
            />
          )),
        )}
      </svg>
      {/* Lichtkante über das fertige Band (nur transform/opacity) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[4px]">
        <span
          className="cp-sweep absolute inset-y-0 left-0 w-full bg-[linear-gradient(100deg,transparent_42%,rgb(255_231_163/0.55)_50%,transparent_58%)]"
          style={delay(BAND_START_MS + COLS * COL_MS + 600)}
        />
      </div>
      {/* Wiese unter den Tischen */}
      <div aria-hidden className="mt-[0.25em] h-[0.35em] rounded-full bg-[linear-gradient(90deg,rgb(102_153_51/0.25),rgb(140_186_88/0.6),rgb(102_153_51/0.25))]" />
    </div>
  );
}

/** Kapitel: Betreiber aus Überzeugung – eigene Solarparks seit 2012 (Quelle: /tv) */
export function ChapterOperator({ wide }: { wide: boolean }) {
  const n = OPERATOR.years.length;
  const bandEnd = BAND_START_MS + COLS * COL_MS;
  return (
    <Card className={`flex h-full min-h-0 flex-col justify-between gap-[1.2em] ${wide ? 'p-[1.8em_2.4em]' : 'p-[2.4em_2.4em_2.2em]'}`}>
      <div>
        <div className="eyebrow">{OPERATOR.eyebrow}</div>
        <h2
          className={`ov-rise mt-[0.4em] font-[var(--font-display)] font-extrabold leading-[1.02] tracking-[-0.035em] text-white ${wide ? 'text-[3em]' : 'text-[3.6em]'}`}
          style={delay(160)}
        >
          {OPERATOR.title.lead} <span className="cp-hl text-gradient-sun">{OPERATOR.title.highlight}</span>
        </h2>
        <p className={`ov-rise mt-[0.5em] font-medium text-white/85 ${wide ? 'text-[1.35em]' : 'text-[1.55em]'}`} style={delay(260)}>
          {OPERATOR.body}
        </p>
      </div>

      {/* Zeitachse: ein Modulband wächst von 2012 bis heute */}
      <div
        className={`ov-rise relative overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgb(31_83_154/0.22),rgb(3_18_43/0.15)_80%)] ${wide ? 'p-[1.2em_1.6em]' : 'p-[1.5em_1.6em]'}`}
        style={delay(340)}
      >
        <div aria-hidden className="pointer-events-none absolute -right-[10%] -top-[60%] h-[160%] w-[50%] bg-[radial-gradient(closest-side,rgb(255_216_115/0.22),transparent)]" />
        <div className="eyebrow-plain relative text-white/80">{OPERATOR.timelineTitle}</div>
        <div className="relative mt-[1.1em] px-[calc(50%/8)]">
          <ModuleBand />
        </div>
        <ol className="relative mt-[0.4em] grid" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
          {OPERATOR.years.map((y, i) => {
            const live = i === n - 1;
            const at = BAND_START_MS + (i / (n - 1)) * (bandEnd - BAND_START_MS);
            return (
              <li key={y} className="flex flex-col items-center">
                <span className="relative flex h-[1.1em] w-full items-center justify-center">
                  <span
                    aria-hidden
                    className={`absolute top-1/2 h-[2px] -translate-y-1/2 overflow-hidden bg-white/12 ${i === 0 ? 'left-1/2 right-0' : live ? 'left-0 right-1/2' : 'inset-x-0'}`}
                  >
                    <span className="cp-fill block h-full bg-[linear-gradient(90deg,#8CBA58,#AED083)]" style={delay(at - 120)} />
                  </span>
                  <span className="relative grid size-[1.1em] place-items-center">
                    {live && <span className="cp-ring absolute inset-[-0.35em] rounded-full border border-[#FFD873]/70" style={delay(bandEnd)} />}
                    <span className={`cp-pop block rounded-full ${live ? 'size-[1.1em] bg-[#FFD873]' : 'size-[0.7em] bg-[#AED083]'}`} style={delay(at)} />
                  </span>
                </span>
                <span className={`ov-rise mt-[0.5em] num-display ${live ? 'text-[1.45em] text-[#FFD873]' : 'text-[1.3em] text-white/85'}`} style={delay(at + 60)}>
                  {y}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className={`grid gap-[1em] ${wide ? 'grid-cols-[1.35fr_1fr]' : 'grid-cols-1'}`}>
        {/* Was wir aus dem Betrieb kennen */}
        <div className="ov-well ov-rise rounded-[24px] border p-[1.2em_1.4em]" style={delay(bandEnd + 200)}>
          <div className="eyebrow-plain text-[#AED083]">{OPERATOR.knowTitle}</div>
          <ul className="mt-[0.9em] grid grid-cols-5 gap-x-[1em] gap-y-[0.6em]">
            {OPERATOR.know.map((k, i) => {
              const Icon = KNOW_ICON[i];
              return (
                <li key={k} className="flex min-w-0 flex-col items-center text-center">
                  <span className="grid size-[2.8em] place-items-center rounded-[0.9em] border border-white/15 bg-white/5">
                    <Icon className="size-[1.4em] text-[#AED083]" strokeWidth={1.8} />
                  </span>
                  <span lang="de" className={`mt-[0.5em] font-semibold leading-tight text-white [hyphens:manual] ${wide ? 'text-[1em]' : 'text-[1.15em]'}`}>
                    {KNOW_LABEL[k] ?? k}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Eigene Mannschaft und Maschinen */}
        <div className="ov-well ov-rise flex items-center gap-[1.2em] rounded-[24px] border p-[1.2em_1.4em]" style={delay(bandEnd + 400)}>
          <div className="flex shrink-0 gap-[0.5em]">
            {[HardHat, Truck, Tractor].map((Icon, i) => (
              <span key={i} className="ov-tile-brand grid size-[2.8em] place-items-center rounded-[0.9em]">
                <Icon className="size-[1.45em] text-white" strokeWidth={1.8} />
              </span>
            ))}
          </div>
          <p className={`font-[var(--font-display)] font-extrabold leading-snug text-white ${wide ? 'text-[1.25em]' : 'text-[1.45em]'}`}>{OPERATOR.own}</p>
        </div>
      </div>
    </Card>
  );
}
