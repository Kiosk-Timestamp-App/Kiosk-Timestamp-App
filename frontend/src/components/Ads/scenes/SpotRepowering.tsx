import { Spot, type SpotCopy } from './Spot';
import { Layer } from './Layer';
import { ART } from './assets';
import { camTo, type Timeline } from './hooks';

/* Wortlaut: oekovolt-fe-at.vercel.app/service/repowering */
const COPY: SpotCopy = {
  eyebrow: 'Repowering · Erweiterung · Speicher',
  hook: ['Bestandsanlage,', 'neue Leistung.'],
  caption: 'Wir prüfen Ihre Anlage und rechnen Tausch, Erweiterung und Speicher ehrlich durch.',
  benefit: ['Deutlich mehr Leistung', 'auf derselben Fläche.'],
};

const X0 = -80;
const X1 = 1290;

function Stage() {
  return (
    <div className="p-cam absolute left-0 top-0 h-[1600px] w-[1200px] origin-top-left will-change-transform">
      <Layer src={ART.sky} />
      <Layer src={ART.pNew} rect="p-new" />
      {/* Split-Wipe: rechts der Kante liegt noch der Bestand */}
      <div className="p-win absolute left-0 top-[830px] h-[520px] w-[1300px] overflow-hidden">
        <img src={ART.pOld} alt="" className="p-old absolute left-0 top-0 h-[520px] w-[1200px] max-w-none" />
      </div>
      <div className="p-edge absolute left-0 top-[830px] h-[520px] w-0">
        <div className="absolute -left-[70px] top-0 h-full w-[140px] bg-[radial-gradient(closest-side,rgb(255_220_160/0.6),transparent)]" />
        <div className="absolute -left-[3px] top-0 h-full w-[6px] rounded-full bg-white shadow-[0_0_24px_8px_rgb(255_210_140/0.8)]" />
      </div>
      <div className="absolute left-0 top-[840px] h-[500px] w-[1200px] overflow-hidden">
        <div className="p-shine absolute top-0 h-full w-[220px] -skew-x-12 bg-gradient-to-r from-transparent via-[rgb(255_236_200/0.3)] to-transparent" style={{ left: -420 }} />
      </div>
    </div>
  );
}

function Overlay() {
  return <img src={ART.hPhone} alt="" className="p-phone pointer-events-none absolute bottom-0 right-[3%] h-[42%] w-auto max-w-none opacity-0 landscape:h-[58%]" />;
}

function build(tl: Timeline) {
  const Z = window.matchMedia('(orientation: portrait)').matches ? 1.3 : 1.05;
  tl.set('.p-cam', camTo(600, 1080, 1.12 * Z), 0)
    .to('.p-cam', { ...camTo(600, 1090, 1.02 * Z), duration: 5, ease: 'sine.inOut' }, 0)
    // SIGNATUR: Split-Wipe alt → neu
    .fromTo(['.p-win', '.p-edge'], { x: X0 }, { x: X1, duration: 2.6, ease: 'power2.inOut' }, 1.3)
    .fromTo('.p-old', { x: -X0 }, { x: -X1, duration: 2.6, ease: 'power2.inOut' }, 1.3)
    .to('.p-edge', { opacity: 0, duration: 0.3 }, 3.9)
    .fromTo('.p-shine', { x: 0 }, { x: 1900, duration: 1.3, ease: 'power2.inOut' }, 4.1)
    // Mensch: der Betreiber prüft die Anlage auf dem Handy
    .fromTo('.p-phone', { yPercent: 45, opacity: 0, rotation: 6 }, { yPercent: 0, opacity: 1, rotation: 0, duration: 1.2 }, 5.2)
    .to('.p-phone', { y: -8, duration: 1.5, yoyo: true, repeat: 2, ease: 'sine.inOut' }, 6.4)
    .to('.p-cam', { ...camTo(600, 1080, 1.12 * Z), duration: 6, ease: 'sine.inOut' }, 5.6);
}

export default function SpotRepowering(p: { playing: boolean; onDone?: () => void }) {
  return <Spot copy={COPY} note="Schematische Darstellung" stage={<Stage />} overlay={<Overlay />} build={build} {...p} />;
}
