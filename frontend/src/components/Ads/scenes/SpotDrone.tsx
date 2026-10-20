import { Spot, type SpotCopy } from './Spot';
import { Layer } from './Layer';
import { ART } from './assets';
import { DRONE, RECT } from './artMeta';
import { camTo, type Timeline } from './hooks';

/* Wortlaut: oekovolt-fe-at.vercel.app/service/drohneninspektion · TV-Seite („Auffällige Zelle …“) */
const COPY: SpotCopy = {
  eyebrow: 'Drohneninspektion · IEC TS 62446-3',
  hook: ['Drohnen-', 'Thermografie'],
  caption: 'Hotspots, defekte Bypassdioden, PID und ausgefallene Strings werden sichtbar.',
  benefit: ['Fehler finden,', 'bevor sie Ertrag kosten.'],
};

const [HX, HY] = DRONE.hot;
const ROW = DRONE.rowY;
const TH = RECT['d-thermal'];
const X0 = 440; // Start der Drohne (Linse bleibt im Wärmebild-Streifen)
const DY = HY - 300;
const LENS = 240;
const MOTORS: [number, number][] = [
  [56, 50],
  [344, 50],
  [69, 155],
  [331, 155],
];

function Stage() {
  return (
    <div className="d-cam absolute left-0 top-0 h-[1600px] w-[1200px] origin-top-left will-change-transform">
      <Layer src={ART.sky} />
      <Layer src={ART.dField} rect="d-field" />
      {/* Schatten der Drohne (Sonne tief rechts → lang nach links) */}
      <div className="d-follow absolute rounded-[50%] bg-[radial-gradient(closest-side,rgb(8_14_10/0.55),transparent)]" style={{ left: X0 - 330, top: ROW + 30, width: 300, height: 70 }} />
      {/* Wärmebild-Linse: Rahmen und Inhalt gegenläufig (nur Transformationen) */}
      <div className="d-follow d-lens absolute overflow-hidden rounded-full" style={{ left: X0 - LENS / 2, top: ROW - LENS / 2, width: LENS, height: LENS }}>
        <img src={ART.dThermal} alt="" className="d-lens-img absolute max-w-none" style={{ left: TH.x - (X0 - LENS / 2), top: TH.y - (ROW - LENS / 2), width: TH.w, height: TH.h }} />
      </div>
      <div className="d-follow d-ring absolute rounded-full border-[5px] border-white/95 shadow-[0_0_30px_rgb(255_214_150/0.6),inset_0_0_22px_rgb(255_214_150/0.35)]" style={{ left: X0 - LENS / 2, top: ROW - LENS / 2, width: LENS, height: LENS }} />
      <div className="d-bloom absolute rounded-full bg-[radial-gradient(closest-side,rgb(255_226_150/0.9),rgb(255_140_60/0.35)_40%,transparent)] opacity-0" style={{ left: HX - 110, top: HY - 110, width: 220, height: 220 }} />
      <div className="d-hotring absolute rounded-full border-[6px] border-[#ffd873] opacity-0" style={{ left: HX - 46, top: HY - 46, width: 92, height: 92 }} />
      <img src={ART.dBeam} alt="" className="d-follow d-beam absolute max-w-none opacity-0" style={{ left: X0 - 125, top: DY + 120, width: 250, height: ROW - DY - 120 }} />
      <div className="d-follow d-drone absolute" style={{ left: X0 - 200, top: DY - 40, width: 400, height: 225 }}>
        <div className="d-bob absolute inset-0">
          <img src={ART.dDrone} alt="" className="absolute inset-0 size-full" />
          {MOTORS.map(([x, y], i) => (
            <div key={i} className="absolute" style={{ left: x - 92, top: y - 92, width: 184, height: 184, transform: 'scaleY(0.34)' }}>
              <img src={ART.dRotor} alt="" className="d-rotor absolute inset-0 size-full" style={{ transform: `rotate(${i * 47}deg)` }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Pilot (Mensch) und Beschriftung außerhalb der Kamera – bleiben scharf und lesbar */
function Overlay() {
  return (
    <>
      <img src={ART.hPilot} alt="" className="d-pilot pointer-events-none absolute bottom-0 left-[1%] h-[42%] w-auto max-w-none landscape:h-[58%]" />
      <div className="d-label pointer-events-none absolute inset-x-0 top-[67%] flex justify-center opacity-0 landscape:top-[70%]">
        <div className="rounded-[2.4vmin] bg-[#071736]/75 px-[3vmin] py-[1.4vmin] text-center shadow-[0_16px_40px_-14px_rgb(0_0_0/0.7)]">
          <div className="text-[4vmin] font-extrabold leading-tight tracking-[-0.02em] text-white" style={{ fontFamily: 'var(--font-display)' }}>
            Auffällige Zelle
          </div>
          <div className="text-[2.8vmin] text-[#e3e9f5]">nur im Wärmebild sichtbar</div>
        </div>
      </div>
    </>
  );
}

function build(tl: Timeline) {
  const dx = HX - X0;
  tl.set('.d-cam', camTo(X0 + 60, ROW - 140, 1.32), 0)
    .to('.d-cam', { ...camTo(HX, ROW - 140, 1.2), duration: 5.1, ease: 'power2.inOut' }, 0)
    .fromTo('.d-follow', { x: -40 }, { x: dx, duration: 5.1, ease: 'power2.inOut' }, 0)
    .fromTo('.d-lens-img', { x: 40 }, { x: -dx, duration: 5.1, ease: 'power2.inOut' }, 0)
    .fromTo('.d-drone', { rotation: -7 }, { rotation: 6, duration: 4.6, ease: 'sine.inOut' }, 0.2)
    .to('.d-drone', { rotation: 0, duration: 0.6, ease: 'power2.out' }, 4.8)
    .to('.d-rotor', { rotation: '+=360', duration: 0.22, repeat: 26, ease: 'none' }, 0)
    .to('.d-bob', { y: -8, duration: 0.8, yoyo: true, repeat: 5, ease: 'sine.inOut' }, 0)
    .fromTo('.d-beam', { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power2.out' }, 0.4)
    .fromTo('.d-lens', { opacity: 0 }, { opacity: 1, duration: 0.6, ease: 'power2.out' }, 0.5)
    .fromTo('.d-ring', { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.9 }, 0.5)
    // Mensch: der Pilot steuert (Vordergrund, leises Atmen)
    .fromTo('.d-pilot', { xPercent: -14, opacity: 0 }, { xPercent: 0, opacity: 1, duration: 1.2 }, 0)
    .to('.d-pilot', { y: -6, duration: 1.6, yoyo: true, repeat: 3, ease: 'sine.inOut' }, 1.2)
    // HÖHEPUNKT: Fund blitzt auf, Crash-Zoom, Drohne zieht aus dem Bild
    .fromTo('.d-bloom', { opacity: 0, scale: 0.3 }, { opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(2.2)' }, 5.15)
    .fromTo('.d-hotring', { opacity: 1, scale: 0.5 }, { opacity: 0, scale: 3.2, duration: 1, ease: 'power2.out', immediateRender: false }, 5.2)
    .to('.d-ring', { borderColor: '#ffb347', duration: 0.3 }, 5.2)
    .to('.d-cam', { ...camTo(HX, HY, 2.15), duration: 0.75, ease: 'expo.inOut' }, 5.3)
    .to('.d-drone', { x: dx + 320, y: -560, rotation: -14, duration: 0.9, ease: 'power3.in' }, 5.3)
    .to('.d-beam', { opacity: 0, duration: 0.3 }, 5.3)
    .fromTo('.d-label', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.9 }, 7.3)
    .to('.d-bloom', { scale: 1.15, opacity: 0.75, duration: 1.1, yoyo: true, repeat: 3, ease: 'sine.inOut' }, 6.2)
    .to('.d-cam', { ...camTo(HX, HY, 2.3), duration: 5.5, ease: 'sine.inOut' }, 6.1);
}

export default function SpotDrone(p: { playing: boolean; onDone?: () => void }) {
  return <Spot copy={COPY} capSide="right" note="Schematische Darstellung einer Drohnen-Thermografie" stage={<Stage />} overlay={<Overlay />} build={build} {...p} />;
}
