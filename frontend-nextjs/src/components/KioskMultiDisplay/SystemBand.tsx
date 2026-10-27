import { MapPin } from 'lucide-react';
import { tr, useNow } from '../../design/hooks';

import { intervalMsOf, type SystemConfiguration } from './systems';

const two = (n: number) => String(n).padStart(2, '0');
const mmss = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${two(s % 60)}`;
};

/** Countdown bis zur nächsten Anlage (eigene Komponente, damit nur sie sekündlich rendert) */
function NextUp({ name, endsAt, active, language }: { name: string; endsAt: number; active: boolean; language: string | null }) {
  const now = useNow(1000).getTime();
  const left = Math.max(0, endsAt - now);
  return (
    <div className="flex items-baseline gap-[0.5em] whitespace-nowrap text-[0.95em] text-white/70">
      <span className="text-[0.9em] font-semibold text-white/65">{tr(language, { DE: 'Als Nächstes', EN: 'Up next', IT: 'Prossimo', FR: 'Ensuite', SQ: 'Në vijim' })}</span>
      <span className="max-w-[16em] truncate font-semibold text-white/90">{name}</span>
      {active && (
        <span className="num-display tabular min-w-[2.6em] text-right text-[1.05em] text-[#aed083]" aria-label={`in ${mmss(left)}`}>
          {mmss(left)}
        </span>
      )}
    </div>
  );
}

/**
 * Anlagen-Band über der Bühne: Nummer, Name/Ort, Pager mit Fortschritt je Anlage
 * (Länge = `interval` der Anlage) und Countdown zur nächsten.
 */
export function SystemBand({
  configurations,
  current,
  startedAt,
  active,
  language,
  hideName = false,
}: {
  configurations: SystemConfiguration[];
  current: number;
  startedAt: number;
  active: boolean;
  language: string | null;
  /** Name ausblenden, solange die Titelkarte des Wechsels darüber liegt (keine Doppelung) */
  hideName?: boolean;
}) {
  const count = configurations.length;
  const config = configurations[current];
  const next = configurations[(current + 1) % count];
  const ms = intervalMsOf(config);
  const segW = `${Math.max(1.6, Math.min(5.5, 26 / count))}em`;

  return (
    <div className="ov-glass relative flex items-center gap-[1.4em] overflow-hidden rounded-[28px] px-[1.6em] py-[0.95em]">
      {/* Anlagennummer */}
      <div className="num-display flex shrink-0 items-baseline leading-none" aria-label={`${current + 1} / ${count}`}>
        <span key={current} className="ov-rise ov-text-brand text-[2.9em]">
          {two(current + 1)}
        </span>
        <span className="ml-[0.15em] text-[1.25em] text-white/60">/{two(count)}</span>
      </div>

      <span className="h-[3.4em] w-px shrink-0 bg-gradient-to-b from-transparent via-white/20 to-transparent" />

      {/* Name & Ort */}
      <div className="min-w-0 flex-1 transition-opacity duration-500" style={{ opacity: hideName ? 0 : 1 }}>
        {/* Ort als eigene Zeile über dem Namen – der Name steht nur hier (Kopfzeile wiederholt ihn nicht) */}
        <div className="flex min-w-0 items-center gap-[0.4em] text-[0.95em] font-semibold text-white/70">
          <MapPin className="size-[1em] shrink-0 text-[#ffd873]" strokeWidth={2.4} aria-hidden />
          <span className="truncate">
            {config.place || tr(language, { DE: 'Referenzanlage', EN: 'Reference system', IT: 'Impianto di riferimento', FR: 'Installation de référence', SQ: 'Sistem referues' })}
          </span>
        </div>
        <div
          key={`t-${current}`}
          className={`ov-rise mt-[0.2em] line-clamp-2 font-extrabold leading-[1.12] tracking-[-0.02em] text-white ${config.company_name.length > 30 ? 'text-[1.4em]' : 'text-[1.75em]'}`}
          style={{ ['--d' as string]: '80ms', fontFamily: 'var(--font-display)' }}
          title={config.company_name}
        >
          {config.company_name}
        </div>
      </div>

      {/* Pager */}
      {count > 1 && (
        <div className="flex shrink-0 flex-col items-end gap-[0.7em]">
          <div className="flex items-center gap-[0.45em]" role="list">
            {configurations.map((c, i) => {
              const state = i < current ? 'done' : i === current ? 'now' : 'todo';
              return (
                <div key={`${c.name}-${i}`} role="listitem" aria-current={state === 'now' ? 'true' : undefined} className="flex flex-col items-center gap-[0.35em]" style={{ width: segW }}>
                  <div className="ov-well relative h-[0.5em] w-full overflow-hidden rounded-full">
                    {state === 'done' && <div className="absolute inset-0 rounded-full bg-white/45" />}
                    {state === 'now' && (
                      <div
                        key={`${current}-${startedAt}`}
                        className="absolute inset-0 origin-left rounded-full bg-[linear-gradient(90deg,#669933,#aed083_70%,#ffd873)] shadow-[0_0_10px_rgba(174,208,131,0.7)]"
                        style={{ animation: `ov-progress ${ms}ms linear both`, animationPlayState: active ? 'running' : 'paused' }}
                      />
                    )}
                  </div>
                  <span className={`num-display text-[0.9em] leading-none ${state === 'now' ? 'text-white' : 'text-white/60'}`}>{two(i + 1)}</span>
                </div>
              );
            })}
          </div>
          <NextUp name={next.company_name} endsAt={startedAt + ms} active={active} language={language} />
        </div>
      )}
    </div>
  );
}
