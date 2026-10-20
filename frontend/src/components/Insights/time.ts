/**
 * Zeit-Helfer für Europe/Vienna – unabhängig von der Zeitzone des TV-Browsers.
 * Alle Zeitpunkte sind Unix-Millisekunden; Tage werden als „YYYY-MM-DD“ (Wiener Kalender) geführt.
 */
export const TZ = 'Europe/Vienna';
export const HOUR = 3_600_000;

const partsFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export interface ViennaParts {
  y: number;
  m: number;
  d: number;
  h: number;
  min: number;
}

export function viennaParts(ms: number): ViennaParts {
  const p = partsFmt.formatToParts(new Date(ms));
  const g = (t: string) => Number(p.find((x) => x.type === t)?.value ?? 0);
  return { y: g('year'), m: g('month'), d: g('day'), h: g('hour') % 24, min: g('minute') };
}

/** Kalendertag in Wien, z. B. „2026-10-19“ */
export function dayKey(ms: number) {
  const { y, m, d } = viennaParts(ms);
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Wiener Wanduhrzeit → Unix-ms (zwei Iterationen für korrekten Sommer-/Winterzeit-Versatz) */
export function fromVienna(y: number, m: number, d: number, h = 0, min = 0) {
  const wall = Date.UTC(y, m - 1, d, h, min);
  let guess = wall;
  for (let i = 0; i < 2; i++) {
    const p = viennaParts(guess);
    const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min);
    guess = wall - (asUtc - guess);
  }
  return guess;
}

/** Beginn des Wiener Kalendertags von `ms`, optional um `addDays` verschoben */
export function viennaMidnight(ms: number, addDays = 0) {
  const { y, m, d } = viennaParts(ms);
  const shifted = new Date(Date.UTC(y, m - 1, d + addDays));
  return fromVienna(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
}

/** Beginn der laufenden Stunde */
export const hourStart = (ms: number) => Math.floor(ms / HOUR) * HOUR;

export const hh = (ms: number) => String(viennaParts(ms).h).padStart(2, '0');
export const hhmm = (ms: number) => {
  const p = viennaParts(ms);
  return `${String(p.h).padStart(2, '0')}:${String(p.min).padStart(2, '0')}`;
};

const fmtCache = new Map<string, Intl.DateTimeFormat>();
const fmt = (locale: string, opts: Intl.DateTimeFormatOptions) => {
  const k = locale + JSON.stringify(opts);
  let f = fmtCache.get(k);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, { timeZone: TZ, ...opts });
    fmtCache.set(k, f);
  }
  return f;
};
export const weekday = (ms: number, locale = 'de-AT') => fmt(locale, { weekday: 'long' }).format(new Date(ms));
export const shortDate = (ms: number, locale = 'de-AT') => fmt(locale, { day: 'numeric', month: 'numeric' }).format(new Date(ms));
