import type { CSSProperties, ReactNode } from 'react';
import { BatteryCharging, CarFront, Clock3, Fan, Hourglass, Info, PlugZap, Scale, Sparkles, Sun, Sunrise, Sunset } from 'lucide-react';
import { Card, Eyebrow, Fine, Label, Num, SkeletonBlock, Stand, Unavailable } from './common';
import type { LoadState, PriceData, PriceSlot, SunDay } from './data';
import { SHIFT_HOURS, SHIFT_KW, TONE, type DayStats, type PvDay, type Range, type Window } from './derive';
import { useI18n } from './i18n';
import { PriceRibbon } from './PriceRibbon';
import { HOUR, hhmm, shortDate, viennaParts, weekday } from './time';

/* ------------------------------------------------------------------ Jetzt-Empfehlung */

export type NowAdvice = {
  kind: 'golden' | 'sun' | 'low' | 'mid' | 'high';
  /** Beginn der aktuellen Stunde */
  hour: number;
  /** Günstigstes kommendes 3-h-Fenster (nur wenn billiger als jetzt) */
  nextCheap: Window | null;
  /** Liegt dieses Fenster unter dem Tagesmittel? Nur dann heißt es „günstig“ */
  nextCheapIsLow: boolean;
  nextGolden: Range | null;
};

const ADVICE_STYLE = {
  golden: { Icon: Sparkles, bg: 'linear-gradient(145deg,#FFE7A3,#F5A70F)', fg: '#3a2a00', ring: '#FFD873', title: 'aGolden' },
  sun: { Icon: Sun, bg: 'linear-gradient(145deg,#FFE7A3,#F5A70F)', fg: '#3a2a00', ring: '#FFD873', title: 'aSun' },
  low: { Icon: PlugZap, bg: 'linear-gradient(145deg,#8cba58,#669933 55%,#4f7f1f)', fg: '#fff', ring: '#AED083', title: 'aLow' },
  mid: { Icon: Scale, bg: 'linear-gradient(145deg,#9DC1F2,#5B94E0)', fg: '#0a1c3b', ring: '#9DC1F2', title: 'aMid' },
  high: { Icon: Hourglass, bg: 'linear-gradient(145deg,#FF9C92,#F0574B)', fg: '#3a0d08', ring: '#FF9C92', title: 'aHigh' },
} as const;

/**
 * Regelbasierte Empfehlung für die laufende Stunde (wechselt stündlich):
 * Goldene Stunde → viel Sonne (≥ 60 % der Tagesspitze) → Preis im unteren / mittleren / oberen Drittel.
 */
export function NowBanner({ advice, now, compact = false }: { advice: NowAdvice | null; now: number; compact?: boolean }) {
  const { t, span, daySpan, nf } = useI18n();
  if (!advice)
    return (
      <Card className="!flex-row items-center gap-[1.2em] !py-[1.1em]">
        <SkeletonBlock className="size-[3.6em] shrink-0 !rounded-[1.1em]" />
        <div className="flex flex-1 flex-col gap-[0.5em]">
          <SkeletonBlock className="h-[1.4em] w-[55%]" />
          <SkeletonBlock className="h-[1em] w-[80%]" />
        </div>
      </Card>
    );
  const st = ADVICE_STYLE[advice.kind];
  const extra: string[] = [];
  if (advice.kind === 'golden') extra.push(t('aGoldenSub'));
  else if (advice.kind === 'sun') extra.push(t('aSunSub'));
  else if (advice.kind === 'low') extra.push(t('aLowSub'));
  else {
    if (advice.nextGolden) extra.push(t('aNextGolden', { s: daySpan(advice.nextGolden.start, advice.nextGolden.end, now) }));
    else if (advice.nextCheap)
      extra.push(t(advice.nextCheapIsLow ? 'aNextCheap' : 'aNextLowest', { s: daySpan(advice.nextCheap.start, advice.nextCheap.end, now), c: nf(advice.nextCheap.avg) }));
    extra.push(t('aTariff'));
  }
  return (
    <Card className="!flex-row items-center gap-[1.2em] !py-[1.1em]" label={t('nowAdvice')}>
      <span
        key={`${advice.kind}-${advice.hour}`}
        className="ov-rise relative grid size-[3.6em] shrink-0 place-items-center rounded-[1.1em]"
        style={{ background: st.bg, color: st.fg, boxShadow: `0 0.8em 2em -0.7em ${st.ring}aa` }}
      >
        <span aria-hidden className="absolute inset-0 rounded-[1.1em] border-2" style={{ borderColor: st.ring, animation: 'ov-pulse-ring 2.8s cubic-bezier(0.2,0.6,0.3,1) 1.2s infinite' }} />
        <st.Icon className="size-[52%]" strokeWidth={2.2} aria-hidden />
      </span>
      <div key={`t-${advice.kind}-${advice.hour}`} className="ov-rise min-w-0 flex-1" style={{ '--d': '120ms' } as CSSProperties}>
        <div className="flex flex-wrap items-center gap-x-[0.7em] gap-y-[0.2em]">
          <Eyebrow color={st.ring}>{t('nowAdvice')}</Eyebrow>
          <span className="text-[0.95em] font-semibold uppercase tracking-[0.1em] text-white/65">{t('ruleBased')}</span>
        </div>
        <div className="mt-[0.2em] text-[1.6em] font-extrabold leading-tight text-white" style={{ fontFamily: 'var(--font-display)' }}>
          {t(st.title)}
        </div>
        <div className={`mt-[0.2em] text-[1.05em] leading-snug text-white/75 ${compact ? 'truncate' : ''}`}>{extra.join(' ')}</div>
      </div>
      <span className="glass-pill inline-flex shrink-0 self-start whitespace-nowrap rounded-full px-[0.9em] py-[0.35em] text-[0.95em] font-semibold text-white/85 tabular">
        {t('validFor', { s: span(advice.hour, advice.hour + HOUR) })}
      </span>
    </Card>
  );
}

/* ------------------------------------------------------------------ Goldene Stunden */

export type GoldenPlan =
  | { kind: 'golden'; day: 'heute' | 'morgen'; ranges: Range[]; active: boolean }
  | { kind: 'split'; sun: (Range & { day: 'heute' | 'morgen' }) | null; cheap: Window | null; cheapIsLow: boolean; tomorrowPrices: boolean };

function UseChips({ inline = false }: { inline?: boolean }) {
  const { t } = useI18n();
  const uses = [
    { Icon: CarFront, text: t('useEv') },
    { Icon: Fan, text: t('useHp') },
    { Icon: BatteryCharging, text: t('useBat') },
  ];
  // Schmale Kachel (Querformat): eine ruhige Textzeile statt Chips
  if (inline)
    return (
      <div className="flex flex-wrap items-center gap-x-[0.9em] gap-y-[0.2em] text-[1.02em] font-semibold text-white">
        {uses.map(({ Icon, text }) => (
          <span key={text} className="inline-flex items-center gap-[0.35em] whitespace-nowrap">
            <Icon className="size-[1.1em] text-[#AED083]" strokeWidth={2.2} aria-hidden />
            {text}
          </span>
        ))}
      </div>
    );
  return (
    <div className="flex flex-wrap gap-[0.4em]">
      {uses.map(({ Icon, text }) => (
        <span key={text} className="ov-well inline-flex items-center gap-[0.35em] whitespace-nowrap rounded-full border px-[0.65em] py-[0.28em] text-[0.97em] font-semibold text-white">
          <Icon className="size-[1.1em] text-[#AED083]" strokeWidth={2.2} aria-hidden />
          {text}
        </span>
      ))}
    </div>
  );
}

function IconTile({ children, gold = false }: { children: ReactNode; gold?: boolean }) {
  return (
    <span
      className={`grid size-[2.6em] shrink-0 place-items-center rounded-[0.9em] ${gold ? 'text-[#3a2a00]' : 'ov-tile-brand text-white'}`}
      style={gold ? { background: 'linear-gradient(145deg,#FFE7A3,#F5A70F)', boxShadow: '0 0.7em 1.8em -0.6em rgb(245 167 15 / 0.6)' } : undefined}
    >
      {children}
    </span>
  );
}

export function GoldenCard({ plan, loading, now, narrow = false }: { plan: GoldenPlan | null; loading: boolean; now: number; narrow?: boolean }) {
  const { t, span, daySpan, bigSpan, hour, nf } = useI18n();
  const big = plan?.kind === 'golden' ? bigSpan(plan.ranges[0].start, plan.ranges[0].end) : null;
  return (
    <Card className="gap-[0.7em]" label={t('lgGolden')}>
      <div className="flex items-start justify-between gap-[0.8em]">
        <Eyebrow color="#FFD873">{t('goldenEyebrow')}</Eyebrow>
        <IconTile gold>
          <Sparkles className="size-[55%]" strokeWidth={2.2} aria-hidden />
        </IconTile>
      </div>

      {loading ? (
        <div className="flex flex-1 flex-col justify-center gap-[0.6em]">
          <SkeletonBlock className="h-[3em] w-[60%]" />
          <SkeletonBlock className="h-[1.2em] w-[80%]" />
        </div>
      ) : !plan ? (
        <Unavailable>{t('planPending')}</Unavailable>
      ) : plan.kind === 'golden' && big ? (
        <div className="flex min-h-0 flex-1 flex-col justify-center gap-[0.6em]">
          <div>
            <div className="flex flex-wrap items-baseline gap-x-[0.6em]">
              <span className={`num-display text-gradient-sun whitespace-nowrap leading-none tabular ${narrow ? 'text-[2.3em]' : 'text-[2.9em]'}`}>
                {big.text}
                {big.unit && <span className="ov-unit text-[0.4em]">{big.unit}</span>}
              </span>
              <span className="text-[1.1em] text-white/75">
                {plan.active ? (
                  <span className="inline-flex items-center gap-[0.5em] font-semibold text-[#FFD873]">
                    <span className="live-dot !bg-[#FFD873]" /> {t('activeNow')} {t('activeSince', { h: hour(plan.ranges[0].start) })}
                  </span>
                ) : plan.day === 'heute' ? (
                  t('today')
                ) : (
                  t('tomorrow')
                )}
              </span>
            </div>
            {plan.ranges.length > 1 && (
              <div className="mt-[0.3em] text-[1em] font-semibold text-[#FFD873]">
                {t('and')} {plan.ranges.slice(1).map((r) => span(r.start, r.end)).join(', ')}
              </div>
            )}
          </div>
          <p className="text-[1.12em] font-bold leading-snug text-white" style={{ fontFamily: 'var(--font-display)' }}>
            {t('idealFor')}
          </p>
          <UseChips inline={narrow} />
        </div>
      ) : plan.kind === 'split' ? (
        <div className="flex min-h-0 flex-1 flex-col justify-center gap-[0.5em]">
          <p className="text-[1em] leading-snug text-white/75">
            {plan.sun?.day === 'morgen' && !plan.tomorrowPrices ? t('splitNoTomorrow') : plan.sun?.day === 'morgen' ? t('splitTomorrow') : t('splitToday')}
          </p>
          {plan.sun && (
            <div className="flex items-center gap-[0.8em]">
              <Sun className="size-[1.6em] shrink-0 text-[#FFD873]" strokeWidth={2} aria-hidden />
              <div className="min-w-0">
                <div className="num-display text-[1.55em] leading-none text-white tabular">{daySpan(plan.sun.start, plan.sun.end, now)}</div>
                <div className="text-[1em] leading-snug text-white/70">{t('useSolar')}</div>
              </div>
            </div>
          )}
          {plan.cheap && (
            <div className="flex items-center gap-[0.8em]">
              <PlugZap className="size-[1.6em] shrink-0 text-[#AED083]" strokeWidth={2} aria-hidden />
              <div className="min-w-0">
                <div className="num-display text-[1.55em] leading-none text-white tabular">{daySpan(plan.cheap.start, plan.cheap.end, now)}</div>
                <div className="text-[1em] leading-snug text-white/70">{t(plan.cheapIsLow ? 'cheapGrid' : 'cheapRest', { c: nf(plan.cheap.avg) })}</div>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {plan?.kind !== 'split' && <Fine>{t('goldenRule')}</Fine>}
    </Card>
  );
}

/* ------------------------------------------------------------------ Lastverschiebung */

export type Saving = { cheap: Window; dear: Window; kwh: number; eur: number; cheapEur: number; dearEur: number };

/** Betrag mit ruhigem Eintritt und Währungszeichen in Landesschreibweise */
function Money({ v, sizeClass, colorClass, unitClassName }: { v: number; sizeClass: string; colorClass: string; unitClassName?: string }) {
  const { nf, eurFirst } = useI18n();
  return (
    <span className={`inline-flex items-baseline whitespace-nowrap ${sizeClass}`}>
      <span className={`num-display leading-none ${colorClass}`}>≈{'\u00A0'}</span>
      {eurFirst && <span className={`ov-unit !ml-0 mr-[0.1em] ${unitClassName ?? ''}`}>€</span>}
      <span className="num-display leading-none">
        <Num text={nf(v, 2)} className={colorClass} />
      </span>
      {!eurFirst && <span className={`ov-unit ${unitClassName ?? ''}`}>€</span>}
    </span>
  );
}

export function SavingCard({
  saving,
  loading,
  scopeTomorrow,
  pricesDown,
  now,
  narrow = false,
}: {
  saving: Saving | null;
  loading: boolean;
  scopeTomorrow: boolean;
  pricesDown: boolean;
  now: number;
  narrow?: boolean;
}) {
  const { t, daySpan, eur, nf } = useI18n();
  const rows = saving
    ? [
        { label: t('bestWin'), w: saving.cheap, eur: saving.cheapEur, tone: TONE.low },
        { label: t('worstWin'), w: saving.dear, eur: saving.dearEur, tone: TONE.high },
      ]
    : [];
  // Balkenlänge nach Betrag; negative Kosten (Gutschrift) gestrichelt statt als volle Breite
  const scale = saving ? Math.max(Math.abs(saving.cheapEur), Math.abs(saving.dearEur), 0.01) : 1;
  return (
    <Card className="gap-[0.7em]" label={t('savingEyebrow')}>
      <div className="flex items-start justify-between gap-[0.8em]">
        <Eyebrow>{t('savingEyebrow')}</Eyebrow>
        <IconTile>
          <CarFront className="size-[55%]" strokeWidth={2} aria-hidden />
        </IconTile>
      </div>
      {loading ? (
        <div className="flex flex-1 flex-col justify-center gap-[0.6em]">
          <SkeletonBlock className="h-[3em] w-[50%]" />
          <SkeletonBlock className="h-[1.2em] w-[85%]" />
        </div>
      ) : !saving ? (
        <Unavailable>{t(pricesDown ? 'pricesDown' : 'savingTooFew')}</Unavailable>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col justify-center gap-[0.55em]">
          <div className="flex items-center gap-[0.9em]">
            <Money v={saving.eur} sizeClass={narrow ? 'text-[2.2em]' : 'text-[2.7em]'} colorClass="ov-text-brand" unitClassName="text-[0.48em]" />
            <div className="min-w-0 text-[1em] leading-snug text-white/75">{t('savingLead', { h: SHIFT_HOURS, kw: SHIFT_KW, k: nf(SHIFT_HOURS * SHIFT_KW, 0) })}</div>
          </div>
          <div className="grid gap-[0.45em]">
            {rows.map((r, i) => (
              <div key={r.label} className="grid grid-cols-[1fr_auto] items-center gap-x-[0.8em] gap-y-[0.2em]">
                <span className="min-w-0 text-[1em] text-white/75">
                  {r.label} <span className="whitespace-nowrap font-semibold text-white tabular">{daySpan(r.w.start, r.w.end, now)}</span>
                </span>
                <span className="num-display whitespace-nowrap text-[1.1em] text-white tabular">{eur(r.eur)}</span>
                <span className="col-span-2 h-[0.5em] overflow-hidden rounded-full bg-white/[0.07]">
                  <span
                    className="block h-full origin-left rounded-full"
                    style={{
                      width: `${(Math.abs(r.eur) / scale) * 100}%`,
                      background: r.eur < 0 ? `repeating-linear-gradient(135deg, ${r.tone.bar} 0 0.35em, transparent 0.35em 0.6em)` : r.tone.bar,
                      animation: `ov-ins-grow-x 1100ms var(--ease-out-expo) ${600 + i * 150}ms both`,
                    }}
                  />
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      <Fine>
        {saving ? `${t(scopeTomorrow ? 'scopeTomorrow' : 'scopeToday')} ${t('savingFine', { k: nf(saving.kwh, 0) })}` : ''}
      </Fine>
    </Card>
  );
}

/* ------------------------------------------------------------------ Morgen */

function Kv({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-[0.55em]">
      <span className="shrink-0 text-[#FFD873]">{icon}</span>
      <div className="min-w-0">
        <Label className="block whitespace-nowrap text-white/70">{label}</Label>
        <div className="num-display truncate whitespace-nowrap text-[1.4em] leading-tight text-white tabular">{children}</div>
      </div>
    </div>
  );
}

export function TomorrowCard({
  dayStart,
  prices,
  stats,
  cheap,
  pv,
  sun,
  epoch,
  wide = false,
}: {
  dayStart: number;
  prices: PriceSlot[];
  stats: DayStats | null;
  cheap: Window | null;
  pv: PvDay | null;
  sun: SunDay | null;
  epoch: number;
  /** Breite Kachel (Hochformat, volle Breite): Kennzahlen links, Preise rechts */
  wide?: boolean;
}) {
  const { t, span, nf, hour, locale } = useI18n();
  const hasPrices = !!stats && prices.length > 0;
  const info = (
    <>
      <Eyebrow>
        {t('tomorrow')} · {weekday(dayStart, locale)}, {shortDate(dayStart, locale)}
      </Eyebrow>
      <div className="grid grid-cols-[repeat(3,auto)] justify-between gap-x-[0.9em]">
        <Kv icon={<Sun className="size-[1.6em]" strokeWidth={2} aria-hidden />} label={t('yieldLabel')}>
          {pv ? (
            <>
              ≈ {nf(pv.kwh, 0)}
              <span className="ov-unit text-[0.6em]">kWh</span>
            </>
          ) : (
            '–'
          )}
        </Kv>
        <Kv icon={<Sunrise className="size-[1.6em]" strokeWidth={2} aria-hidden />} label={t('sunrise')}>
          {sun ? hhmm(sun.sunrise) : '–'}
        </Kv>
        <Kv icon={<Sunset className="size-[1.6em]" strokeWidth={2} aria-hidden />} label={t('sunset')}>
          {sun ? hhmm(sun.sunset) : '–'}
        </Kv>
      </div>
      {pv && pv.strong.length > 0 && (wide || !hasPrices) && (
        // breite Kachel: nur die Stunden, ohne Spitzenwert (steht im Diagramm)
        <div className="text-[1.05em] text-white/75">
          {t('strongest')} <b className="whitespace-nowrap font-bold text-[#FFD873] tabular">{pv.strong.map((r) => span(r.start, r.end)).join(', ')}</b>
          {pv.peak && !wide ? <span className="whitespace-nowrap text-white/70 tabular"> · {t('peak')} ≈ {nf(pv.peak.kw)}{'\u00A0'}kW</span> : null}
        </div>
      )}
    </>
  );
  const priceBlock = hasPrices ? (
    <>
      <div className="flex min-h-[3.5em] flex-1 flex-col">
        <PriceRibbon slots={prices} stats={stats!} now={null} cheap={cheap} epoch={epoch} compact />
      </div>
      <Fine>
        {t('tomorrowPrices', { lo: `${nf(stats!.min.ct)} ct`, lt: hour(stats!.min.start), hi: `${nf(stats!.max.ct)} ct`, ht: hour(stats!.max.start) })}
        {cheap ? ` · ${t('cheapest3Short', { s: span(cheap.start, cheap.end) })}` : ''}
      </Fine>
    </>
  ) : (
    <div className="ov-well flex flex-1 items-center gap-[0.8em] rounded-[1.1em] border px-[1em] py-[0.7em]">
      <Clock3 className="size-[1.7em] shrink-0 text-[#9DC1F2]" strokeWidth={2} aria-hidden />
      <div className="min-w-0">
        <div className="text-[1.12em] font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
          {t(viennaParts(Date.now()).h >= 14 ? 'tomorrowDelayed' : 'tomorrowFrom13')}
        </div>
        {wide && viennaParts(Date.now()).h < 14 && <div className="text-[1em] leading-snug text-white/70">{t('tomorrowExplain')}</div>}
      </div>
    </div>
  );
  return wide ? (
    <Card className="!grid grid-cols-[1fr_1.1fr] gap-x-[1.6em]" label={t('tomorrow')}>
      <div className="flex min-w-0 flex-col justify-center gap-[0.75em]">{info}</div>
      <div className="flex min-h-0 min-w-0 flex-col gap-[0.5em]">{priceBlock}</div>
    </Card>
  ) : (
    <Card className="gap-[0.75em]" label={t('tomorrow')}>
      {info}
      {priceBlock}
    </Card>
  );
}

/* ------------------------------------------------------------------ Annahmen */

export function NotesCard({
  kwp,
  prices,
  pvTs,
  pvState,
  strip = false,
  withRule = false,
}: {
  kwp: number | null;
  prices: PriceData;
  pvTs: number | null;
  pvState: LoadState;
  /** Schmale Leiste über die volle Breite (Hochformat) */
  strip?: boolean;
  /** Regel der Goldenen Stunden hier nennen (Querformat, dort fehlt der Platz in der Kachel) */
  withRule?: boolean;
}) {
  const { t, nf } = useI18n();
  const items: { k: string; v: ReactNode }[] = [
    {
      k: t('nPv'),
      v: (
        <>
          {t('nPvText', { kwp: kwp ? `${nf(kwp)} kWp, ` : '' })}
          <Stand ts={pvTs} state={pvState} />
        </>
      ),
    },
    {
      k: t('nPrice'),
      v: (
        <>
          {t('nPriceText', { s: prices.source === 'Backend' ? t('viaServer') : prices.source ? 'aWATTar' : t('unavailable') })}
          <Stand ts={prices.fetchedAt} state={prices.state} />
        </>
      ),
    },
    ...(withRule ? [{ k: t('lgGolden'), v: t('goldenRule') }] : []),
    { k: t('nNote'), v: t('nNoteText') },
  ];
  if (strip)
    return (
      <Card className="!flex-row items-start gap-[0.7em] !py-[0.85em]" label={t('howWeCalc')}>
        <Info className="mt-[0.2em] size-[1.1em] shrink-0 text-[#9DC1F2]" strokeWidth={2.2} aria-hidden />
        <p className="min-w-0 text-[1em] leading-snug text-white/70">
          {items.map((it, i) => (
            <span key={it.k}>
              {i > 0 && ' '}
              <b className="font-bold text-white/90">{it.k}:</b> {it.v}
            </span>
          ))}
        </p>
      </Card>
    );
  return (
    <Card className="gap-[0.6em]" label={t('howWeCalc')}>
      <Eyebrow color="rgb(255 255 255 / 0.7)">{t('howWeCalc')}</Eyebrow>
      <dl className="grid min-h-0 flex-1 content-start gap-[0.45em] text-[0.92em]">
        {items.map((it) => (
          <div key={it.k} className="flex gap-[0.6em]">
            <Info className="mt-[0.15em] size-[1em] shrink-0 text-[#9DC1F2]" strokeWidth={2.2} aria-hidden />
            <div className="min-w-0 leading-snug text-white/70">
              <dt className="inline font-bold text-white/90">{it.k}: </dt>
              <dd className="inline">{it.v}</dd>
            </div>
          </div>
        ))}
      </dl>
    </Card>
  );
}

