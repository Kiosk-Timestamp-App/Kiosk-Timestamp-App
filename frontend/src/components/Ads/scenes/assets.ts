// Vorgerenderte Ebenen (scratchpad/adart/render2.mjs aus SVG; auf Inhalt beschnitten, bis 3,5× Bühnenauflösung)
import dBeam from '../../../assets/ads/d-beam.webp';
import dDrone from '../../../assets/ads/d-drone.webp';
import dField from '../../../assets/ads/d-field.webp';
import dRotor from '../../../assets/ads/d-rotor.webp';
import dThermal from '../../../assets/ads/d-thermal.webp';
import hFarmer from '../../../assets/ads/h-farmer.webp';
import hPhone from '../../../assets/ads/h-phone.webp';
import hPilot from '../../../assets/ads/h-pilot.webp';
import hTablet from '../../../assets/ads/h-tablet.webp';
import pNew from '../../../assets/ads/p-new.webp';
import pOld from '../../../assets/ads/p-old.webp';
import rBrush from '../../../assets/ads/r-brush.webp';
import rClean from '../../../assets/ads/r-clean.webp';
import rDust from '../../../assets/ads/r-dust.webp';
import sky from '../../../assets/ads/sky.webp';
import wHall from '../../../assets/ads/w-hall.webp';
import wReport from '../../../assets/ads/w-report.webp';
import wStamp from '../../../assets/ads/w-stamp.webp';

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
