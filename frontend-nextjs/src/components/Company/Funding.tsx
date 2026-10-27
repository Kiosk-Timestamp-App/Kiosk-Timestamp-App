import type { CSSProperties } from 'react';
import { CalendarClock, Landmark } from 'lucide-react';
import { FUNDING } from './facts';
import { QrCode } from './QrCode';
import { useQrTarget } from './useCompanyHooks';
import { Card, StandNote } from './ui';

/** Zustand des Fördercalls: vor Beginn, laufend oder (null) vorbei */
export type FundingCallState = 'upcoming' | 'running' | null;

function CallPill({ state }: { state: Exclude<FundingCallState, null> }) {
  if (state === 'upcoming') {
    return (
      <span className="glass-pill inline-flex items-center gap-[0.55em] rounded-full px-[1em] py-[0.5em] text-[1.05em] font-semibold text-white/90">
        <CalendarClock className="size-[1.15em] text-[#FFD873]" strokeWidth={2} />
        {FUNDING.call.upcoming}
      </span>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-x-[0.55em] gap-y-[0.2em] rounded-[16px] border border-[#FFD873]/45 bg-[#F5A70F]/14 px-[1em] py-[0.55em] text-[1.08em]">
      <span className="live-dot !bg-[#FFD873]" />
      <span className="font-bold text-[#FFE7A3]">{FUNDING.call.running.lead}</span>
      <span className="font-semibold text-white">{FUNDING.call.running.text}</span>
    </span>
  );
}

/** Förderhinweis 2026 – zeitgebundene Zeilen verschwinden nach ihrem Ablauf; QR zum Förder-Check (nur wenn die Seite existiert) */
export function FundingCard({ items, call, wide, website }: { items: typeof FUNDING.items; call: FundingCallState; wide: boolean; website: string | null }) {
  const target = useQrTarget('foerdercheck', website);
  return (
    <Card className={`shrink-0 ${wide ? 'p-[1.3em_2em]' : 'p-[1.4em_2.2em]'}`} style={{ '--rd': '160ms' } as CSSProperties}>
      <div className="flex flex-wrap items-center justify-between gap-x-[1.2em] gap-y-[0.6em]">
      <div className="flex items-center gap-[0.8em]">
        <span className="grid size-[2.4em] place-items-center rounded-[0.8em] border border-[#FFD873]/35 bg-[#F5A70F]/12">
          <Landmark className="size-[1.25em] text-[#FFD873]" strokeWidth={1.8} />
        </span>
        <div>
          <div className="eyebrow !text-[#FFD873]">{FUNDING.eyebrow}</div>
          <StandNote className="mt-[0.1em]">
            {FUNDING.stand} · {FUNDING.disclaimer}
          </StandNote>
        </div>
      </div>
      {call && wide && <CallPill state={call} />}
      </div>
      {call && !wide && (
        <div className="mt-[0.9em]">
          <CallPill state={call} />
        </div>
      )}
      <div className={`mt-[0.8em] grid items-center gap-[1.6em] ${target ? 'grid-cols-[1fr_auto]' : 'grid-cols-1'}`}>
        <div className={`grid gap-[1.2em] ${items.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {items.map((it) => (
            <div key={it.key} className="min-w-0">
              <div className="text-[1.1em] font-semibold text-white/80">{it.title}</div>
              <div className={`num-display mt-[0.1em] whitespace-nowrap leading-none text-gradient-sun ${wide ? 'text-[2.2em]' : 'text-[2.2em]'}`}>{it.value}</div>
              <p className="mt-[0.35em] text-[1.08em] leading-snug text-white/75">{it.text}</p>
            </div>
          ))}
        </div>
        {target && (
          <div className="flex w-[9.6em] flex-col items-center text-center">
            <span className="rounded-[14px] bg-white p-[0.35em]">
              <QrCode value={target} label="QR-Code: Förder-Check" className={`block ${wide ? 'size-[6.6em]' : 'size-[8em]'}`} />
            </span>
            <span className="mt-[0.5em] text-[0.95em] font-bold leading-tight text-[#AED083]">{FUNDING.more}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
