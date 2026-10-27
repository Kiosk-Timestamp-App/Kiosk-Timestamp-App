/**
 * Tageslicht & Bühnen-Stimmung.
 * - Sonnenauf-/-untergang astronomisch berechnet (Algorithmus nach SunCalc/NOAA, ±2 min),
 *   Koordinaten aus dem Wetter-Cache des Standorts, sonst Wien.
 * - Kleiner globaler Speicher für die aktuelle Solar-Auslastung (0…1), damit die Bühne im
 *   App-Rahmen das Sonnenglühen an die echte Leistung koppeln kann, ohne doppelt abzufragen.
 */
import { useSyncExternalStore } from 'react';
import { useNow } from './hooks';

const RAD = Math.PI / 180;
const DAY_MS = 86_400_000;
const J1970 = 2440588;
const J2000 = 2451545;
const J0 = 0.0009;
const OBLIQUITY = RAD * 23.4397;

const toDays = (d: Date) => d.valueOf() / DAY_MS - 0.5 + J1970 - J2000;
const fromJulian = (j: number) => new Date((j + 0.5 - J1970) * DAY_MS);

/** Sonnenaufgang und -untergang für das Kalenderdatum von `date` */
export function sunTimes(date: Date, lat: number, lon: number): { sunrise: Date; sunset: Date } | null {
  const noon = new Date(date);
  noon.setHours(12, 0, 0, 0);
  const lw = RAD * -lon;
  const phi = RAD * lat;
  const d = toDays(noon);
  const n = Math.round(d - J0 - lw / (2 * Math.PI));
  const ds = J0 + lw / (2 * Math.PI) + n;
  const M = RAD * (357.5291 + 0.98560028 * ds);
  const C = RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  const L = M + C + RAD * 102.9372 + Math.PI;
  const dec = Math.asin(Math.sin(OBLIQUITY) * Math.sin(L));
  const jNoon = J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
  const cosW = (Math.sin(-0.833 * RAD) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec));
  if (cosW < -1 || cosW > 1) return null; // Polartag/-nacht
  const w = Math.acos(cosW);
  const a = J0 + (w + lw) / (2 * Math.PI) + n;
  const jSet = J2000 + a + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
  const jRise = jNoon - (jSet - jNoon);
  return { sunrise: fromJulian(jRise), sunset: fromJulian(jSet) };
}

const VIENNA: [number, number] = [48.2082, 16.3738];

export interface Daylight {
  isDay: boolean;
  /** 0 = Sonnenaufgang … 1 = Sonnenuntergang (außerhalb geklemmt) */
  progress: number;
  sunrise: Date;
  sunset: Date;
  /** nächster Sonnenaufgang (heute oder morgen) */
  nextSunrise: Date;
  /** true, wenn echte Standortkoordinaten bekannt sind (sonst grobe Schätzung für Wien) */
  known: boolean;
}

export function daylightAt(now: Date, coords: [number, number] | null = null): Daylight {
  const c = coords ?? VIENNA;
  const t = sunTimes(now, c[0], c[1]);
  const fallbackRise = new Date(now);
  fallbackRise.setHours(6, 30, 0, 0);
  const fallbackSet = new Date(now);
  fallbackSet.setHours(18, 30, 0, 0);
  const sunrise = t?.sunrise ?? fallbackRise;
  const sunset = t?.sunset ?? fallbackSet;
  const isDay = now >= sunrise && now <= sunset;
  let nextSunrise = sunrise;
  if (now > sunrise) {
    const tomorrow = new Date(now.valueOf() + DAY_MS);
    nextSunrise = sunTimes(tomorrow, c[0], c[1])?.sunrise ?? new Date(sunrise.valueOf() + DAY_MS);
  }
  const progress = Math.min(1, Math.max(0, (now.valueOf() - sunrise.valueOf()) / (sunset.valueOf() - sunrise.valueOf())));
  return { isDay, progress, sunrise, sunset, nextSunrise, known: !!coords };
}

/**
 * Tageslicht am Standort, minütlich aktualisiert.
 * `coords` = Standort der angezeigten Anlage; ohne Angabe der Standort der eigenen Anlage (Bühne).
 */
export function useDaylight(coords?: [number, number] | null): Daylight {
  const now = useNow(60_000);
  const stage = useSyncExternalStore(subscribeCoords, () => stageCoords);
  return daylightAt(now, coords === undefined ? stage : coords);
}

/* ------------------------------------------------------------------ Standort der eigenen Anlage (für die Bühne) */

let stageCoords: [number, number] | null = null;
const coordListeners = new Set<() => void>();
const subscribeCoords = (cb: () => void) => {
  coordListeners.add(cb);
  return () => coordListeners.delete(cb);
};

/** Von der Hauptanzeige der eigenen Anlage gesetzt, sobald die Koordinaten bekannt sind */
export function setStageCoords(c: [number, number] | null) {
  if (c?.[0] === stageCoords?.[0] && c?.[1] === stageCoords?.[1]) return;
  stageCoords = c;
  coordListeners.forEach((l) => l());
}

export const fmtClock = (d: Date) =>
  new Intl.DateTimeFormat('de-AT', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Vienna' }).format(d);

/* ------------------------------------------------------------------ Solar-Auslastung für die Bühne */

let solarRatio: number | null = null;
const listeners = new Set<() => void>();

/** Von der Hauptanzeige der eigenen Anlage gesetzt (0…1); `null` = unbekannt */
export function setStageSolar(ratio: number | null) {
  const next = ratio == null || !Number.isFinite(ratio) ? null : Math.min(1, Math.max(0, ratio));
  if (next === solarRatio) return;
  solarRatio = next;
  listeners.forEach((l) => l());
}

export function useStageSolar() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => solarRatio,
  );
}
