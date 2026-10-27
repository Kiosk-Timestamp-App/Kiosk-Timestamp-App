import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { Card, Eyebrow, Fine, Label, Num, SkeletonBlock, Stand, Unavailable } from './common';
import type { PriceData, PriceSlot } from './data';
import { TONE, type DayStats, type Verdict, type Window } from './derive';
import { useI18n } from './i18n';
import { PriceRibbon, ToneLegend } from './PriceRibbon';
import { HOUR } from './time';

const VERDICT_ICON = { low: ArrowDownRight, mid: Minus, high: ArrowUpRight } as const;
const VERDICT_KEY = { low: 'vLow', mid: 'vMid', high: 'vHigh' } as const;
/** Farbe der großen Zahl folgt der Einstufung (günstig = grün, mittel = weiß, teuer = rot) */
const HERO_CLASS: Record<Verdict, string> = { low: 'ov-text-brand', mid: 'text-white', high: 'text-[#FF9C92]' };

function MiniStat({ label, ct, at, tone, delayMs }: { label: string; ct: number; at?: string; tone?: string; delayMs: number }) {
  const { nf } = useI18n();
  return (
    <div className="ov-well flex min-w-0 items-center gap-[0.8em] rounded-[1em] border px-[1em] py-[0.38em]">
      <Label className="min-w-[7em] shrink-0 whitespace-nowrap text-white/70">{label}</Label>
      <span className="flex items-baseline whitespace-nowrap">
        <span className="num-display text-[1.65em] leading-none" style={{ color: tone ?? '#fff' }}>
          <Num text={nf(ct)} delayMs={delayMs} />
        </span>
        <span className="ov-unit text-[0.85em]">ct</span>
      </span>
      {at && <span className="ml-auto whitespace-nowrap pl-[0.4em] text-[1em] font-semibold text-white/75 tabular">{at}</span>}
    </div>
  );
}

/** Hero: Börsenstrompreis jetzt mit Einordnung, Tageswerten und 24-h-Preisband */
export function PriceHero({
  data,
  today,
  stats,
  current,
  verdict,
  cheap,
  pastCheap,
  cheapKey,
  now,
  epoch,
}: {
  data: PriceData;
  today: PriceSlot[];
  stats: DayStats | null;
  current: PriceSlot | null;
  verdict: Verdict | null;
  cheap: Window | null;
  pastCheap: Window | null;
  cheapKey: 'cheapest3' | 'nextCheap3';
  now: number;
  epoch: number;
}) {
  const { t, span, hour, nf } = useI18n();
  const VIcon = verdict ? VERDICT_ICON[verdict] : Minus;
  const tone = verdict ? TONE[verdict] : null;
  const source = data.source === 'Backend' ? t('viaServer') : data.source;
  // Abweichung zum Tagesmittel: bei kleinem/negativem Mittel in ct statt % (sonst absurde Prozentwerte)
  const deltaText = (() => {
    if (!current || !stats) return null;
    const diff = current.ct - stats.avg;
    if (Math.abs(diff) < 0.05) return null;
    const sign = diff < 0 ? '−' : '+';
    // ct statt %, wenn Prozent irreführend wären (kleines/negatives Mittel, negativer Preis, > 100 %)
    if (Math.abs(stats.avg) < 2 || current.ct < 0 || Math.abs(diff / stats.avg) > 1) return t('vsAvgCt', { p: `${sign}${nf(Math.abs(diff))}` });
    return t('vsAvg', { p: `${sign}${Math.round(Math.abs(diff / stats.avg) * 100)}` });
  })();
  // Erst nach dem ersten Ladeversuch entscheiden: ohne heutige Preise → klarer Hinweis statt Dauer-Skelett
  const noToday = data.settled && !today.length;

  return (
    <Card className="gap-[0.85em] !rounded-[1.9em]" label={t('spotPrice')}>
      <div className="flex items-center justify-between gap-[1em]">
        <Eyebrow>
          <span className="text-white/90">{t('spotPrice')}</span> · {t('austria')}
        </Eyebrow>
        {current && (
          <span className="glass-pill shrink-0 whitespace-nowrap rounded-full px-[0.9em] py-[0.35em] text-[1em] font-semibold text-white/90">
            {t('now')}, <span className="tabular">{span(current.start, current.start + HOUR)}</span>
          </span>
        )}
      </div>

      {noToday ? (
        <>
          {/* Erreichbar, aber (noch) keine Preise für heute → anderer Hinweis als bei Ausfall */}
          <div className="flex flex-1 flex-col items-center justify-center gap-[0.5em] text-center">
            <Unavailable>{t(data.state === 'ok' ? 'noTodayYet' : 'pricesDown')}</Unavailable>
            <p className="text-[1em] text-white/65">{t('retryHint')}</p>
          </div>
          {source && data.state === 'ok' && (
            <Fine>
              {t('heroFine')} · {source}
              <Stand ts={data.fetchedAt} state={data.state} />
            </Fine>
          )}
        </>
      ) : (
        <>
          <div className="flex min-w-0 items-center justify-between gap-[1.4em]">
            <div className="min-w-0">
              <div className="flex items-baseline">
                {current && verdict ? (
                  <span className="num-display text-[6em] leading-[0.95]">
                    <Num text={nf(current.ct)} className={HERO_CLASS[verdict]} />
                  </span>
                ) : (
                  <SkeletonBlock className="h-[5.6em] w-[4.5em]" />
                )}
                <span className="ov-unit text-[1.7em]">ct/kWh</span>
              </div>
              {tone && (
                <div className="mt-[0.55em] flex flex-wrap items-center gap-x-[0.8em] gap-y-[0.3em]">
                  <span
                    className="inline-flex items-center gap-[0.5em] rounded-full border px-[0.9em] py-[0.4em] text-[1.08em] font-bold"
                    style={{ color: tone.text, borderColor: `${tone.bar}66`, background: `${tone.bar}1f`, fontFamily: 'var(--font-display)' }}
                  >
                    <VIcon className="size-[1.15em]" strokeWidth={2.6} aria-hidden />
                    {t(VERDICT_KEY[verdict!])}
                  </span>
                  {deltaText && <span className="text-[1.05em] text-white/75 tabular">{deltaText}</span>}
                </div>
              )}
            </div>
            <div className="grid w-[44%] max-w-[23em] shrink-0 gap-[0.45em]">
              {stats ? (
                <>
                  <MiniStat label={t('dayLow')} ct={stats.min.ct} at={hour(stats.min.start)} tone={TONE.low.text} delayMs={150} />
                  <MiniStat label={t('dayAvg')} ct={stats.avg} delayMs={230} />
                  <MiniStat label={t('dayHigh')} ct={stats.max.ct} at={hour(stats.max.start)} tone={TONE.high.text} delayMs={310} />
                </>
              ) : (
                [0, 1, 2].map((i) => <SkeletonBlock key={i} className="h-[2.7em] w-full !rounded-[1em]" />)
              )}
            </div>
          </div>

          <div className={`flex flex-1 flex-col ${stats && stats.min.ct < 0 ? 'min-h-[8.5em]' : 'min-h-[7.5em]'}`}>
            {stats && today.length ? (
              <PriceRibbon slots={today} stats={stats} now={now} cheap={cheap} pastCheap={pastCheap} cheapKey={cheapKey} epoch={epoch} />
            ) : (
              <SkeletonBlock className="w-full flex-1 !rounded-[1em]" />
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-x-[1em] gap-y-[0.2em] text-[0.95em]">
            <ToneLegend />
            <Fine className="!text-[1em]">
              {t('heroFine')}
              <Stand ts={data.fetchedAt} state={data.state} />
            </Fine>
          </div>
        </>
      )}
    </Card>
  );
}
