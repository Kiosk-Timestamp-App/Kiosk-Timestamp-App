import { useCallback, useLayoutEffect, useRef } from 'react';
import { LogoMark } from '../../../design/primitives';
import { Layer } from './Layer';
import { ART } from './assets';
import { STAGE } from './artMeta';
import { AD_LINKS } from './links';
import { camTo, displayUrl, OUTRO_TIMING, targetUrl, useQrDataUrl, useSceneTimeline, useStageFit, type Timeline } from './hooks';

/* Wortlaut: TV-Seite oekovolt-fe-at.vercel.app/tv (Claim, Herkunft, „Angebot anfragen“, „Mit dem Handy scannen“) */
const CLAIM = ['Wir bauen, was wir', 'selbst betreiben würden.'];
const SUB = 'Photovoltaik aus Ostermiething für ganz Österreich. Seit 2012.';

function build(tl: Timeline) {
  tl.set('.o-cam', camTo(600, 1060, 1.18), 0)
    .to('.o-cam', { ...camTo(600, 1040, 1.3), duration: 8, ease: 'sine.out' }, 0)
    .fromTo('.o-shine', { x: 0 }, { x: 1900, duration: 1.6, ease: 'power2.inOut' }, 0.3)
    .fromTo('.o-logo', { autoAlpha: 0, scale: 0.7 }, { autoAlpha: 1, scale: 1, duration: 0.9, ease: 'back.out(1.8)' }, 0.1)
    .fromTo('.o-word', { yPercent: 110 }, { yPercent: 0, duration: 0.9, stagger: 0.06 }, 0.35)
    .fromTo('.o-sub', { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.8 }, 1.3)
    .fromTo('.o-qr', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, ease: 'none' }, 1.7)
    .fromTo('.o-qr', { y: 60, scale: 0.9 }, { y: 0, scale: 1, duration: 1 }, 1.7)
    .fromTo('.o-cta > *', { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.12 }, 2.0)
    // Lichtkante läuft über den RAHMEN des QR (nicht über den Code)
    .fromTo('.o-glint', { rotation: 0 }, { rotation: 360, duration: 2.2, ease: 'power1.inOut' }, 2.8);
}

/** Gemeinsames ÖKOVOLT-Outro nach dem letzten Spot: Marke, Claim, ein großer QR (zentral konfiguriert). */
export default function Outro({ playing, onDone, website }: { playing: boolean; onDone?: () => void; website: string | null }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const claimRef = useRef<HTMLDivElement>(null);
  useStageFit(stageRef, STAGE.w, STAGE.h);
  useLayoutEffect(() => {
    const c = claimRef.current;
    if (!c || !window.matchMedia('(orientation: portrait)').matches) return;
    let size = 8;
    c.style.fontSize = `${size}vmin`;
    while (size > 5 && [...c.querySelectorAll<HTMLElement>('.o-line')].some((l) => l.scrollWidth > c.clientWidth + 1)) {
      size -= 0.2;
      c.style.fontSize = `${size}vmin`;
    }
  }, []);
  const b = useCallback((tl: Timeline) => build(tl), []);
  useSceneTimeline(rootRef, b, playing, OUTRO_TIMING, onDone);
  const url = targetUrl(website, AD_LINKS.outro);
  const qr = useQrDataUrl(url);

  return (
    <div ref={rootRef} className="sc-root relative h-full w-full overflow-hidden rounded-[28px] border border-white/10 bg-[#071736] text-white">
      <div className="absolute inset-0 landscape:right-auto landscape:w-[64%]">
        <div className="absolute inset-0 overflow-hidden">
          <div ref={stageRef} className="absolute left-1/2 top-1/2" style={{ width: STAGE.w, height: STAGE.h, transform: 'translate(-50%, -50%)' }}>
            <div className="o-cam absolute left-0 top-0 h-[1600px] w-[1200px] origin-top-left will-change-transform">
              <Layer src={ART.sky} />
              <Layer src={ART.pNew} rect="p-new" />
              <div className="absolute left-0 top-[840px] h-[500px] w-[1200px] overflow-hidden">
                <div className="o-shine absolute top-0 h-full w-[260px] -skew-x-12 bg-gradient-to-r from-transparent via-[rgb(255_236_200/0.32)] to-transparent" style={{ left: -420 }} />
              </div>
            </div>
          </div>
        </div>
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[44%] bg-gradient-to-b from-[#071736]/92 via-[#071736]/55 to-transparent landscape:h-[16%] landscape:from-[#071736]" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-[#071736]/92 via-[#071736]/55 to-transparent landscape:h-[18%] landscape:from-[#071736]" />
        <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 hidden w-[34%] bg-gradient-to-l from-[#071736] via-[#071736]/60 to-transparent landscape:block" />
      </div>

      {/* Marke + Claim */}
      <div className="absolute inset-x-[6vmin] top-[6vmin] flex flex-col items-center text-center landscape:left-auto landscape:right-[4vmin] landscape:top-[6vmin] landscape:w-[38%] landscape:items-start landscape:text-left">
        <div className="o-logo">
          <LogoMark size={110} />
        </div>
        <div ref={claimRef} className="mt-[3vmin] w-full text-[8vmin] font-extrabold leading-[1.04] tracking-[-0.035em] landscape:text-[5.4vmin]" style={{ fontFamily: 'var(--font-display)' }}>
          {CLAIM.map((l, i) => (
            <span key={i} className="o-line block portrait:mx-auto portrait:w-max portrait:whitespace-nowrap">
              {l.split(' ').map((w, j) => (
                <span key={j} className="mr-[0.22em] inline-block overflow-hidden pb-[0.08em] align-top last:mr-0">
                  <span className={`o-word inline-block ${i === 1 ? 'text-gradient-sun' : ''}`}>{w}</span>
                </span>
              ))}
            </span>
          ))}
        </div>
        <p className="o-sub mt-[2vmin] max-w-[36em] text-[3vmin] [text-wrap:balance] font-medium text-[#e3e9f5] landscape:text-[2.5vmin]">{SUB}</p>
      </div>

      {/* QR (allgemeine Anfrage) */}
      <div className="absolute inset-x-[6vmin] bottom-[7vmin] flex items-center justify-center gap-[4vmin] landscape:inset-x-auto landscape:bottom-[7vmin] landscape:right-[4vmin] landscape:w-[38%] landscape:justify-start">
        {url && (
          <div className="o-qr relative size-[30vmin] shrink-0 landscape:size-[26vmin]">
            {/* rotierende Lichtkante NUR auf dem Rahmen */}
            <div className="absolute -inset-[1vmin] overflow-hidden rounded-[3.4vmin]">
              <div className="o-glint absolute -inset-[60%] bg-[conic-gradient(from_0deg,transparent_0_70%,rgb(255_220_150/0.95)_80%,transparent_90%)]" />
            </div>
            <div className="absolute inset-0 grid place-items-center rounded-[2.6vmin] bg-white p-[1.6vmin] shadow-[0_30px_80px_-24px_rgb(0_0_0/0.8)]">
              {qr && <img src={qr} alt="" className="size-full [image-rendering:pixelated]" />}
            </div>
          </div>
        )}
        <div className="o-cta min-w-0">
          {url && <div className="text-[2.8vmin] font-semibold text-[#aed083]">Mit dem Handy scannen</div>}
          <div className="mt-[0.2em] text-[5.4vmin] font-extrabold leading-[1.05] tracking-[-0.03em] landscape:text-[4.4vmin]" style={{ fontFamily: 'var(--font-display)' }}>
            Angebot anfragen
          </div>
          {url && <div className="mt-[0.4em] text-[2.8vmin] font-semibold text-[#8cba58]">{displayUrl(url)}</div>}
        </div>
      </div>
    </div>
  );
}
