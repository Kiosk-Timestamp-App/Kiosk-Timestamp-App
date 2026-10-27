import { isViennaWorkday, viennaParts } from '../Company/viennaTime';

/** Stempel-QR als Vollbild: an Arbeitstagen (Mo–Fr, ohne Feiertage in AT) von 07:00 bis 09:00 Uhr Wiener Zeit */
export const STAMP_WINDOW = { fromMin: 7 * 60, toMin: 9 * 60 };

export function isStampWindow(date: Date) {
  if (!isViennaWorkday(date)) return false;
  const p = viennaParts(date);
  const min = p.hh * 60 + p.mm;
  return min >= STAMP_WINDOW.fromMin && min < STAMP_WINDOW.toMin;
}
