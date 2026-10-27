/**
 * Abgeleitete Kennzahlen – reine Funktionen auf echten Preis- und Prognosedaten.
 * Jede Regel steht hier einmal und wird im Bildschirm wörtlich genannt.
 */
import { fmtNum } from '../../design/hooks';
import type { PriceSlot, PvSlot } from './data';
import { HOUR, viennaMidnight } from './time';

/** Regel „Goldene Stunden“: PV-Prognose ≥ 60 % der Tagesspitze UND Börsenpreis unter dem Tagesmittel */
export const GOLDEN_PV_SHARE = 0.6;
/** Beispiel Lastverschiebung: 4 h Laden mit 11 kW (typische Wallbox) */
export const SHIFT_HOURS = 4;
export const SHIFT_KW = 11;
/** Hervorgehobenes günstigstes Fenster im Preisband */
export const CHEAP_WINDOW_H = 3;

export interface Range {
  start: number;
  end: number;
}

export interface DayStats {
  min: PriceSlot;
  max: PriceSlot;
  avg: number;
}

export interface Window extends Range {
  avg: number;
}

/** Slots eines Wiener Kalendertags (dayOffset 0 = heute) */
export function sliceDay<T extends { start: number }>(slots: T[], now: number, dayOffset: number): T[] {
  const a = viennaMidnight(now, dayOffset);
  const b = viennaMidnight(now, dayOffset + 1);
  return slots.filter((s) => s.start >= a && s.start < b);
}

export function dayStats(slots: PriceSlot[]): DayStats | null {
  if (!slots.length) return null;
  let min = slots[0];
  let max = slots[0];
  let sum = 0;
  for (const s of slots) {
    if (s.ct < min.ct) min = s;
    if (s.ct > max.ct) max = s;
    sum += s.ct;
  }
  return { min, max, avg: sum / slots.length };
}

/** Günstigstes bzw. teuerstes zusammenhängendes Fenster aus `hours` Stunden */
export function bestWindow(slots: PriceSlot[], hours: number, mode: 'min' | 'max'): Window | null {
  let best: Window | null = null;
  for (let i = 0; i + hours <= slots.length; i++) {
    const run = slots.slice(i, i + hours);
    if (run[hours - 1].start - run[0].start !== (hours - 1) * HOUR) continue; // Lücke in den Daten
    const avg = run.reduce((a, s) => a + s.ct, 0) / hours;
    if (!best || (mode === 'min' ? avg < best.avg : avg > best.avg)) best = { start: run[0].start, end: run[0].start + hours * HOUR, avg };
  }
  return best;
}

export type Verdict = 'low' | 'mid' | 'high';
/** Farben + Klartext je Einordnung (Status nie nur über Farbe) */
export const TONE = {
  low: { bar: '#8CBA58', text: '#AED083', label: 'günstig' },
  mid: { bar: '#F5A70F', text: '#FFD873', label: 'mittel' },
  high: { bar: '#F0574B', text: '#FF9C92', label: 'teuer' },
} as const;

/** Vergangene Stunden: entsättigtes Grau statt gedimmter Statusfarbe */
export const PAST_GREY = '#9AA6BC';

/** Einordnung nach Lage in der heutigen Spanne (unteres / mittleres / oberes Drittel) */
export function verdictOf(ct: number, st: DayStats): Verdict {
  const range = st.max.ct - st.min.ct;
  if (range <= 0.05) return 'mid';
  const pos = (ct - st.min.ct) / range;
  return pos < 1 / 3 ? 'low' : pos < 2 / 3 ? 'mid' : 'high';
}

export function groupRanges(starts: number[]): Range[] {
  const out: Range[] = [];
  for (const s of [...starts].sort((a, b) => a - b)) {
    const last = out[out.length - 1];
    if (last && last.end === s) last.end = s + HOUR;
    else out.push({ start: s, end: s + HOUR });
  }
  return out;
}

export interface PvDay {
  kwh: number;
  peak: PvSlot | null;
  /** Stunden mit ≥ 60 % der Tagesspitze */
  strong: Range[];
}

export function pvDay(slots: PvSlot[]): PvDay {
  let kwh = 0;
  let peak: PvSlot | null = null;
  for (const s of slots) {
    kwh += s.kw;
    if (!peak || s.kw > peak.kw) peak = s;
  }
  if (!peak || peak.kw <= 0) return { kwh, peak: null, strong: [] };
  const strong = groupRanges(slots.filter((s) => s.kw >= GOLDEN_PV_SHARE * peak.kw).map((s) => s.start));
  return { kwh, peak, strong };
}

/** Goldene Stunden eines Tages (Schnittmenge starker PV-Stunden und Preis < Tagesmittel) */
export function goldenHours(pv: PvSlot[], prices: PriceSlot[]): Range[] {
  const st = dayStats(prices);
  const day = pvDay(pv);
  if (!st || !day.peak) return [];
  const priceAt = new Map(prices.map((p) => [p.start, p.ct]));
  const thr = GOLDEN_PV_SHARE * day.peak.kw;
  const hours = pv.filter((s) => s.kw >= thr && (priceAt.get(s.start) ?? Infinity) < st.avg).map((s) => s.start);
  return groupRanges(hours);
}

/**
 * Ersparnis-Beispiel: gleiche Energiemenge im günstigsten statt im teuersten 4-h-Fenster (nur Energiepreis, netto).
 * – nur volle kommende Stunden (die laufende Stunde zählt nicht mehr), mindestens 8 Stunden Vorlauf
 * – die beiden Fenster überlappen sich nie (größte Differenz zweier getrennter Fenster)
 * Beträge auf Cent gerundet; die Ersparnis entsteht aus den gerundeten Zeilen – die Summe stimmt sichtbar.
 */
export const SHIFT_MIN_SLOTS = 8;
export function shiftSaving(prices: PriceSlot[]) {
  if (prices.length < SHIFT_MIN_SLOTS) return null;
  const wins: Window[] = [];
  for (let i = 0; i + SHIFT_HOURS <= prices.length; i++) {
    const run = prices.slice(i, i + SHIFT_HOURS);
    if (run[SHIFT_HOURS - 1].start - run[0].start !== (SHIFT_HOURS - 1) * HOUR) continue;
    wins.push({ start: run[0].start, end: run[0].start + SHIFT_HOURS * HOUR, avg: run.reduce((x, r) => x + r.ct, 0) / SHIFT_HOURS });
  }
  let best: { cheap: Window; dear: Window } | null = null;
  for (const c of wins)
    for (const d of wins) {
      if (c.end > d.start && d.end > c.start) continue; // überlappend
      if (!best || d.avg - c.avg > best.dear.avg - best.cheap.avg) best = { cheap: c, dear: d };
    }
  if (!best || best.dear.avg - best.cheap.avg < 0.05) return null;
  const kwh = SHIFT_HOURS * SHIFT_KW;
  const cents = (ct: number) => Math.round(ct * kwh) / 100;
  const cheapEur = cents(best.cheap.avg);
  const dearEur = cents(best.dear.avg);
  return { cheap: best.cheap, dear: best.dear, kwh, cheapEur, dearEur, eur: Math.round((dearEur - cheapEur) * 100) / 100 };
}

/** DE-Zahlenformat einheitlich nach de-AT (gemeinsamer Helfer), negative Werte mit U+2212 */
export const nf = (v: number, d = 1) => fmtNum(v, d).replace('-', '\u2212');
