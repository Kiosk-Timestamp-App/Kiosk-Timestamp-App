import { useCallback, useLayoutEffect, useRef, type ReactNode } from 'react';
import { SPOT_TIMING, useSceneTimeline, useStageFit, type Timeline } from './hooks';
import { STAGE } from './artMeta';

export interface SpotCopy {
  eyebrow: string;
  /** Hook: die Leistung, zwei Zeilen */
  hook: [string, string];
  /** Beweis-Satz (Website), läuft 2–7 s */
  caption: string;
  /** Nutzen-Satz (Website) als kinetische Typo zum Höhepunkt – eine Zeile je Eintrag */
  benefit: string[];
}

const PAYOFF = 7.0;

/** Gemeinsame Typo-Beats: Hook steigt auf · Beweis · Hook weicht, Nutzen-Satz schlägt ein */
function typeBeats(tl: Timeline) {
  tl.fromTo('.sc-eyebrow-line', { scaleX: 0, transformOrigin: '0% 50%' }, { scaleX: 1, duration: 0.7 }, 0.1)
    .fromTo('.sc-eyebrow-text', { autoAlpha: 0, x: -24 }, { autoAlpha: 1, x: 0, duration: 0.6 }, 0.2)
    .fromTo('.sc-hook .sc-word', { yPercent: 108 }, { yPercent: 0, duration: 0.95, stagger: 0.07 }, 0.12)
    .fromTo('.sc-benefit .sc-word', { yPercent: 112, rotation: 2 }, { yPercent: 112, rotation: 2, duration: 0.01 }, 0)
    .fromTo('.sc-benefit-bar', { scaleX: 0, transformOrigin: '0% 50%' }, { scaleX: 0, duration: 0.01 }, 0)
    .fromTo('.sc-cap', { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 0.8 }, 2.0)
    .fromTo('.sc-note', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6 }, 2.4)
    .to('.sc-cap', { autoAlpha: 0, y: -14, duration: 0.45, ease: 'power2.in' }, PAYOFF - 0.4)
    .to('.sc-hook .sc-word', { yPercent: -110, duration: 0.45, stagger: 0.025, ease: 'power3.in' }, PAYOFF - 0.35)
    .to('.sc-benefit .sc-word', { yPercent: 0, rotation: 0, duration: 0.9, stagger: 0.06 }, PAYOFF + 0.1)
    .to('.sc-benefit-bar', { scaleX: 1, duration: 0.9 }, PAYOFF + 0.7);
}

const isPortrait = () => typeof window !== 'undefined' && window.matchMedia('(orientation: portrait)').matches;

const Words = ({ text, accent = false }: { text: string; accent?: boolean }) => (
  <>
    {text.split(' ').map((w, i) => (
      <span key={i} className="mr-[0.22em] inline-block overflow-hidden pb-[0.08em] align-top">
        <span className={`sc-word inline-block ${accent ? 'text-gradient-sun' : ''}`}>{w}</span>
      </span>
    ))}
  </>
);

/**
 * Spot-Bühne, Hochformat zuerst: Illustration vollflächig (weiche Scrims statt Kanten), oben Hook → Nutzen-Satz,
 * unten der Beweis-Satz. Endet auf einem plakatreifen Heldenbild; der QR kommt im gemeinsamen Outro.
 */
export function Spot({
  copy,
  capSide = 'left',
  note,
  stage,
  overlay,
  build,
  playing,
  onDone,
}: {
  copy: SpotCopy;
  capSide?: 'left' | 'right';
  note: string;
  stage: ReactNode;
  /** Vordergrund (Menschen) im Illustrationsrahmen, nicht von der Kamera erfasst */
  overlay?: ReactNode;
  build: (tl: Timeline, root: HTMLElement) => void;
  playing: boolean;
  onDone?: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  useStageFit(stageRef, STAGE.w, STAGE.h);

  // Hochformat: Zeilen so groß wie möglich und einzeilig (einmalige Messung)
  useLayoutEffect(() => {
    const h = headRef.current;
    if (!h || !isPortrait()) return;
    h.querySelectorAll<HTMLElement>('.sc-fit').forEach((block) => {
      const max = Number(block.dataset.max ?? 8.6);
      const lines = [...block.querySelectorAll<HTMLElement>('.sc-line')];
      let size = max;
      block.style.fontSize = `${size}vmin`;
      while (size > 5 && lines.some((l) => l.scrollWidth > h.clientWidth + 1)) {
        size -= 0.2;
        block.style.fontSize = `${size}vmin`;
      }
    });
  }, []);

  const all = useCallback(
    (tl: Timeline, root: HTMLElement) => {
      build(tl, root);
      typeBeats(tl);
    },
    [build],
  );
  useSceneTimeline(rootRef, all, playing, SPOT_TIMING, onDone);

  return (
    <div ref={rootRef} className="sc-root relative h-full w-full overflow-hidden rounded-[28px] border border-white/10 bg-[#071736] text-white">
      {/* Illustration */}
      <div className="sc-art absolute inset-0 landscape:right-auto landscape:w-[68%]">
        <div className="absolute inset-0 overflow-hidden">
          <div ref={stageRef} className="sc-stage absolute left-1/2 top-1/2" style={{ width: STAGE.w, height: STAGE.h, transform: 'translate(-50%, -50%)' }}>
            {stage}
          </div>
        </div>
        {overlay}
        {/* weiche Scrims: Lesbarkeit oben/unten, Übergang in die Textspalte im Querformat */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[34%] bg-gradient-to-b from-[#071736]/90 via-[#071736]/45 to-transparent landscape:h-[16%] landscape:from-[#071736]" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[30%] bg-gradient-to-t from-[#071736]/85 via-[#071736]/35 to-transparent landscape:h-[18%] landscape:from-[#071736]" />
        <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 hidden w-[34%] bg-gradient-to-l from-[#071736] via-[#071736]/60 to-transparent landscape:block" />
      </div>

      {/* Hook → Nutzen-Satz */}
      <div ref={headRef} className="sc-head absolute inset-x-[5vmin] top-[4.2vmin] landscape:left-auto landscape:right-[4vmin] landscape:top-[7vmin] landscape:w-[34%]">
        <div className="flex items-center gap-[0.7em] whitespace-nowrap text-[2.8vmin] font-semibold text-[#aed083] landscape:text-[2.3vmin]">
          <span className="sc-eyebrow-line h-[0.14em] w-[2.2em] shrink-0 rounded-full bg-[#8cba58]" />
          <span className="sc-eyebrow-text">{copy.eyebrow}</span>
        </div>
        <div className="mt-[0.45em] grid" style={{ fontFamily: 'var(--font-display)' }}>
          <h2 className="sc-hook sc-fit text-[8.6vmin] font-extrabold leading-[1.02] tracking-[-0.035em] [grid-area:1/1] landscape:text-[6.8vmin]" data-max="8.6">
            {copy.hook.map((l, i) => (
              <span key={i} className="sc-line portrait:block portrait:w-max portrait:whitespace-nowrap">
                <Words text={l} />{' '}
              </span>
            ))}
          </h2>
          <div className="sc-benefit sc-fit text-[7.4vmin] font-extrabold leading-[1.04] tracking-[-0.035em] [grid-area:1/1] landscape:text-[5.8vmin]" data-max="7.4">
            {copy.benefit.map((l, i) => (
              <span key={i} className="sc-line block portrait:w-max portrait:whitespace-nowrap">
                <Words text={l} accent={i === copy.benefit.length - 1} />
              </span>
            ))}
            <span className="sc-benefit-bar mt-[0.35em] block h-[0.08em] w-[3.2em] rounded-full bg-[linear-gradient(90deg,#8cba58,#ffd873)]" />
          </div>
        </div>
      </div>

      {/* Beweis-Satz */}
      <p
        className={`sc-cap absolute bottom-[7vmin] w-[64%] text-[3.4vmin] font-medium leading-[1.3] text-white [text-shadow:0_2px_18px_rgb(4_16_42/0.9)] [text-wrap:balance] ${capSide === 'left' ? 'left-[5vmin]' : 'right-[5vmin] text-right'} landscape:left-auto landscape:right-[4vmin] landscape:bottom-[9vmin] landscape:w-[34%] landscape:text-left landscape:text-[2.9vmin]`}
      >
        {copy.caption}
      </p>

      <div className="sc-note absolute bottom-[2.2vmin] right-[3vmin] rounded-full bg-[#071736]/60 px-[0.8em] py-[0.25em] text-[2.6vmin] text-white/70">{note}</div>
    </div>
  );
}
