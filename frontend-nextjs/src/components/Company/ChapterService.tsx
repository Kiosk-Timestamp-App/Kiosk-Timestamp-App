import { ClipboardCheck, Eye, HeartHandshake, Lightbulb, RefreshCw, ScanSearch, ShieldCheck, SprayCan, Umbrella, Wrench, Zap, type LucideIcon } from 'lucide-react';
import { delay } from '../../design/hooks';
import { SERVICE } from './facts';
import { Card } from './ui';

/** Gruppen-Symbole bewusst verschieden von den Leistungs-Symbolen */
const GROUP_ICON: Record<string, LucideIcon> = { check: Eye, care: HeartHandshake, secure: ShieldCheck };
const ITEM_ICON: LucideIcon[][] = [
  [ClipboardCheck, ScanSearch],
  [Wrench, SprayCan],
  [Umbrella, Zap],
];
const MORE_ICON = [RefreshCw, Lightbulb];
const TONE = ['#5B94E0', '#8CBA58', '#FFD873'];

/** Lebenszyklus: Inbetriebnahme → 25 Jahre + – Prüfen, Pflegen und Absichern begleiten die gesamte Laufzeit (keine Abfolge) */
export function ChapterService({ wide }: { wide: boolean }) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-[1em]">
      <Card className={`flex min-h-0 flex-1 flex-col ${wide ? 'p-[1.6em_2.2em]' : 'p-[2em_2.2em]'}`}>
        <div className="eyebrow">{SERVICE.eyebrow}</div>
        <h2 className={`mt-[0.35em] font-[var(--font-display)] font-extrabold leading-[1.04] tracking-[-0.035em] text-white ${wide ? 'text-[2.6em]' : 'text-[3em]'}`}>
          {SERVICE.title.lead} <span className="cp-hl text-gradient-sun">{SERVICE.title.highlight}</span> {SERVICE.title.tail}
        </h2>
        <p className={`ov-rise mt-[0.5em] font-medium text-white/85 ${wide ? 'text-[1.25em]' : 'text-[1.35em]'}`} style={delay(240)}>
          {SERVICE.intro}
        </p>

        {/* Zeitachse der Laufzeit */}
        <div className={`ov-rise relative ${wide ? 'mt-[1.4em]' : 'mt-[1.8em]'}`} style={delay(360)}>
          <div className="flex items-end justify-between">
            <span className="eyebrow-plain text-white/75">{SERVICE.start}</span>
            <span className="num-display text-[1.6em] leading-none text-[#FFD873]">{SERVICE.end}</span>
          </div>
          <div className="relative mt-[0.6em] h-[0.7em] rounded-full bg-white/8">
            <span className="cp-fill absolute inset-0 rounded-full bg-[linear-gradient(90deg,#5B94E0,#8CBA58_50%,#FFD873)]" style={delay(500)} />
          </div>
        </div>

        {/* Querformat: drei Spalten · Hochformat: drei Zeilen (Gruppe links, Leistungen rechts) */}
        <div className={`grid ${wide ? 'mt-[1.2em] min-h-0 flex-1 grid-cols-3 gap-[1.1em]' : 'mt-[1.2em] gap-[0.7em]'}`}>
          {SERVICE.groups.map((g, gi) => {
            const GIcon = GROUP_ICON[g.key];
            return (
              <div
                key={g.key}
                className={`ov-well ov-rise min-w-0 rounded-[24px] border ${
                  wide ? 'flex flex-col p-[1.2em_1.2em]' : 'grid grid-cols-[8.2em_1fr] items-center gap-[1.2em] p-[0.9em_1.3em]'
                }`}
                style={{ boxShadow: wide ? `inset 0 3px 0 ${TONE[gi]}` : `inset 4px 0 0 ${TONE[gi]}`, ...delay(700 + gi * 220) }}
              >
                <div className={`flex gap-[0.65em] ${wide ? 'items-center' : 'flex-col items-start gap-[0.4em]'}`}>
                  <span
                    className={`grid place-items-center rounded-[0.8em] ${wide ? 'size-[2.5em]' : 'size-[2.4em]'}`}
                    style={{ background: `${TONE[gi]}22`, border: `1px solid ${TONE[gi]}55` }}
                  >
                    <GIcon className={wide ? 'size-[1.35em]' : 'size-[1.3em]'} style={{ color: TONE[gi] }} strokeWidth={1.8} />
                  </span>
                  <span className={`font-[var(--font-display)] font-extrabold leading-[1.15] tracking-[-0.02em] text-white ${wide ? 'text-[1.75em]' : 'text-[1.7em]'}`}>
                    {g.title}
                  </span>
                </div>
                <ul className={wide ? 'mt-[1em] grid flex-1 grid-rows-[1fr_1fr] content-start gap-[1em]' : 'grid grid-cols-2 gap-[1.1em]'}>
                  {g.items.map((it, ii) => {
                    const Icon = ITEM_ICON[gi][ii];
                    return (
                      <li key={it.title} className="flex gap-[0.7em]">
                        <Icon className={`mt-[0.15em] shrink-0 text-white/55 ${wide ? 'size-[1.3em]' : 'size-[1.45em]'}`} strokeWidth={1.8} />
                        <div className="min-w-0">
                          <div className={`font-bold leading-tight text-white ${wide ? 'text-[1.15em]' : 'text-[1.2em]'}`}>{it.title}</div>
                          <div className={`mt-[0.3em] leading-snug text-white/75 ${wide ? 'text-[1.08em]' : 'text-[1.08em]'}`}>{it.text}</div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>

        <div className={`ov-rise ${wide ? 'mt-[1em] flex flex-wrap items-center gap-x-[1.4em] gap-y-[0.5em]' : 'mt-auto grid grid-cols-2 gap-[0.8em] pt-[1em]'}`} style={delay(1400)}>
          <span className={`eyebrow-plain text-white/70 ${wide ? '' : 'col-span-2'}`}>Außerdem</span>
          {SERVICE.more.map((m, i) => {
            const Icon = MORE_ICON[i];
            return (
              <span
                key={m.title}
                className={`glass-pill items-center gap-x-[0.6em] px-[1em] text-[1.05em] ${wide ? 'inline-flex rounded-full py-[0.5em]' : 'grid grid-cols-[auto_1fr] rounded-[18px] py-[0.7em]'}`}
              >
                <Icon className={`size-[1.2em] text-[#AED083] ${wide ? '' : 'row-span-2'}`} strokeWidth={1.9} />
                <span className="font-bold text-white">{m.title}</span>
                <span className="text-white/75">
                  {wide ? '· ' : ''}
                  {m.text}
                </span>
              </span>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
