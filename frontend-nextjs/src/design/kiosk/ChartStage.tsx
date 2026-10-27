import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ReferenceDot, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { tr, useGrace, useReplay } from '../hooks';
import { Unavailable } from '../primitives';
import { useMonth, useWeek, useYesterday } from './data';
import { useLiveSamples } from './liveLog';

const SLIDE_MS = 20_000;
const axisTick = { fill: 'rgb(255 255 255 / 0.7)', fontSize: '0.9em', fontWeight: 500 };
const nf = (d = 0) => new Intl.NumberFormat('de-AT', { minimumFractionDigits: d, maximumFractionDigits: d });

/** „Schöne“ Achsenteilung (1/2/2,5/5 × 10ⁿ), ca. 4 Abschnitte, 0 bis ≥ Maximum */
function niceTicks(max: number, count = 4) {
  const m = Math.max(max, 1e-6);
  const raw = m / count;
  const p10 = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((k) => k * p10).find((st) => st >= raw) ?? 10 * p10;
  const n = Math.ceil(m / step);
  return Array.from({ length: n + 1 }, (_, i) => Math.round(i * step * 1000) / 1000);
}
const hideZero = (v: number) => (v === 0 ? '' : nf(0).format(v));
/** Diagrammränder in px, aus der gemessenen Schriftgröße – skaliert sauber von Full-HD bis 4K */
const marginOf = (fs: number) => ({ top: Math.round(fs * 1.9), right: Math.round(fs * 0.75), left: -Math.round(fs * 0.5), bottom: 0 });

interface Slide {
  key: string;
  tab: string;
  eyebrow: string;
  title: string;
  unit: string;
  kpi?: { value: string; unit: string; label: string };
  legend: { color: string; label: string; dashed?: boolean }[];
  chart: ReactNode;
}

/* ------------------------------------------------------------------ Annotationen (statt Tooltips) */

/** Pillen-Beschriftung im Diagramm. `fs` = Schriftgröße in px (aus der Bühne gemessen). */
function Pill({ x, y, text, color, fs, anchor = 'middle' }: { x: number; y: number; text: string; color: string; fs: number; anchor?: 'start' | 'middle' | 'end' }) {
  const size = Math.max(fs * 0.9, 14);
  const w = text.length * size * 0.6 + size * 1.3;
  const h = size * 1.75;
  const left = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
  return (
    <g pointerEvents="none">
      <rect x={left} y={y - h / 2} width={w} height={h} rx={h / 2} fill="#0a1c3b" stroke={color} strokeOpacity={0.55} />
      <text
        x={left + w / 2}
        y={y}
        dy="0.36em"
        textAnchor="middle"
        fill={color}
        fontSize={size}
        fontWeight={800}
        style={{ fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums' }}
      >
        {text}
      </text>
    </g>
  );
}

type VB = { x?: number; y?: number; width?: number; height?: number };

/** Rand rechts für Beschriftungen am Ende der Durchschnittslinie (außerhalb der Balken) */
const marginWithLabel = (fs: number) => ({ ...marginOf(fs), right: Math.round(fs * 4.4) });

/** Beschriftung rechts neben dem Ende einer waagrechten Bezugslinie (z. B. Durchschnitt) */
const lineLabel = (text: string, color: string, fs: number) =>
  function LineLabel({ viewBox }: { viewBox?: VB }) {
    if (!viewBox || viewBox.x == null || viewBox.y == null) return <g />;
    return <Pill x={viewBox.x + (viewBox.width ?? 0) + fs * 0.4} y={viewBox.y} text={text} color={color} fs={fs} anchor="start" />;
  };

/** Beschriftung über einem Punkt */
const dotLabel = (text: string, color: string, fs: number) =>
  function DotLabel({ viewBox }: { viewBox?: VB }) {
    if (!viewBox || viewBox.x == null || viewBox.y == null) return <g />;
    const cx = viewBox.x + (viewBox.width ?? 0) / 2;
    return <Pill x={cx} y={viewBox.y - fs * 0.85} text={text} color={color} fs={fs} />;
  };

/** Beschriftung über ausgewählten Balken (nur Indizes in `marks`) */
const barLabel = (marks: Record<number, { text: string; color: string }>, fs: number) =>
  function BarLabel(props: { x?: number | string; y?: number | string; width?: number | string; index?: number }) {
    const m = props.index != null ? marks[props.index] : undefined;
    if (!m) return <g />;
    const x = Number(props.x) + Number(props.width) / 2;
    return <Pill x={x} y={Number(props.y) - fs * 0.95} text={m.text} color={m.color} fs={fs} />;
  };

function Legend({ items }: { items: Slide['legend'] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-[1.3em] gap-y-[0.4em]">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-[0.5em] text-[0.85em] font-medium text-white/70">
          {it.dashed ? (
            <span className="w-[1.2em] border-t-2 border-dashed" style={{ borderColor: it.color }} />
          ) : (
            <span className="size-[0.7em] rounded-full" style={{ background: it.color, boxShadow: `0 0 10px ${it.color}` }} />
          )}
          {it.label}
        </span>
      ))}
    </div>
  );
}

/** Diagramm-Bühne: wechselt alle 20 s zwischen Tagesverlauf, Woche und Monat */
export function ChartStage({ language, apiBase, enabled = true }: { language: string | null; showPrice?: boolean; apiBase?: string; enabled?: boolean }) {
  const day = useYesterday(apiBase, enabled);
  const today = useLiveSamples(apiBase);
  const week = useWeek(apiBase, enabled);
  const month = useMonth(apiBase, enabled);
  const epoch = useReplay();
  const grace = useGrace(20_000);
  const [pos, setPos] = useState({ index: 0, prev: -1, cycle: 0, prevCycle: -1 });
  const rootRef = useRef<HTMLElement>(null);
  const [fs, setFs] = useState(16);

  // Schriftgröße der Bühne für SVG-Beschriftungen messen
  useEffect(() => {
    const read = () => rootRef.current && setFs(parseFloat(getComputedStyle(rootRef.current).fontSize) || 16);
    read();
    window.addEventListener('resize', read);
    return () => window.removeEventListener('resize', read);
  }, []);

  // Bei jedem Bildschirm-Eintritt mit der ersten Folie beginnen
  useEffect(() => {
    setPos((p) => ({ index: 0, prev: -1, cycle: p.cycle + 1, prevCycle: -1 }));
  }, [epoch]);

  const slides = useMemo<Slide[]>(() => {
    const out: Slide[] = [];
    const L = (t: Parameters<typeof tr>[1]) => tr(language, t);
    const avgLabel = L({ DE: 'Ø', EN: 'Avg', IT: 'Media', FR: 'Moy.', SQ: 'Mes.' });

    if (day && day.length) {
      // Gestern (Backend, 15-min) + heute (auf dem Kiosk live gemessen, auf 15-min-Raster gemittelt)
      const buckets = new Map<number, { sum: number; n: number }>();
      for (const [minute, solar] of today) {
        const slot = Math.floor(minute / 15);
        const b = buckets.get(slot) ?? { sum: 0, n: 0 };
        b.sum += solar;
        b.n += 1;
        buckets.set(slot, b);
      }
      const data = day.map((p) => {
        const t = p.interval_start.slice(11, 16);
        const slot = Math.floor((Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))) / 15);
        const b = buckets.get(slot);
        return {
          t,
          solar: p.total_solar_energy,
          use: p.total_spend_energy,
          grid: p.total_grid_imported,
          today: b ? Math.round((b.sum / b.n) * 100) / 100 : null,
        };
      });
      const hasToday = buckets.size >= 2;
      // Letzter Punkt = letzter Live-Messwert (nicht der Mittelwert des angebrochenen 15-min-Fensters),
      // damit „jetzt“ im Diagramm denselben Wert zeigt wie der Hero
      const latest = today[today.length - 1];
      if (latest) {
        const slot = Math.floor(latest[0] / 15);
        const point = data.find((d) => Math.floor((Number(d.t.slice(0, 2)) * 60 + Number(d.t.slice(3, 5))) / 15) === slot);
        if (point) point.today = latest[1];
      }
      const peakIdx = data.reduce((best, d, i) => (d.solar > data[best].solar ? i : best), 0);
      const peak = data[peakIdx];
      const lastToday = hasToday ? [...data].reverse().find((d) => d.today != null) : undefined;
      const todayPeak = hasToday ? Math.max(...today.map((s) => s[1])) : 0;
      const d0 = new Date(day[0].interval_start);
      const max = Math.max(...data.map((d) => Math.max(d.solar, d.use, hasToday ? (d.today ?? 0) : d.grid)));
      const dayTicks = niceTicks(max * 1.15);
      const yesterdayLabel = L({ DE: 'Gestern', EN: 'Yesterday', IT: 'Ieri', FR: 'Hier', SQ: 'Dje' });
      out.push({
        key: 'day',
        tab: L({ DE: 'Tag', EN: 'Day', IT: 'Giorno', FR: 'Jour', SQ: 'Dita' }),
        eyebrow: hasToday
          ? L({ DE: 'Heute live gemessen · Vergleich gestern', EN: 'Measured live today · vs. yesterday', IT: 'Misurato oggi dal vivo · confronto ieri', FR: "Mesuré en direct aujourd'hui · vs hier", SQ: 'Matur live sot · krahasim me dje' })
          : yesterdayLabel + ' · ' + d0.toLocaleDateString('de-AT', { weekday: 'long', day: '2-digit', month: '2-digit' }),
        title: hasToday
          ? L({ DE: 'Heute vs. gestern', EN: 'Today vs. yesterday', IT: 'Oggi vs. ieri', FR: "Aujourd'hui vs hier", SQ: 'Sot vs. dje' })
          : L({ DE: 'Tagesverlauf', EN: 'Day profile', IT: 'Andamento giornaliero', FR: 'Profil journalier', SQ: 'Rrjedha e ditës' }),
        unit: 'kW',
        kpi: hasToday
          ? { value: nf(1).format(todayPeak), unit: 'kW', label: L({ DE: 'Spitze heute', EN: 'Peak today', IT: 'Picco oggi', FR: "Pic aujourd'hui", SQ: 'Kulmi sot' }) }
          : { value: nf(1).format(peak.solar), unit: 'kW', label: L({ DE: 'Spitze PV', EN: 'PV peak', IT: 'Picco FV', FR: 'Pic PV', SQ: 'Kulmi PV' }) },
        legend: hasToday
          ? [
              { color: '#ffd873', label: L({ DE: 'PV heute (live gemessen)', EN: 'PV today (measured live)', IT: 'FV oggi (misurato)', FR: "PV aujourd'hui (mesuré)", SQ: 'PV sot (matur)' }) },
              { color: '#ffd873', label: L({ DE: 'PV gestern', EN: 'PV yesterday', IT: 'FV ieri', FR: 'PV hier', SQ: 'PV dje' }), dashed: true },
              { color: '#5b94e0', label: L({ DE: 'Bedarf gestern', EN: 'Demand yesterday', IT: 'Fabbisogno ieri', FR: 'Besoin hier', SQ: 'Nevoja dje' }) },
            ]
          : [
              { color: '#ffd873', label: L({ DE: 'PV-Produktion', EN: 'PV production', IT: 'Produzione FV', FR: 'Production PV', SQ: 'Prodhimi PV' }) },
              { color: '#5b94e0', label: L({ DE: 'Gesamtbedarf', EN: 'Total demand', IT: 'Fabbisogno', FR: 'Besoin total', SQ: 'Nevoja totale' }) },
              { color: '#ff9c92', label: L({ DE: 'Netzbezug', EN: 'Grid import', IT: 'Prelievo rete', FR: 'Soutirage réseau', SQ: 'Import nga rrjeti' }) },
            ],
        chart: (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={marginOf(fs)}>
              <defs>
                <linearGradient id="g-solar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffd873" stopOpacity={hasToday ? 0.12 : 0.45} />
                  <stop offset="100%" stopColor="#ffd873" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="g-use" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5b94e0" stopOpacity={hasToday ? 0.12 : 0.35} />
                  <stop offset="100%" stopColor="#5b94e0" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="g-grid" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff9c92" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#ff9c92" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="g-today" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffd873" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#ffd873" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="4 6" />
              <XAxis dataKey="t" tick={axisTick} tickLine={false} axisLine={false} interval={11} tickMargin={Math.round(fs * 0.45)} height={Math.round(fs * 2)} />
              <YAxis tick={axisTick} tickLine={false} axisLine={false} width={Math.round(fs * 2.75)} tickFormatter={hideZero} ticks={dayTicks} domain={[0, dayTicks[dayTicks.length - 1]]} interval={0} />
              <Area type="monotone" dataKey="use" stroke="#5b94e0" strokeWidth={hasToday ? 1.8 : 2.5} strokeOpacity={hasToday ? 0.7 : 1} fill="url(#g-use)" isAnimationActive={false} />
              <Area type="monotone" dataKey="solar" stroke="#ffd873" strokeWidth={hasToday ? 2 : 3} strokeOpacity={hasToday ? 0.6 : 1} strokeDasharray={hasToday ? '6 6' : undefined} fill="url(#g-solar)" isAnimationActive={false} />
              {hasToday ? (
                <Area type="monotone" dataKey="today" stroke="#ffd873" strokeWidth={3.5} fill="url(#g-today)" connectNulls isAnimationActive={false} />
              ) : (
                <Area type="monotone" dataKey="grid" stroke="#ff9c92" strokeWidth={2} fill="url(#g-grid)" isAnimationActive={false} />
              )}
              {hasToday && lastToday ? (
                <ReferenceDot
                  x={lastToday.t}
                  y={lastToday.today ?? 0}
                  r={6}
                  fill="#ffd873"
                  stroke="#0a1c3b"
                  strokeWidth={2.5}
                  label={dotLabel(`${L({ DE: 'jetzt', EN: 'now', IT: 'ora', FR: 'maint.', SQ: 'tani' })} ${nf(1).format(lastToday.today ?? 0)} kW`, '#ffd873', fs)}
                />
              ) : (
                <ReferenceDot x={peak.t} y={peak.solar} r={5} fill="#ffd873" stroke="#0a1c3b" strokeWidth={2} label={dotLabel(`${nf(1).format(peak.solar)} kW`, '#ffd873', fs)} />
              )}
            </AreaChart>
          </ResponsiveContainer>
        ),
      });
    }

    if (week && week.length) {
      const data = week.slice(-7).map((p) => ({
        t: new Date(p.day_date).toLocaleDateString('de-AT', { weekday: 'short' }).replace('.', ''),
        solar: p.total_solar_energy,
        use: p.total_spend_energy,
      }));
      const sum = data.reduce((a, b) => a + b.solar, 0);
      const avg = sum / data.length;
      const bestIdx = data.reduce((best, d, i) => (d.solar > data[best].solar ? i : best), 0);
      const wTicks = niceTicks(Math.max(...data.map((d) => Math.max(d.solar, d.use))) * 1.12);
      out.push({
        key: 'week',
        tab: L({ DE: 'Woche', EN: 'Week', IT: 'Settimana', FR: 'Semaine', SQ: 'Java' }),
        eyebrow: L({ DE: 'Letzte 7 Tage', EN: 'Last 7 days', IT: 'Ultimi 7 giorni', FR: '7 derniers jours', SQ: '7 ditët e fundit' }),
        title: L({ DE: 'Wochenbilanz', EN: 'Weekly balance', IT: 'Bilancio settimanale', FR: 'Bilan hebdomadaire', SQ: 'Bilanci javor' }),
        unit: 'kWh',
        kpi: { value: nf(0).format(sum), unit: 'kWh', label: L({ DE: 'Erzeugt', EN: 'Produced', IT: 'Prodotti', FR: 'Produits', SQ: 'Prodhuar' }) },
        legend: [
          { color: '#ffd873', label: L({ DE: 'PV-Produktion', EN: 'PV production', IT: 'Produzione FV', FR: 'Production PV', SQ: 'Prodhimi PV' }) },
          { color: '#5b94e0', label: L({ DE: 'Verbrauch', EN: 'Consumption', IT: 'Consumo', FR: 'Consommation', SQ: 'Konsumi' }) },
          { color: 'rgb(255 255 255 / 0.55)', label: L({ DE: 'Ø PV pro Tag', EN: 'Avg PV per day', IT: 'Media FV al giorno', FR: 'Moy. PV par jour', SQ: 'Mes. PV në ditë' }), dashed: true },
        ],
        chart: (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={marginWithLabel(fs)} barGap={6} barCategoryGap="22%">
              <defs>
                <linearGradient id="b-solar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffe08a" />
                  <stop offset="100%" stopColor="#b9800a" />
                </linearGradient>
                <linearGradient id="b-use" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#9dc1f2" />
                  <stop offset="100%" stopColor="#1f539a" />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="4 6" />
              <XAxis dataKey="t" tick={axisTick} tickLine={false} axisLine={false} tickMargin={Math.round(fs * 0.45)} height={Math.round(fs * 2)} />
              <YAxis tick={axisTick} tickLine={false} axisLine={false} width={Math.round(fs * 2.75)} tickFormatter={hideZero} ticks={wTicks} domain={[0, wTicks[wTicks.length - 1]]} interval={0} />
              <Bar dataKey="solar" fill="url(#b-solar)" radius={[10, 10, 4, 4]} label={barLabel({ [bestIdx]: { text: nf(0).format(data[bestIdx].solar), color: '#ffd873' } }, fs)} />
              <Bar dataKey="use" fill="url(#b-use)" radius={[10, 10, 4, 4]} />
              <ReferenceLine y={avg} stroke="rgb(255 255 255 / 0.4)" strokeDasharray="6 6" label={lineLabel(`${avgLabel} ${nf(0).format(avg)}`, 'rgb(255 255 255 / 0.85)', fs)} />
            </BarChart>
          </ResponsiveContainer>
        ),
      });
    }

    if (month && month.daily_data?.length) {
      const data = month.daily_data.map((p) => {
        const d = new Date(`${p.day_date.slice(0, 10)}T12:00:00`);
        return { t: `${d.getDate()}.${d.getMonth() + 1}.`, solar: p.total_solar_energy };
      });
      const mTicks = niceTicks(Math.max(...data.map((d) => d.solar)) * 1.15);
      const bestIdx = data.reduce((best, d, i) => (d.solar > data[best].solar ? i : best), 0);
      const avg = data.reduce((a, b) => a + b.solar, 0) / data.length;
      const unit = month.energy_unit || 'kWh';
      out.push({
        key: 'month',
        tab: L({ DE: 'Monat', EN: 'Month', IT: 'Mese', FR: 'Mois', SQ: 'Muaji' }),
        eyebrow: L({ DE: 'Letzte 31 Tage', EN: 'Last 31 days', IT: 'Ultimi 31 giorni', FR: '31 derniers jours', SQ: '31 ditët e fundit' }),
        title: L({ DE: 'Solarertrag', EN: 'Solar yield', IT: 'Resa solare', FR: 'Rendement solaire', SQ: 'Rendimenti diellor' }),
        unit: 'kWh',
        kpi: { value: nf(0).format(month.total_energy_produced), unit, label: L({ DE: 'Gesamt', EN: 'Total', IT: 'Totale', FR: 'Total', SQ: 'Gjithsej' }) },
        legend: [
          { color: '#e8b53a', label: L({ DE: 'Tagesertrag', EN: 'Daily yield', IT: 'Resa giornaliera', FR: 'Rendement du jour', SQ: 'Rendimenti ditor' }) },
          { color: '#fff1b8', label: L({ DE: 'Bester Tag', EN: 'Best day', IT: 'Giorno migliore', FR: 'Meilleur jour', SQ: 'Dita më e mirë' }) },
          { color: 'rgb(255 255 255 / 0.55)', label: L({ DE: 'Durchschnitt', EN: 'Average', IT: 'Media', FR: 'Moyenne', SQ: 'Mesatarja' }), dashed: true },
        ],
        chart: (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={marginWithLabel(fs)} barCategoryGap="18%">
              <defs>
                <linearGradient id="m-solar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f2c35a" />
                  <stop offset="100%" stopColor="#8a5f08" />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="4 6" />
              <XAxis dataKey="t" tick={axisTick} tickLine={false} axisLine={false} interval={Math.max(1, Math.ceil(data.length / 7) - 1)} tickMargin={Math.round(fs * 0.45)} height={Math.round(fs * 2)} />
              <YAxis tick={axisTick} tickLine={false} axisLine={false} width={Math.round(fs * 2.75)} tickFormatter={hideZero} ticks={mTicks} domain={[0, mTicks[mTicks.length - 1]]} interval={0} />
              <Bar dataKey="solar" radius={[8, 8, 3, 3]} label={barLabel({ [bestIdx]: { text: nf(0).format(data[bestIdx].solar), color: '#fff1b8' } }, fs)}>
                {data.map((_, i) => (
                  <Cell key={i} fill={i === bestIdx ? '#fff1b8' : 'url(#m-solar)'} />
                ))}
              </Bar>
              <ReferenceLine y={avg} stroke="rgb(255 255 255 / 0.45)" strokeDasharray="6 6" label={lineLabel(`${avgLabel} ${nf(0).format(avg)}`, 'rgb(255 255 255 / 0.85)', fs)} />
            </BarChart>
          </ResponsiveContainer>
        ),
      });
    }

    return out;
  }, [day, today, week, month, language, fs]);

  const count = slides.length;
  useEffect(() => {
    if (count < 2) return;
    const id = setInterval(() => setPos((p) => ({ index: (p.index + 1) % count, prev: p.index % count, cycle: p.cycle + 1, prevCycle: p.cycle })), SLIDE_MS);
    return () => clearInterval(id);
  }, [count, pos.cycle]);

  const active = count ? pos.index % count : 0;
  const stateOf = (i: number) => (i === active ? 'active' : (i - active + count) % count === 1 && count > 2 ? 'after' : 'before');

  return (
    <section ref={rootRef} className="ov-glass relative flex h-full min-h-0 flex-col overflow-hidden rounded-[32px] px-[4%] pb-[2.5%] pt-[3.5%]">
      {count === 0 ? (
        <div className="flex flex-1 flex-col gap-4">
          {grace ? (
            <Unavailable language={language} />
          ) : (
            <>
              <span className="ov-skeleton h-5 w-48" />
              <span className="ov-skeleton w-full flex-1" />
            </>
          )}
        </div>
      ) : (
        <div className="relative min-h-0 flex-1">
          {slides.map((s, i) => {
            const state = stateOf(i);
            const showChart = i === active || i === pos.prev;
            return (
              <div key={s.key} className="ov-slide absolute inset-0 flex flex-col" data-state={state} aria-hidden={state !== 'active'}>
                <div className="flex items-start justify-between gap-6">
                  <div className="ov-slide-title min-w-0">
                    <span className="eyebrow text-[0.8em]">{s.eyebrow}</span>
                    <h2 className="mt-[0.3em] text-[1.65em] leading-none text-white">{s.title}</h2>
                  </div>
                  {s.kpi && (
                    <div className="shrink-0 text-right">
                      <div className="text-[0.85em] font-semibold text-white/70">{s.kpi.label}</div>
                      <div className="mt-[0.2em] flex items-baseline justify-end">
                        <span className="num-display text-[1.85em] leading-none text-white">{s.kpi.value}</span>
                        <span className="ov-unit text-[0.95em]">{s.kpi.unit}</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-[1.1em]">
                  <Legend items={s.legend} />
                </div>
                <div className="relative mt-[0.8em] min-h-0 flex-1">
                  <span className="absolute left-0 top-0 text-[0.95em] font-semibold text-white/70">{s.unit}</span>
                  {/* Nur aktive (und gerade ausblendende) Folie rendert ihr Diagramm → zeichnet sich bei jedem Wechsel neu */}
                  {showChart && (
                    <div key={`${s.key}-${i === active ? pos.cycle : pos.prevCycle}-${epoch}`} className={`size-full ${i === active ? 'ov-chart-reveal' : ''}`}>
                      {s.chart}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Folien-Register mit Fortschritt */}
      {count > 1 && (
        <div className="mt-[0.9em] flex items-center justify-center gap-[0.5em]">
          {slides.map((s, i) => (
            <span
              key={s.key}
              className={`relative overflow-hidden rounded-full border px-[0.9em] py-[0.3em] text-[0.82em] font-bold uppercase tracking-[0.1em] transition-colors duration-700 ${
                i === active ? 'border-white/20 bg-white/[0.07] text-white' : 'border-transparent text-white/60'
              }`}
            >
              {s.tab}
              {i === active && (
                <span
                  key={`${s.key}-${pos.cycle}`}
                  className="absolute inset-x-[0.9em] bottom-[0.18em] h-[2px] origin-left rounded-full bg-[linear-gradient(90deg,#8cba58,#ffd873)]"
                  style={{ animation: `ov-progress ${SLIDE_MS}ms linear both` }}
                />
              )}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
