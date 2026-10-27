import { Fragment, useMemo, type CSSProperties } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Atom,
  BatteryCharging,
  CircleHelp,
  Droplets,
  Ellipsis,
  Flame,
  Fuel,
  Leaf,
  Pickaxe,
  Sun,
  ThermometerSun,
  Waves,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import { tr } from '../../../design/hooks';
import { SOURCES, T, fmtMW, unitFor, type Lang, type SourceKey } from './config';
import type { PowerBreakdown } from './useGridData';

type RowKey = SourceKey | 'other';

const ICONS: Record<RowKey, LucideIcon> = {
  hydro: Droplets,
  wind: Wind,
  solar: Sun,
  biomass: Leaf,
  geothermal: ThermometerSun,
  nuclear: Atom,
  'hydro discharge': Waves,
  'battery discharge': BatteryCharging,
  gas: Flame,
  coal: Pickaxe,
  oil: Fuel,
  unknown: CircleHelp,
  other: Ellipsis,
};

interface Row {
  key: RowKey;
  label: string;
  color: string;
  left: number;
  right: number;
}

const val = (r: Record<string, number | null> | undefined, k: string) => {
  const v = r?.[k];
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
};

/**
 * Zeilen aus electricitymaps ableiten (keine Schätzwerte):
 * rechts = Erzeugung im Land (inkl. Ausspeisen aus Speichern); links = Netto-Import je Quelle (Verbrauch − Erzeugung, flow-traced).
 * Einspeichern (Pumpspeicher pumpt) ist keine Herkunft → eigene Summe „Speicher lädt“.
 * Quellen unter 2,5 % des größten Werts werden zu „Sonstige“ zusammengefasst.
 */
function buildRows(p: PowerBreakdown, language: Lang) {
  let charge = 0;
  const all: Row[] = SOURCES.map((s) => {
    const prod = val(p.powerProductionBreakdown, s.key);
    const cons = val(p.powerConsumptionBreakdown, s.key);
    if (s.storage && prod < 0) charge += -prod;
    const right = Math.max(prod, 0);
    const left = s.storage ? 0 : Math.max(cons - right, 0);
    return { key: s.key, label: tr(language, s.label), color: s.color, left, right };
  });
  const max = Math.max(1, ...all.map((r) => Math.max(r.left, r.right)));
  const th = max * 0.025;
  // Solar ist auf dem Kiosk eines Solarunternehmens immer sichtbar (nachts ehrlich mit 0 MW)
  const pinned = (r: Row) => r.key === 'solar';
  let rows = all.filter((r) => pinned(r) || r.left >= th || r.right >= th);
  // höchstens 7 Zeilen (inkl. „Sonstige“), damit die Schrift aus 3–5 m lesbar bleibt: kleinste Quellen zusammenfassen
  const size = (r: Row) => Math.max(r.left, r.right);
  while (rows.length > 6 && rows.length + (all.some((r) => !rows.includes(r) && (r.left >= 1 || r.right >= 1)) ? 1 : 0) > 7) {
    const candidates = rows.filter((r) => !pinned(r));
    const smallest = candidates.reduce((m, r) => (size(r) < size(m) ? r : m), candidates[0]);
    rows = rows.filter((r) => r !== smallest);
  }
  const rest = all.filter((r) => !rows.includes(r) && !pinned(r) && (r.left >= 1 || r.right >= 1));
  if (rest.length) {
    rows.push({
      key: 'other',
      label: tr(language, T.other),
      color: '#6F7C96',
      left: rest.reduce((s, r) => s + r.left, 0),
      right: rest.reduce((s, r) => s + r.right, 0),
    });
  }
  return { rows, charge };
}

/** Wert-Etikett am Balkenende: außen, bei langen Balken innen. Blendet erst nach dem Balkenwachstum ein. */
function BarLabel({ pct, side, v, unit, language, d }: { pct: number; side: 'l' | 'r'; v: number; unit: 'MW' | 'GW'; language: Lang; d: number }) {
  const inside = pct > 62;
  const text = fmtMW(v, unit, language);
  const delay = { '--d': `${d}ms` } as CSSProperties;
  if (inside && side === 'l') {
    // auf der Schraffur: dunkle Kappe deckt das Balkenende vollständig ab (kein runder Rest sichtbar)
    return (
      <span
        className="ov-map-fadein num-display absolute inset-y-0 flex items-center whitespace-nowrap rounded-l-[0.45em] bg-[#04142e]/92 px-[0.5em] text-[1em] leading-none text-white"
        style={{ left: `${100 - pct}%`, ...delay }}
      >
        {text}
      </span>
    );
  }
  const style: CSSProperties =
    side === 'r'
      ? inside
        ? { right: `${100 - pct}%`, paddingRight: '0.7em' }
        : { left: `${pct}%`, paddingLeft: '0.55em' }
      : { right: `${pct}%`, paddingRight: '0.55em' };
  return (
    <span
      className={`ov-map-fadein num-display absolute top-1/2 -translate-y-1/2 whitespace-nowrap text-[1em] leading-none ${inside ? 'text-[#04142e]' : 'text-white/90'}`}
      style={{ ...style, ...delay }}
    >
      {text}
    </span>
  );
}

interface Props {
  power: PowerBreakdown | null;
  country: string;
  loading: boolean;
  /** Daten nicht live (zwischengespeichert oder Abruf fehlgeschlagen) */
  stale: boolean;
  language: Lang;
}

const LBL = '13em';

/** Strommix als divergierende Balken: links Import (schraffiert), rechts Erzeugung (voll); darunter die Bilanz. */
export function OriginChart({ power, country, loading, stale, language }: Props) {
  const L = (t: Parameters<typeof tr>[1]) => tr(language, t);
  const { rows, charge } = useMemo(() => (power ? buildRows(power, language) : { rows: [] as Row[], charge: 0 }), [power, language]);
  const maxL = Math.max(1, ...rows.map((r) => r.left));
  const maxR = Math.max(1, ...rows.map((r) => r.right));
  // Achse proportional versetzt, damit beide Seiten denselben Maßstab haben; jede Seite mind. 28 %
  const shareL = Math.min(0.72, Math.max(0.28, maxL / (maxL + maxR)));
  const scale = Math.max(maxL / shareL, maxR / (1 - shareL));
  const unit = unitFor(Math.max(maxL, maxR, power?.powerConsumptionTotal ?? 0, power?.powerProductionTotal ?? 0));
  const prodTotal = rows.reduce((s, r) => s + r.right, 0);
  const netImportSum = rows.reduce((s, r) => s + r.left, 0);
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

  // Bilanz: Erzeugung + Import − Export − Speicher lädt = Verbrauch
  const totals: Array<{ k: Parameters<typeof tr>[1]; v: number | null; op?: string }> = [
    { k: T.production, v: num(power?.powerProductionTotal) },
    { k: T.import, v: num(power?.powerImportTotal), op: '+' },
    { k: T.export, v: num(power?.powerExportTotal), op: '−' },
    { k: T.storageCharge, v: power ? charge : null, op: '−' },
    { k: T.consumption, v: num(power?.powerConsumptionTotal), op: '=' },
  ];

  return (
    <div className="ov-glass relative flex h-full min-h-0 flex-col overflow-hidden rounded-[30px] px-[4.5%] pb-[3%] pt-[3.4%]">
      {/* Kopf */}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <div className={power && !stale ? 'eyebrow !text-[1em]' : 'eyebrow-plain !text-[1em] text-white/65'}>{L(power && !stale ? T.origin : T.originPlain).replace('{c}', country)}</div>
          <h2 className="mt-[0.3em] text-[1.9em] font-extrabold leading-none tracking-[-0.03em] text-white" style={{ fontFamily: 'var(--font-display)' }}>
            {L(T.originTitle)}
          </h2>
        </div>
        <div className="flex items-center gap-[1.4em] pb-[0.15em] text-[1em] font-semibold text-white/80">
          <span className="inline-flex items-center gap-[0.5em]">
            <ArrowLeft className="size-[1.05em] text-white/70" />
            <span className="ov-origin-hatch inline-block h-[0.85em] w-[1.7em] rounded-[4px]" style={{ '--c': '#9AA6BC' } as CSSProperties} />
            {L(T.leftSide)}
            {power && <span className="num-display text-white/90">Σ {fmtMW(netImportSum, unit, language)}</span>}
          </span>
          <span className="inline-flex items-center gap-[0.5em]">
            <span className="inline-block h-[0.85em] w-[1.7em] rounded-[4px] bg-[linear-gradient(90deg,#9aa6bc66,#9aa6bc)]" />
            {L(T.rightSide)}
            <ArrowRight className="size-[1.05em] text-white/70" />
          </span>
        </div>
      </div>

      {/* Erzeugungsmix als 100 %-Band */}
      <div className="mt-[1em] flex h-[0.55em] gap-[2px] overflow-hidden rounded-full bg-white/[0.06]">
        {prodTotal > 0 &&
          rows
            .filter((r) => r.right > 0)
            .map((r, i) => (
              <span
                key={r.key}
                className="ov-origin-seg h-full first:rounded-l-full last:rounded-r-full"
                style={{ flexGrow: r.right / prodTotal, background: r.color, '--d': `${300 + i * 60}ms` } as CSSProperties}
              />
            ))}
      </div>

      {/* Balken (Schrift schrumpft nur, wenn sehr viele Quellen gleichzeitig aktiv sind) */}
      <div className="relative mt-[0.8em] flex min-h-0 flex-1 flex-col overflow-hidden" style={{ fontSize: `${Math.min(1, 7 / Math.max(rows.length, 1))}em` }}>
        {!power ? (
          loading ? (
            <div className="flex flex-1 flex-col justify-around">
              {Array.from({ length: 7 }, (_, i) => (
                <div key={i} className="ov-skeleton h-[0.9em] rounded-full" style={{ width: `${88 - ((i * 23) % 50)}%`, marginLeft: `${(i * 7) % 12}%` }} />
              ))}
            </div>
          ) : (
            <div className="grid flex-1 place-items-center text-[1.1em] font-semibold text-white/65">{L(T.unavailable)}</div>
          )
        ) : (
          <>
            {/* Nulllinie */}
            <div aria-hidden className="pointer-events-none absolute inset-y-0 w-px bg-white/30" style={{ left: `calc(${LBL} + (100% - ${LBL}) * ${shareL})` }} />
            {rows.map((r, i) => {
              const Icon = ICONS[r.key];
              const pl = (r.left / (scale * shareL)) * 100;
              const pr = (r.right / (scale * (1 - shareL))) * 100;
              const d = 200 + i * 70;
              return (
                <div key={r.key} className="grid min-h-[1.75em] flex-1 items-center" style={{ gridTemplateColumns: `${LBL} ${shareL}fr ${1 - shareL}fr` }}>
                  <div className="flex min-w-0 items-center gap-[0.6em] pr-[0.8em]">
                    <span className="grid size-[1.75em] shrink-0 place-items-center rounded-[0.55em]" style={{ background: `${r.color}26`, boxShadow: `inset 0 0 0 1px ${r.color}55` }}>
                      <Icon className="size-[1.05em]" style={{ color: r.color }} strokeWidth={2.2} />
                    </span>
                    <span className="line-clamp-2 text-[1.12em] font-semibold leading-[1.1] text-white/90">{r.label}</span>
                  </div>
                  {/* links: Import */}
                  <div className="relative h-[66%] max-h-[1.6em]">
                    {r.left > 0 && (
                      <>
                        <span
                          className="ov-origin-bar ov-origin-hatch absolute inset-y-0 right-0 origin-right rounded-l-[0.45em]"
                          style={{ width: `${pl}%`, '--c': r.color, '--d': `${d}ms` } as CSSProperties}
                        />
                        <BarLabel pct={pl} side="l" v={r.left} unit={unit} language={language} d={d + 800} />
                      </>
                    )}
                  </div>
                  {/* rechts: Erzeugung */}
                  <div className="relative h-[66%] max-h-[1.6em]">
                    {r.right <= 0 && r.left <= 0 && (
                      <span className="ov-map-fadein num-display absolute top-1/2 -translate-y-1/2 whitespace-nowrap pl-[0.55em] text-[1em] leading-none text-white/75" style={{ '--d': `${d + 800}ms` } as CSSProperties}>
                        {fmtMW(0, unit, language)}
                      </span>
                    )}
                    {r.right > 0 && (
                      <>
                        <span
                          className="ov-origin-bar absolute inset-y-0 left-0 origin-left rounded-r-[0.45em]"
                          style={
                            {
                              width: `${pr}%`,
                              background: `linear-gradient(90deg, ${r.color}88, ${r.color})`,
                              boxShadow: `0 0 1.2em -0.2em ${r.color}88`,
                              '--d': `${d}ms`,
                            } as CSSProperties
                          }
                        />
                        <BarLabel pct={pr} side="r" v={r.right} unit={unit} language={language} d={d + 800} />
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Bilanz: Erzeugung + Import − Export − Speicher lädt = Verbrauch */}
      <div className="mt-[0.9em] border-t border-white/10 pt-[0.8em]">
        <div className="grid items-end gap-x-[0.5em]" style={{ gridTemplateColumns: '1fr auto 1fr auto 1fr auto 1fr auto 1fr' }}>
          {totals.map((t, i) => (
            <Fragment key={i}>
              {t.op && <span className="num-display pb-[0.1em] text-[1.3em] leading-none text-white/60">{t.op}</span>}
              <div className="min-w-0">
                <div className="truncate text-[1em] font-semibold leading-tight text-white/70">{L(t.k)}</div>
                <div className={`num-display mt-[0.2em] whitespace-nowrap text-[1.35em] leading-none ${t.op === '=' ? 'text-white' : 'text-white/90'}`}>
                  {t.v != null ? fmtMW(t.v, unit, language) : <span className="text-white/30">–</span>}
                </div>
              </div>
            </Fragment>
          ))}
        </div>
        {power && <div className="mt-[0.6em] line-clamp-2 text-[1em] leading-snug text-white/65">{L(T.storedNote)}</div>}
      </div>
    </div>
  );
}
