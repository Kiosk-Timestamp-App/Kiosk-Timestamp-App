import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { apiBaseUrl } from '../api/apiBaseUrl';
import { ReplayContext, useNow, useScreenActive } from '../design/hooks';
import { useSystemSpecs } from '../hooks/useSystemSpecs';
import { Card, Eyebrow, Label, Num, SkeletonBlock, Unavailable } from '../components/Insights/common';
import { PV_MODEL, usePrices, usePvForecast, type PriceSlot, type PvData } from '../components/Insights/data';
import {
  CHEAP_WINDOW_H,
  GOLDEN_PV_SHARE,
  TONE,
  bestWindow,
  dayStats,
  goldenHours,
  pvDay,
  shiftSaving,
  sliceDay,
  verdictOf,
  type PvDay,
  type Range,
} from '../components/Insights/derive';
import { ForecastChart } from '../components/Insights/ForecastChart';
import { PriceHero } from '../components/Insights/PriceHero';
import { GoldenCard, NotesCard, NowBanner, SavingCard, TomorrowCard, type GoldenPlan, type NowAdvice } from '../components/Insights/Cards';
import { useSize } from '../components/Insights/hooks';
import { I18nContext, makeI18n, useI18n } from '../components/Insights/i18n';
import { HOUR, hourStart, viennaMidnight } from '../components/Insights/time';

interface EnergyInsightsProps {
  /** Sprachcode aus dem Backend (DE, EN, IT, FR, SQ); Standard DE */
  language: string | null;
  /** API-Basis einer anderen Anlage; Standard = eigene Anlage */
  apiBase?: string;
}

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null);
/** Lokale Keyframes dieses Bildschirms (index.css bleibt unverändert) */
const INSIGHTS_CSS =
  '@keyframes ov-ins-grow-x{from{transform:scaleX(0)}}' +
  '@keyframes ov-ins-settle{from{opacity:0;transform:translate3d(0,0.12em,0)}to{opacity:1;transform:none}}' +
  '.ov-ins-settle{animation:ov-ins-settle 900ms cubic-bezier(0.16,1,0.3,1) both}' +
  '.ov-ins-root .ov-unit{color:rgb(255 255 255 / 0.68)}' +
  '@keyframes ov-ins-float{0%,100%{transform:translate3d(0,0,0)}50%{transform:translate3d(0,-0.35em,0)}}' +
  '.ov-ins-float{animation:ov-ins-float 7s ease-in-out infinite}' +
  '@media (prefers-reduced-motion: reduce){.ov-ins-float{animation:none}}';
const rd = (ms: number) => ({ '--rd': `${ms}ms` }) as CSSProperties;

function Kpi({ label, value, sub, accent, failed }: { label: string; value: number | null; sub?: string; accent?: string; failed?: boolean }) {
  const { nf } = useI18n();
  return (
    <div className="min-w-0 text-right">
      <Label className="text-white/70">{label}</Label>
      <div className="flex items-baseline justify-end whitespace-nowrap">
        <span className="num-display text-[2.3em] leading-none">
          {value == null ? (
            failed ? (
              '–'
            ) : (
              <SkeletonBlock className="inline-block h-[0.9em] w-[2.4em]" />
            )
          ) : (
            <Num text={`≈ ${nf(value, 0)}`} delayMs={200} className={accent ?? 'text-white'} />
          )}
        </span>
        <span className="ov-unit text-[0.95em]">kWh</span>
      </div>
      {sub && <div className="whitespace-nowrap text-[0.95em] text-white/70">{sub}</div>}
    </div>
  );
}

function ForecastCard({
  pvData,
  today,
  tomorrow,
  remaining,
  prices,
  golden,
  now,
  kwp,
  epoch,
}: {
  pvData: PvData;
  today: PvDay | null;
  tomorrow: PvDay | null;
  remaining: number | null;
  prices: PriceSlot[];
  golden: Range[];
  now: number;
  kwp: number | null;
  epoch: number;
}) {
  const { t, nf } = useI18n();
  const failed = pvData.settled && !pvData.slots.length;
  const todaySub =
    remaining != null && today && remaining < today.kwh - 0.5 ? (remaining < 0.5 ? t('sunDone') : t('remaining', { k: Math.round(remaining) })) : t('wholeDay');
  return (
    <Card className="gap-[0.6em] !rounded-[1.9em]" label={t('forecastEyebrow')}>
      <div className="flex items-start justify-between gap-[1em]">
        <div className="min-w-0">
          <Eyebrow>{t('forecastEyebrow')}</Eyebrow>
          <h2 className="mt-[0.2em] text-[2.1em] font-extrabold leading-tight text-white" style={{ fontFamily: 'var(--font-display)' }}>
            {t('sun')} <span className="text-white/40">&</span> <span className="text-gradient-sun">{t('price')}</span>
          </h2>

        </div>
        <div className="flex shrink-0 gap-[1.6em]">
          <Kpi label={t('today')} value={today?.kwh ?? null} sub={todaySub} accent="text-gradient-sun" failed={failed} />
          <Kpi label={t('tomorrow')} value={tomorrow?.kwh ?? null} sub={t('wholeDay')} failed={failed} />
        </div>
      </div>

      {failed ? (
        <Unavailable>{t('pvDown')}</Unavailable>
      ) : !kwp || !pvData.slots.length ? (
        <SkeletonBlock className="w-full flex-1 !rounded-[1em]" />
      ) : (
        <ForecastChart pv={pvData.slots} prices={prices} golden={golden} sun={pvData.sun} now={now} kwp={kwp} epoch={epoch} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-x-[1.2em] gap-y-[0.3em] text-[1em] text-white/70">
        <div className="flex flex-wrap items-center gap-x-[1.1em] gap-y-[0.2em]">
          <span className="inline-flex items-center gap-[0.4em]">
            <span className="h-[0.75em] w-[1.3em] rounded-[0.2em] bg-[linear-gradient(180deg,#FFD873,#8CBA58)]" />
            {t('lgPv')}
          </span>
          {prices.length > 0 && (
            <span className="inline-flex items-center gap-[0.4em]">
              <span className="h-[0.75em] w-[1.3em] rounded-[0.2em] border-t-2 border-[#FFD873] bg-[#FFD873]/25" />
              {t('lgGolden')}
            </span>
          )}
          {prices.length > 0 && (
          <span className="inline-flex items-center gap-[0.4em]">
            <span className="flex h-[0.75em] w-[1.3em] overflow-hidden rounded-[0.2em]">
              <span className="flex-1" style={{ background: TONE.low.bar }} />
              <span className="flex-1" style={{ background: TONE.mid.bar }} />
              <span className="flex-1" style={{ background: TONE.high.bar }} />
            </span>
            {t('lgPrice')}
          </span>
          )}
        </div>
        {/* Sichtbar: Prognose gilt für die angenommene Ausrichtung (Backend liefert keine Neigung/Ausrichtung) */}
        <span className="whitespace-nowrap font-semibold text-[#FFD873]">{t('orient', { tilt: PV_MODEL.tilt, kwp: kwp ? `${nf(kwp)}\u00A0kWp` : '–' })}</span>
      </div>
    </Card>
  );
}

/**
 * Bildschirm „Energie heute & Prognose“: Börsenstrompreis jetzt, regelbasierte Jetzt-Empfehlung,
 * PV-Prognose der eigenen Anlage, Goldene Stunden, Rechenbeispiel Lastverschiebung, Ausblick auf morgen.
 * Hochformat (auch 4K): Hero · Jetzt-Empfehlung · Prognose · 2×2-Kacheln.
 * Querformat: links Hero + Empfehlung, rechts Prognose, unten vier Kacheln.
 * Alle Maße in em auf Basis von vmin → identisches Bild auf Full HD und 4K.
 */
export default function EnergyInsights({ language, apiBase }: EnergyInsightsProps) {
  const base = apiBase ?? apiBaseUrl;
  const i18n = useMemo(() => makeI18n(language), [language]);
  const { systemSpecs } = useSystemSpecs(apiBase ? { ipAdress: apiBase } : undefined);
  const kwp = num(systemSpecs?.modulleistung);
  const priceData = usePrices(base);
  const pvData = usePvForecast(kwp, base);
  const now = useNow(60_000).getTime();

  const rootRef = useRef<HTMLDivElement>(null);
  const active = useScreenActive(rootRef);
  const { w, h } = useSize(rootRef);
  const wide = w > h * 1.15;

  // Wiedergabe-Epoche: bei jedem erneuten Eintritt zählen Zahlen neu, Diagramme zeichnen sich neu
  const [epoch, setEpoch] = useState(0);
  const wasActive = useRef(active);
  useEffect(() => {
    if (active && !wasActive.current) setEpoch((e) => e + 1);
    wasActive.current = active;
  }, [active]);

  const hourKey = hourStart(now);
  const d = useMemo(() => {
    const t = hourKey;
    const pricesToday = sliceDay(priceData.slots, t, 0);
    const pricesTomorrow = sliceDay(priceData.slots, t, 1);
    const pvToday = sliceDay(pvData.slots, t, 0);
    const pvTomorrow = sliceDay(pvData.slots, t, 1);
    const stats = dayStats(pricesToday);
    const statsTomorrow = dayStats(pricesTomorrow);
    const current = pricesToday.find((p) => p.start === t) ?? null;
    // „Günstig“ nur, wenn das Fenster unter dem Mittel seines Tages liegt
    const isLow = (win: { start: number; avg: number }) => {
      const ref = win.start >= viennaMidnight(t, 1) ? statsTomorrow : stats;
      return !!ref && win.avg < ref.avg;
    };
    const verdict = current && stats ? verdictOf(current.ct, stats) : null;
    const goldenToday = goldenHours(pvToday, pricesToday);
    const goldenTomorrow = goldenHours(pvTomorrow, pricesTomorrow);
    const pvT = pvToday.length ? pvDay(pvToday) : null;
    const pvM = pvTomorrow.length ? pvDay(pvTomorrow) : null;

    // Goldene-Stunden-Karte
    let plan: GoldenPlan | null = null;
    if (pricesToday.length && pvToday.length) {
      const upcoming = goldenToday.filter((r) => r.end > t);
      if (upcoming.length) {
        // Läuft sie bereits, bleibt die volle Spanne stehen (wie im Diagramm) – dazu „läuft seit …“
        plan = { kind: 'golden', day: 'heute', ranges: upcoming, active: upcoming[0].start <= t };
      } else if (goldenTomorrow.length) plan = { kind: 'golden', day: 'morgen', ranges: goldenTomorrow, active: false };
      else {
        const sunToday = pvT?.strong.find((r) => r.end > t);
        const sunTomorrow = pvM?.strong[0];
        const sun = sunToday ? { ...sunToday, day: 'heute' as const } : sunTomorrow ? { ...sunTomorrow, day: 'morgen' as const } : null;
        const ahead = priceData.slots.filter((p) => p.start >= t);
        const cheapW = bestWindow(ahead, CHEAP_WINDOW_H, 'min');
        plan = { kind: 'split', sun, cheap: cheapW, cheapIsLow: !!cheapW && isLow(cheapW), tomorrowPrices: pricesTomorrow.length > 0 };
      }
    }

    // Jetzt-Empfehlung (Regelkette: Goldene Stunde → viel Sonne → Preisdrittel)
    const pvNow = pvToday.find((s) => s.start === t);
    const strongSun = !!(pvT?.peak && pvNow && pvNow.kw >= GOLDEN_PV_SHARE * pvT.peak.kw && pvNow.kw > 0.05);
    const inGolden = goldenToday.some((r) => r.start <= t && t < r.end);
    const kind: NowAdvice['kind'] | null = inGolden ? 'golden' : strongSun ? 'sun' : verdict;
    const later = priceData.slots.filter((p) => p.start > t);
    const nextCheapRaw = bestWindow(later, CHEAP_WINDOW_H, 'min');
    const advice: NowAdvice | null = kind
      ? {
          kind,
          hour: t,
          nextCheap: nextCheapRaw && current && nextCheapRaw.avg < current.ct ? nextCheapRaw : null,
          nextCheapIsLow: !!nextCheapRaw && isLow(nextCheapRaw),
          nextGolden: [...goldenToday, ...goldenTomorrow].find((r) => r.start > t) ?? null,
        }
      : null;

    return {
      pricesToday,
      pricesTomorrow,
      stats,
      statsTomorrow,
      current,
      verdict,
      // Preis-Karte: nie ganztags ein vergangenes Fenster titeln – das verbleibende günstigste zeigen
      ...(() => {
        const dayCheap = bestWindow(pricesToday, CHEAP_WINDOW_H, 'min');
        const rest = bestWindow(pricesToday.filter((p) => p.start >= t), CHEAP_WINDOW_H, 'min');
        const same = !!dayCheap && !!rest && dayCheap.start === rest.start;
        return {
          cheap: rest,
          cheapKey: (same ? 'cheapest3' : 'nextCheap3') as 'cheapest3' | 'nextCheap3',
          pastCheap: dayCheap && !same && dayCheap.start < t ? dayCheap : null,
        };
      })(),
      cheapTomorrow: bestWindow(pricesTomorrow, CHEAP_WINDOW_H, 'min'),
      golden: [...goldenToday, ...goldenTomorrow],
      pvT,
      pvM,
      pvToday,
      plan,
      advice,
      // Laufende Stunde zählt nicht mehr – nur volle kommende Stunden
      saving: shiftSaving(priceData.slots.filter((p) => p.start > t)),
    };
  }, [priceData.slots, pvData.slots, hourKey]);

  const tomorrowStart = viennaMidnight(now, 1);
  const sunTomorrow = pvData.sun.find((s) => s.day >= tomorrowStart - HOUR && s.day < tomorrowStart + HOUR) ?? null;
  // Skelett nur bis zum ersten Ladeversuch; danach Daten oder ein klarer Hinweis
  const pricesLoading = !priceData.settled && !d.pricesToday.length;
  const pvLoading = !pvData.settled && !d.pvT;
  const pricesDown = priceData.settled && !d.pricesToday.length;
  const showBanner = !!d.advice || pricesLoading;
  // Noch erwarteter Ertrag heute: laufende Stunde nur anteilig
  const remaining = d.pvToday.length
    ? d.pvToday.reduce((a, s) => {
        if (s.start + HOUR <= now) return a;
        if (s.start <= now) return a + s.kw * ((s.start + HOUR - now) / HOUR);
        return a + s.kw;
      }, 0)
    : null;

  // Hochformat: Hero · Empfehlung · Prognose · Goldene Stunden | Beispiel · Morgen (breit) · Annahmen (Leiste)
  // Querformat: Hero | Prognose · Empfehlung (volle Breite) · vier Kacheln
  const grid: CSSProperties = wide
    ? {
        gridTemplateAreas: showBanner ? '"hero hero chart chart" "now now now now" "gold save tom notes"' : '"hero hero chart chart" "gold save tom notes"',
        gridTemplateColumns: '1.05fr 1fr 1fr 0.9fr',
        gridTemplateRows: showBanner ? '1.6fr auto 1.05fr' : '1.6fr 1fr',
      }
    : {
        gridTemplateAreas: `"hero hero" ${showBanner ? '"now now" ' : ''}"chart chart" "gold save" "tom tom" "notes notes"`,
        gridTemplateColumns: '1.08fr 1fr',
        gridTemplateRows: `${pricesDown ? 16 : 34}fr ${showBanner ? 'auto ' : ''}32fr 23fr 13fr auto`,
      };

  return (
    <I18nContext.Provider value={i18n}>
      <ReplayContext.Provider value={epoch}>
        <style>{INSIGHTS_CSS}</style>
        <div ref={rootRef} lang={i18n.locale} className={`ov-ins-root relative h-full text-white ${wide ? 'text-[1.45vmin]' : 'text-[1.52vmin]'}`}>
          <div className="grid h-full gap-[1.1vmin]" style={grid}>
            <div className="flex min-h-0 min-w-0 [&>*]:flex-1" style={{ gridArea: 'hero', ...rd(0) }}>
              <PriceHero data={priceData} today={d.pricesToday} stats={d.stats} current={d.current} verdict={d.verdict} cheap={d.cheap} pastCheap={d.pastCheap} cheapKey={d.cheapKey} now={now} epoch={epoch} />
            </div>
            {showBanner && (
              <div className="flex min-h-0 min-w-0 [&>*]:flex-1" style={{ gridArea: 'now', ...rd(80) }}>
                <NowBanner advice={d.advice} now={now} compact={wide} />
              </div>
            )}
            <div className="flex min-h-0 min-w-0 [&>*]:flex-1" style={{ gridArea: 'chart', ...rd(140) }}>
              <ForecastCard
                pvData={pvData}
                today={d.pvT}
                tomorrow={d.pvM}
                remaining={remaining}
                prices={[...d.pricesToday, ...d.pricesTomorrow]}
                golden={d.golden}
                now={now}
                kwp={kwp}
                epoch={epoch}
              />
            </div>
            <div className="flex min-h-0 min-w-0 [&>*]:flex-1" style={{ gridArea: 'gold', ...rd(220) }}>
              <GoldenCard plan={d.plan} loading={pricesLoading || pvLoading} now={now} narrow={wide} />
            </div>
            <div className="flex min-h-0 min-w-0 [&>*]:flex-1" style={{ gridArea: 'save', ...rd(280) }}>
              <SavingCard saving={d.saving} loading={pricesLoading} pricesDown={pricesDown} scopeTomorrow={d.pricesTomorrow.length > 0} now={now} narrow={wide} />
            </div>
            <div className="flex min-h-0 min-w-0 [&>*]:flex-1" style={{ gridArea: 'tom', ...rd(340) }}>
              <TomorrowCard wide={!wide} dayStart={tomorrowStart} prices={d.pricesTomorrow} stats={d.statsTomorrow} cheap={d.cheapTomorrow} pv={d.pvM} sun={sunTomorrow} epoch={epoch} />
            </div>
            <div className="flex min-h-0 min-w-0 [&>*]:flex-1" style={{ gridArea: 'notes', ...rd(400) }}>
              <NotesCard strip={!wide} kwp={kwp} prices={priceData} pvTs={pvData.fetchedAt} pvState={pvData.state} />
            </div>
          </div>
        </div>
      </ReplayContext.Provider>
    </I18nContext.Provider>
  );
}
