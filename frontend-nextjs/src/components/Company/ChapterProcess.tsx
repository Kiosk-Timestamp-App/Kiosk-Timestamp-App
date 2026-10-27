import { Activity, HardHat, PencilRuler, Search } from 'lucide-react';
import { delay } from '../../design/hooks';
import { FUNDING, PROCESS } from './facts';
import { FundingCard, type FundingCallState } from './Funding';
import { Card } from './ui';

const STEP_ICONS = [Search, PencilRuler, HardHat, Activity];
const STEP_MS = 520;

/** Kapitel: Ablauf 01–04 (Analyse → Planung → Bau → Betrieb) + Förderhinweis 2026 */
export function ChapterProcess({
  wide,
  fundingItems,
  fundingCall,
  website,
}: {
  wide: boolean;
  fundingItems: typeof FUNDING.items;
  fundingCall: FundingCallState;
  website: string | null;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-[1em]">
      <Card className={`flex min-h-0 flex-1 flex-col ${wide ? 'p-[1.6em_2.2em]' : 'p-[1.7em_2.4em_1.4em]'}`}>
        <div className="eyebrow">{PROCESS.eyebrow}</div>
        <h2 className={`mt-[0.35em] font-[var(--font-display)] font-extrabold leading-[1.04] tracking-[-0.035em] text-white ${wide ? 'text-[2.6em]' : 'text-[2.5em]'}`}>
          {PROCESS.title.lead} <span className="cp-hl text-gradient-sun">{PROCESS.title.highlight}</span>
        </h2>

        {wide ? (
          /* Querformat: horizontale Zeitachse */
          <ol className="relative mt-[1.2em] grid min-h-0 flex-1 grid-cols-4 content-center gap-[1.4em]">
            {PROCESS.steps.map((s, i) => {
              const Icon = STEP_ICONS[i];
              return (
                <li key={s.n} className="relative flex min-w-0 flex-col">
                  {i < 3 && (
                    <span aria-hidden className="absolute left-[4.2em] right-[-0.8em] top-[1.8em] h-[2px] overflow-hidden rounded-full bg-white/10">
                      <span className="cp-fill block h-full bg-[linear-gradient(90deg,#669933,#AED083)]" style={delay(800 + i * STEP_MS)} />
                    </span>
                  )}
                  <span
                    className={`cp-pop relative grid size-[3.6em] place-items-center rounded-full ${i === 3 ? 'ov-tile-brand' : 'border border-white/20 bg-[#0a1f45]'}`}
                    style={delay(500 + i * STEP_MS)}
                  >
                    <Icon className="size-[1.6em] text-white" strokeWidth={1.8} />
                  </span>
                  <div className="ov-rise mt-[0.7em] flex items-baseline gap-[0.45em]" style={delay(600 + i * STEP_MS)}>
                    <span className="num-display text-[1.25em] text-[#AED083]">{s.n}</span>
                    <span className="font-[var(--font-display)] text-[1.4em] font-extrabold leading-tight text-white">{s.title}</span>
                  </div>
                  <p className="ov-rise mt-[0.4em] text-[1.08em] leading-[1.38] text-white/80" style={delay(700 + i * STEP_MS)}>
                    {s.text}
                  </p>
                </li>
              );
            })}
          </ol>
        ) : (
          /* Hochformat: vertikale Zeitachse */
          <ol
            className={`relative flex min-h-0 flex-1 flex-col ${fundingItems.length > 0 ? 'mt-[0.9em]' : 'mt-[2em] text-[1.2em]'}`}
          >
            {PROCESS.steps.map((s, i) => {
              const Icon = STEP_ICONS[i];
              return (
                <li
                  key={s.n}
                  className={`relative grid grid-cols-[3.2em_1fr] items-start gap-x-[1.4em] ${i < 3 ? 'flex-1 pb-[0.3em]' : ''}`}
                >
                  {/* Verbindung zum nächsten Schritt: endet exakt am nächsten Symbol */}
                  {i < 3 && (
                    <span aria-hidden className="absolute left-[1.6em] top-[3.2em] h-[calc(100%-3.2em)] w-[2px] -translate-x-1/2 overflow-hidden bg-white/12">
                      <span className="cp-fill-y block size-full bg-[linear-gradient(180deg,#8CBA58,#AED083)]" style={delay(700 + i * STEP_MS)} />
                    </span>
                  )}
                  <span
                    className={`cp-pop relative grid size-[3.2em] place-items-center rounded-full ${i === 3 ? 'ov-tile-brand' : 'border border-white/20 bg-[#0a1f45]'}`}
                    style={delay(500 + i * STEP_MS)}
                  >
                    <Icon className="size-[1.6em] text-white" strokeWidth={1.8} />
                  </span>
                  <div className="ov-rise min-w-0 pt-[0.2em]" style={delay(600 + i * STEP_MS)}>
                    <div className="flex items-baseline gap-[0.5em]">
                      <span className="num-display text-[1.3em] text-[#AED083]">{s.n}</span>
                      <span className="font-[var(--font-display)] text-[1.5em] font-extrabold leading-tight text-white">{s.title}</span>
                    </div>
                    <p className="mt-[0.25em] max-w-[36em] text-[1.12em] leading-[1.35] text-white/80">{s.text}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Card>

      {fundingItems.length > 0 && <FundingCard items={fundingItems} call={fundingCall} wide={wide} website={website} />}
    </div>
  );
}
