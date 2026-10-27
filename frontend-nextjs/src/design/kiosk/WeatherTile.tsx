import { useId, useLayoutEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Wind } from 'lucide-react';
import { tr, useGrace } from '../hooks';
import { Unavailable } from '../primitives';
import { useDaylight } from '../daylight';
import { useWeather, weatherKind, weatherLabel } from './data';

/* ------------------------------------------------------------------ Animierte Wetter-Icons
   Reines SVG; Bewegung nur über transform/opacity (Klassen wx-* in index.css).
   `still` = statisch (für die kleinen Vorschau-Icons). */

const CLOUD = 'M17 50h29a10.5 10.5 0 0 0 1.2-20.9A15 15 0 0 0 19 27.6 11.3 11.3 0 0 0 17 50Z';
const CLOUD_SMALL = 'M30 30h18a7 7 0 0 0 .8-13.9A10 10 0 0 0 30 15.3 7.4 7.4 0 0 0 30 30Z';

function SunGlyph({ cx, cy, r, still }: { cx: number; cy: number; r: number; still?: boolean }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r * 2.1} fill="#FFD873" opacity="0.12" />
      <g className={still ? undefined : 'wx-rays'}>
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return (
            <line
              key={i}
              x1={cx + Math.cos(a) * r * 1.45}
              y1={cy + Math.sin(a) * r * 1.45}
              x2={cx + Math.cos(a) * r * 1.95}
              y2={cy + Math.sin(a) * r * 1.95}
              stroke="#FFD873"
              strokeWidth="2.6"
              strokeLinecap="round"
            />
          );
        })}
      </g>
      <circle cx={cx} cy={cy} r={r} fill="#FFD873" />
      <circle cx={cx - r * 0.3} cy={cy - r * 0.3} r={r * 0.45} fill="#FFF1C2" opacity="0.6" />
    </g>
  );
}

function MoonGlyph({ cx, cy, r, mask }: { cx: number; cy: number; r: number; mask: string }) {
  return (
    <g>
      <defs>
        <mask id={mask}>
          <circle cx={cx} cy={cy} r={r} fill="#fff" />
          <circle cx={cx + r * 0.55} cy={cy - r * 0.35} r={r * 0.85} fill="#000" />
        </mask>
      </defs>
      <circle cx={cx} cy={cy} r={r * 2} fill="#9DC1F2" opacity="0.1" />
      <circle cx={cx} cy={cy} r={r} fill="#E4EBF7" mask={`url(#${mask})`} />
    </g>
  );
}

export function WeatherIcon({ code, night = false, still = false, className }: { code: number; night?: boolean; still?: boolean; className?: string }) {
  const mask = `wx-moon-${useId().replace(/:/g, '')}`;
  const kind = weatherKind(code);
  const a = (cls: string) => (still ? undefined : cls);
  const cloudFill = kind === 'storm' ? '#8E9AB3' : '#DCE2EC';
  const precipitation = kind === 'rain' || kind === 'storm' || kind === 'snow';

  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" aria-hidden>
      {kind === 'clear' && (night ? <MoonGlyph cx={32} cy={32} r={13} mask={mask} /> : <SunGlyph cx={32} cy={32} r={11} still={still} />)}

      {kind === 'partly' && (night ? <MoonGlyph cx={24} cy={22} r={10} mask={mask} /> : <SunGlyph cx={24} cy={22} r={8.5} still={still} />)}

      {kind === 'cloudy' && <path className={a('wx-cloud-back')} d={CLOUD_SMALL} fill="#AEB8CA" opacity="0.75" />}

      {kind !== 'clear' && (
        <g className={a('wx-cloud')}>
          <path d={CLOUD} fill={cloudFill} transform={precipitation ? 'translate(0 -6)' : undefined} />
          <path d={CLOUD} fill="#fff" opacity="0.35" transform={`${precipitation ? 'translate(0 -6) ' : ''}translate(32 39) scale(0.92) translate(-32 -39)`} />
        </g>
      )}

      {(kind === 'rain' || kind === 'storm') &&
        [20, 31, 42].map((x, i) => (
          <line
            key={x}
            className={a('wx-drop')}
            style={still ? undefined : { animationDelay: `${i * 0.42}s` }}
            x1={x}
            y1={49}
            x2={x - 2}
            y2={55}
            stroke="#9DC1F2"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
        ))}

      {kind === 'snow' &&
        [20, 32, 44].map((x, i) => (
          <circle key={x} className={a('wx-flake')} style={still ? undefined : { animationDelay: `${i * 1.1}s` }} cx={x} cy={52} r="2.2" fill="#F1F4F9" />
        ))}

      {kind === 'storm' && <path className={a('wx-bolt')} d="M34 42 27 53h6l-3 9 9-13h-6l3-7Z" fill="#FFD873" />}

      {kind === 'fog' &&
        [52, 57].map((y, i) => (
          <line
            key={y}
            className={a('wx-fog')}
            style={still ? undefined : { animationDelay: `${i * -2}s` }}
            x1={14 + i * 6}
            x2={50 - i * 4}
            y1={y}
            y2={y}
            stroke="#C3CBDA"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.8"
          />
        ))}
    </svg>
  );
}

/* ------------------------------------------------------------------ Kachel */

/** Wetter am Standort: große Temperatur mit animiertem Icon, Tageswerte, Wind, 4-Tage-Vorschau mit Temperaturbalken */
export function WeatherTile({ language, apiBase, data }: { language: string | null; apiBase?: string; data?: ReturnType<typeof useWeather> }) {
  const own = useWeather(apiBase, !data);
  const st = data ?? own;
  const w = st.weather;
  const { isDay } = useDaylight(st.coords);
  const grace = useGrace(20_000);

  // Vorschau-Zeilen an die Kachelhöhe anpassen: lieber eine Zeile weniger als eine abgeschnittene
  const tileRef = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState(4);
  useLayoutEffect(() => {
    const el = tileRef.current;
    if (el && el.scrollHeight > el.clientHeight + 1 && rows > 2) setRows(rows - 1);
  }, [rows, w]);
  if (!w) {
    return (
      <div className="ov-glass flex h-full flex-col gap-4 rounded-[28px] p-[6%]">
        <span className="eyebrow text-[0.7em]">{tr(language, { DE: 'Wetter am Standort', EN: 'Local weather', IT: 'Meteo locale', FR: 'Météo locale', SQ: 'Moti lokal' })}</span>
        {st.failed || grace ? (
          <Unavailable language={language} />
        ) : (
          <>
            <span className="ov-skeleton h-16 w-40" />
            <span className="ov-skeleton w-full flex-1" />
          </>
        )}
      </div>
    );
  }

  const night = w.current.is_day != null ? w.current.is_day === 0 : !isDay;
  const locale = language === 'EN' ? 'en-GB' : language === 'IT' ? 'it-IT' : language === 'FR' ? 'fr-FR' : language === 'SQ' ? 'sq-AL' : 'de-AT';
  const days = w.daily.time.slice(1, 5).map((t, i) => ({
    day: new Date(`${t}T12:00:00`).toLocaleDateString(locale, { weekday: 'short' }).replace('.', ''),
    max: w.daily.temperature_2m_max[i + 1],
    min: w.daily.temperature_2m_min[i + 1],
    code: w.daily.weather_code[i + 1],
  }));
  const todayMax = w.daily.temperature_2m_max[0];
  const todayMin = w.daily.temperature_2m_min[0];
  const lo = Math.min(...days.map((d) => d.min), todayMin);
  const hi = Math.max(...days.map((d) => d.max), todayMax);
  const span = Math.max(1, hi - lo);
  const glow = night ? 'rgb(157 193 242 / 0.16)' : weatherKind(w.current.weather_code) === 'clear' ? 'rgb(255 216 115 / 0.22)' : 'rgb(213 218 227 / 0.12)';

  return (
    <div ref={tileRef} className="ov-glass relative flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] px-[6%] pb-[7%] pt-[6%]">
      <div aria-hidden className="pointer-events-none absolute -right-[14%] -top-[18%] size-[64%] rounded-full" style={{ background: `radial-gradient(closest-side, ${glow}, transparent)` }} />
      <span className="eyebrow text-[0.7em]">{tr(language, { DE: 'Wetter am Standort', EN: 'Local weather', IT: 'Meteo locale', FR: 'Météo locale', SQ: 'Moti lokal' })}</span>

      <div className="relative mt-[0.5em] flex items-center justify-between gap-[0.5em]">
        <div className="min-w-0">
          <div className="num-display text-[3.8em] leading-none text-white">
            {Math.round(w.current.temperature_2m)}
            <span className="text-white/60">°</span>
          </div>
          <div className="mt-[0.35em] text-[1em] font-semibold text-white/85">{weatherLabel(w.current.weather_code, language, night)}</div>
        </div>
        <WeatherIcon code={w.current.weather_code} night={night} className="size-[5.6em] shrink-0" />
      </div>

      <div className="relative mt-[0.55em] flex flex-wrap items-center gap-x-[1em] gap-y-[0.3em] text-[0.95em] text-white/70">
        <span className="inline-flex items-center gap-[0.2em]">
          <ArrowUp className="size-[1em] text-[#ffd873]" strokeWidth={2.4} />
          <span className="tabular font-semibold text-white/85">{Math.round(todayMax)}°</span>
        </span>
        <span className="inline-flex items-center gap-[0.2em]">
          <ArrowDown className="size-[1em] text-[#9dc1f2]" strokeWidth={2.4} />
          <span className="tabular font-semibold text-white/85">{Math.round(todayMin)}°</span>
        </span>
        <span className="inline-flex items-center gap-[0.35em]">
          <Wind className="size-[1em]" /> <span className="tabular">{Math.round(w.current.wind_speed_10m)} km/h</span>
        </span>
      </div>

      <div className="mt-auto flex flex-col gap-[0.5em] border-t border-white/10 pt-[0.8em]">
        {days.slice(0, rows).map((d, i) => (
          <div key={d.day + i} className="grid grid-cols-[2.6em_1.6em_2em_1fr_2em] items-center gap-[0.6em] text-[0.95em]">
            <span className="font-semibold capitalize text-white/75">{d.day}</span>
            <WeatherIcon code={d.code} still className="size-[1.6em]" />
            <span className="tabular text-right text-white/65">{Math.round(d.min)}°</span>
            <span className="relative h-[0.38em] rounded-full bg-white/10">
              <span
                className="absolute inset-y-0 rounded-full bg-[linear-gradient(90deg,#5b94e0,#8cba58,#ffd873)]"
                style={{ left: `${((d.min - lo) / span) * 100}%`, right: `${100 - ((d.max - lo) / span) * 100}%` }}
              />
            </span>
            <span className="tabular font-semibold text-white">{Math.round(d.max)}°</span>
          </div>
        ))}
      </div>
    </div>
  );
}
