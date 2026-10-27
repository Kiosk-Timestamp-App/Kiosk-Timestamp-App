import { Spot, type SpotCopy } from './Spot';
import { Layer } from './Layer';
import { ART } from './assets';
import { camTo, type Timeline } from './hooks';

/* Wortlaut: oekovolt-fe-at.vercel.app/service/reinigung */
const COPY: SpotCopy = {
  eyebrow: 'PV-Reinigung · nach Befund',
  hook: ['Photovoltaik reinigen –', 'wo es sich lohnt.'],
  caption: 'Wir reinigen schonend mit vollentsalztem Wasser – nach Herstellervorgaben und mit Absturzsicherung.',
  benefit: ['Wir entscheiden nach Befund,', 'nicht nach Kalender.'],
};

const GLINTS: [number, number][] = [
  [190, 900],
  [520, 920],
  [880, 905],
  [330, 1110],
  [1000, 1120],
];
const DROPS = Array.from({ length: 6 }, (_, i) => ({ y: 880 + i * 78 }));

function Stage() {
  return (
    <div className="r-cam absolute left-0 top-0 h-[1600px] w-[1200px] origin-top-left will-change-transform">
      <Layer src={ART.sky} />
      <Layer src={ART.rClean} rect="r-clean" />
      {/* Schmutz-Fenster: Rahmen und Inhalt gegenläufig → Wischkante ohne Neuzeichnen */}
      <div className="r-win absolute left-0 top-[830px] h-[520px] w-[1300px] overflow-hidden">
        <img src={ART.rDust} alt="" className="r-dust absolute left-0 top-0 h-[520px] w-[1200px] max-w-none" />
      </div>
      <div className="absolute left-0 top-[840px] h-[500px] w-[1200px] overflow-hidden">
        <div className="r-shine absolute top-0 h-full w-[220px] -skew-x-12 bg-gradient-to-r from-transparent via-[rgb(255_236_200/0.35)] to-transparent" style={{ left: -420 }} />
      </div>
      {GLINTS.map(([x, y], i) => (
        <div key={i} className="r-glint absolute size-[54px] opacity-0" style={{ left: x - 27, top: y - 27, clipPath: 'polygon(50% 0, 58% 42%, 100% 50%, 58% 58%, 50% 100%, 42% 58%, 0 50%, 42% 42%)', background: 'radial-gradient(circle, #fff, #fff1d6 40%, rgb(255 241 214 / 0) 70%)' }} />
      ))}
      <div className="r-follow absolute left-0 top-0 h-[1600px] w-0">
        {DROPS.map((d, i) => (
          <span key={i} className="r-drop absolute size-[10px] rounded-full bg-[#dff1ff]" style={{ left: -6, top: d.y, opacity: 0 }} />
        ))}
        <img src={ART.rBrush} alt="" className="absolute max-w-none" style={{ left: -110, top: 820, width: 220, height: 560 }} />
      </div>
    </div>
  );
}

function Overlay() {
  return <img src={ART.hFarmer} alt="" className="r-farmer pointer-events-none absolute bottom-0 left-[3%] h-[40%] w-auto max-w-none opacity-0 landscape:h-[56%]" />;
}

function build(tl: Timeline) {
  const Z = window.matchMedia('(orientation: portrait)').matches ? 1.32 : 1.05;
  const X0 = 60;
  const X1 = 1300;
  tl.set('.r-cam', camTo(600, 1080, 1.1 * Z), 0)
    .to('.r-cam', { ...camTo(610, 1090, 1.0 * Z), duration: 6.5, ease: 'sine.inOut' }, 0)
    .fromTo(['.r-win', '.r-follow'], { x: -150 }, { x: X0 + 120, duration: 0.8, ease: 'expo.out' }, 0)
    .fromTo('.r-dust', { x: 150 }, { x: -(X0 + 120), duration: 0.8, ease: 'expo.out' }, 0)
    .to(['.r-win', '.r-follow'], { x: X1, duration: 4.8, ease: 'power1.inOut' }, 0.8)
    .to('.r-dust', { x: -X1, duration: 4.8, ease: 'power1.inOut' }, 0.8)
    .fromTo('.r-drop', { x: 0, opacity: 0.9, scale: 1 }, { x: -120, y: '+=18', opacity: 0, scale: 0.4, duration: 0.6, ease: 'power1.out', stagger: { each: 0.08, repeat: 7 } }, 0.6)
    // HÖHEPUNKT: gereinigte Module glänzen im Abendlicht, der Landwirt tritt ins Bild
    .fromTo('.r-shine', { x: 0 }, { x: 1900, duration: 1.3, ease: 'power2.inOut' }, 5.6)
    .fromTo('.r-glint', { opacity: 0, scale: 0, rotation: -40 }, { opacity: 1, scale: 1, rotation: 0, duration: 0.5, ease: 'back.out(2.6)', stagger: 0.12 }, 5.9)
    .to('.r-glint', { opacity: 0, scale: 0.5, duration: 0.5, stagger: 0.12 }, 6.8)
    .fromTo('.r-farmer', { xPercent: -30, opacity: 0 }, { xPercent: 0, opacity: 1, duration: 1.4 }, 6.2)
    .to('.r-cam', { ...camTo(600, 1080, 1.1 * Z), duration: 5, ease: 'sine.inOut' }, 6.8);
}

export default function SpotCleaning(p: { playing: boolean; onDone?: () => void }) {
  return <Spot copy={COPY} capSide="right" note="Schematische Darstellung" stage={<Stage />} overlay={<Overlay />} build={build} {...p} />;
}
