// Vorgerenderte Ebenen (scratchpad/adart/render2.mjs aus SVG; auf Inhalt beschnitten, bis 3,5× Bühnenauflösung)
import dBeamImg from '../../../assets/ads/d-beam.webp';
import dDroneImg from '../../../assets/ads/d-drone.webp';
import dFieldImg from '../../../assets/ads/d-field.webp';
import dRotorImg from '../../../assets/ads/d-rotor.webp';
import dThermalImg from '../../../assets/ads/d-thermal.webp';
import hFarmerImg from '../../../assets/ads/h-farmer.webp';
import hPhoneImg from '../../../assets/ads/h-phone.webp';
import hPilotImg from '../../../assets/ads/h-pilot.webp';
import hTabletImg from '../../../assets/ads/h-tablet.webp';
import pNewImg from '../../../assets/ads/p-new.webp';
import pOldImg from '../../../assets/ads/p-old.webp';
import rBrushImg from '../../../assets/ads/r-brush.webp';
import rCleanImg from '../../../assets/ads/r-clean.webp';
import rDustImg from '../../../assets/ads/r-dust.webp';
import skyImg from '../../../assets/ads/sky.webp';
import wHallImg from '../../../assets/ads/w-hall.webp';
import wReportImg from '../../../assets/ads/w-report.webp';
import wStampImg from '../../../assets/ads/w-stamp.webp';
const dBeam = dBeamImg.src;
const dDrone = dDroneImg.src;
const dField = dFieldImg.src;
const dRotor = dRotorImg.src;
const dThermal = dThermalImg.src;
const hFarmer = hFarmerImg.src;
const hPhone = hPhoneImg.src;
const hPilot = hPilotImg.src;
const hTablet = hTabletImg.src;
const pNew = pNewImg.src;
const pOld = pOldImg.src;
const rBrush = rBrushImg.src;
const rClean = rCleanImg.src;
const rDust = rDustImg.src;
const sky = skyImg.src;
const wHall = wHallImg.src;
const wReport = wReportImg.src;
const wStamp = wStampImg.src;
export const ART = { dBeam,dDrone,dField,dRotor,dThermal,hFarmer,hPhone,hPilot,hTablet,pNew,pOld,rBrush,rClean,rDust,sky,wHall,wReport,wStamp };
type ArtKey = keyof typeof ART;

/** Ebenen je Szene – die nächste Szene wird während der vorigen dekodiert */
export const SCENE_ART: Record<string, ArtKey[]> = {
  drohne: ['sky', 'dField', 'dThermal', 'dDrone', 'dRotor', 'dBeam', 'hPilot'],
  wartung: ['sky', 'wHall', 'wReport', 'wStamp', 'hTablet'],
  reinigung: ['sky', 'rClean', 'rDust', 'rBrush', 'hFarmer'],
  repowering: ['sky', 'pOld', 'pNew', 'hPhone'],
  outro: ['sky', 'pNew'],
};

// dekodierte Bilder festhalten, damit der Browser sie nicht wieder verwirft
const keep = new Map<string, HTMLImageElement>();
/** Ebenen einer Szene laden und dekodieren (Hintergrund, blockiert den Spotwechsel nicht) */
export function decodeScene(id: string) {
  return Promise.all(
    (SCENE_ART[id] ?? []).map((k) => {
      const src = ART[k];
      if (keep.has(src)) return Promise.resolve();
      const img = new Image();
      img.decoding = 'async';
      img.src = src;
      keep.set(src, img);
      return img.decode().catch(() => undefined);
    }),
  );
}
