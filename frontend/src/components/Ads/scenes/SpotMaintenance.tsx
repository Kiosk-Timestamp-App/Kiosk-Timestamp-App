import { Spot, type SpotCopy } from './Spot';
import { Layer } from './Layer';
import { ART } from './assets';
import { HALL_CABLE, HALL_INV } from './artMeta';
import { camTo, type Timeline } from './hooks';

/* Wortlaut: oekovolt-fe-at.vercel.app/service/wartung (H1, Kernsatz, Titel „Sechs Gründe“, Paket-Hinweis) */
const COPY: SpotCopy = {
  eyebrow: 'Wartung · Betriebsführung (O&M)',
  hook: ['PV-Wartung mit', 'Wartungsvertrag'],
  caption: 'Eine Photovoltaikanlage ist wartungsarm, aber nicht wartungsfrei.',
  benefit: ['Sicherheit & Prüfpflicht', 'Ertrag & Verfügbarkeit', 'Werterhalt & Nachweise'],
};

const DISP = { x: HALL_INV.x + 18, y: HALL_INV.y + 22, w: HALL_INV.w - 36, h: 86 };
const DC: [number, number] = [DISP.x + DISP.w / 2, DISP.y + DISP.h / 2 + 40];

function Stage() {
  return (
    <div className="w-shake absolute inset-0">
      <div className="w-cam absolute left-0 top-0 h-[1600px] w-[1200px] origin-top-left will-change-transform">
        <Layer src={ART.sky} />
        <Layer src={ART.wHall} rect="w-hall" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="w-pulse absolute left-0 top-0 size-[24px] rounded-full bg-[radial-gradient(circle,#fff7d6,#ffd873_45%,rgb(245_167_15/0)_72%)] opacity-0" />
        ))}
        <div className="absolute overflow-hidden rounded-[6px]" style={{ left: DISP.x, top: DISP.y, width: DISP.w, height: DISP.h }}>
          <div className="w-glow absolute inset-0 bg-[radial-gradient(circle_at_50%_60%,rgb(140_186_88/0.45),transparent_70%)] opacity-0" />
          <svg viewBox="0 0 114 86" className="absolute inset-0 size-full">
            <path className="w-wave" d="M6 40 C 16 14, 26 14, 36 40 S 56 66, 66 40 S 86 14, 96 40 S 106 52, 110 46" stroke="#8cba58" strokeWidth="3.4" fill="none" strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset="1" />
            {[0, 1, 2].map((i) => (
              <g key={i} transform={`translate(${24 + i * 33} 72)`}>
                <g className={`w-check w-check-${i}`}>
                  <circle r="8" fill="#669933" />
                  <path d="M-4 0 l3 3 l5 -6" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </g>
              </g>
            ))}
          </svg>
        </div>
      </div>
      {/* Prüfbefund: Dokument + Häkchen-Stempel (neutral, kein Zertifikatszeichen) */}
      <div className="w-report absolute opacity-0" style={{ left: 600 - 200, top: 760 - 254, width: 400, height: 508 }}>
        <img src={ART.wReport} alt="" className="absolute inset-0 size-full" />
        <div className="absolute left-[7%] right-[10%] top-[3.6%] text-[40px] font-extrabold tracking-[-0.01em] text-white" style={{ fontFamily: 'var(--font-display)' }}>
          Prüfbefund
        </div>
        <img src={ART.wStamp} alt="" className="w-stamp absolute opacity-0" style={{ left: 190, top: 250, width: 200, height: 200 }} />
      </div>
      <div className="w-ring absolute rounded-full border-[8px] border-[#aed083] opacity-0" style={{ left: 600 + 90 - 150, top: 760 + 96 - 150, width: 300, height: 300 }} />
    </div>
  );
}

function Overlay() {
  return (
    <>
      <img src={ART.hTablet} alt="" className="w-hands pointer-events-none absolute bottom-0 right-0 h-[36%] w-auto max-w-none opacity-0 landscape:h-[52%]" />
      <div className="w-fine pointer-events-none absolute inset-x-[8%] top-[71%] text-center text-[2.6vmin] leading-snug text-white opacity-0 [text-shadow:0_2px_14px_rgb(4_16_42/0.9)] landscape:top-[89%]">
        Die Prüfung nach OVE E 8101 mit Prüfbefund ist Teil der Pakete Plus und Premium.
      </div>
    </>
  );
}

function build(tl: Timeline) {
  tl.set('.w-cam', camTo(640, 1000, 1.18), 0)
    .to('.w-cam', { ...camTo(680, 1000, 1.28), duration: 3, ease: 'sine.inOut' }, 0)
    .set('.w-pulse', { xPercent: -50, yPercent: -50 }, 0)
    .to('.w-pulse', { opacity: 1, duration: 0.2, stagger: 0.45 }, 0.3)
    .to('.w-pulse', { motionPath: { path: HALL_CABLE }, duration: 1.3, ease: 'power1.in', repeat: 3, stagger: 0.45 }, 0.3)
    .to('.w-pulse', { opacity: 0, duration: 0.3 }, 6.0)
    // SIGNATUR: Kamera fährt ans Display; die Hände des Technikers kommen ins Bild
    .to('.w-cam', { ...camTo(DC[0], DC[1], 2.5), duration: 1.5, ease: 'expo.inOut' }, 2.8)
    .fromTo('.w-hands', { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.1 }, 3.2)
    .to('.w-hands', { y: -10, duration: 1.4, yoyo: true, repeat: 1, ease: 'sine.inOut' }, 4.3)
    .to('.w-wave', { strokeDashoffset: 0, duration: 1.2, ease: 'power2.out' }, 3.9)
    .to('.w-glow', { opacity: 1, duration: 0.6 }, 4.1);
  [4.4, 4.9, 5.4].forEach((t, i) => tl.fromTo(`.w-check-${i}`, { scale: 0, opacity: 0, transformOrigin: '50% 50%' }, { scale: 1, opacity: 1, duration: 0.5 }, t));
  // HÖHEPUNKT: Prüfbefund kommt, Häkchen wird gestempelt (einziger Überschwinger)
  tl.to('.w-hands', { yPercent: 45, opacity: 0, duration: 0.6, ease: 'power2.in' }, 6.0)
    .fromTo('.w-report', { opacity: 0, y: 60, rotation: -4 }, { opacity: 1, y: 0, rotation: -2, duration: 0.8 }, 6.2)
    .fromTo('.w-stamp', { opacity: 0, scale: 2.6 }, { opacity: 1, scale: 1, duration: 0.3, ease: 'power4.in' }, 6.9)
    .to('.w-stamp', { scale: 1, duration: 0.45, ease: 'back.out(3)' }, 7.2)
    .fromTo('.w-ring', { opacity: 0.9, scale: 0.6 }, { opacity: 0, scale: 1.8, duration: 0.8, ease: 'power2.out', immediateRender: false }, 7.2)
    .fromTo('.w-shake', { x: 0, y: 0 }, { x: 8, y: -6, duration: 0.05, yoyo: true, repeat: 5, ease: 'none' }, 7.2)
    .fromTo('.w-fine', { opacity: 0 }, { opacity: 1, duration: 0.8 }, 7.6)
    .to('.w-cam', { ...camTo(DC[0], DC[1] - 20, 2.35), duration: 4.6, ease: 'sine.inOut' }, 7.3);
}

export default function SpotMaintenance(p: { playing: boolean; onDone?: () => void }) {
  return <Spot copy={COPY} note="Schematische Darstellung" stage={<Stage />} overlay={<Overlay />} build={build} {...p} />;
}
