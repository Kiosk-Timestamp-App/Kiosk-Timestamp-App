/**
 * „Heute live gemessen“: Das Backend liefert nur den 15-min-Verlauf von gestern. Der Kiosk zeichnet
 * deshalb die echten Live-Werte (get_latest_system_log) selbst auf – in localStorage, je Anlage
 * (apiBase) getrennt, nur für den aktuellen Tag (Europe/Vienna), höchstens ein Wert pro Minute.
 * Veraltete Werte (Zeitstempel älter als 20 min, z. B. aus dem Offline-Cache) werden nicht aufgezeichnet.
 */
import { useSyncExternalStore } from 'react';
import type { SystemData } from '../../hooks/useSystemData';
import { apiBaseUrl } from '../../api/apiBaseUrl';

/** [Minute des Tages, Solar kW, Verbrauch kW, Netz kW (+Bezug / −Einspeisung)] */
export type LiveSample = [number, number, number, number];
interface DayLog {
  date: string;
  samples: LiveSample[];
}

const MAX_SAMPLES = 1440;
const MIN_SPACING_MIN = 1;
const STALE_MS = 20 * 60_000;
const EMPTY: LiveSample[] = [];

const viennaParts = (d: Date) => {
  const p = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Europe/Vienna',
  }).formatToParts(d);
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? '00';
  return { date: `${g('year')}-${g('month')}-${g('day')}`, minute: (Number(g('hour')) % 24) * 60 + Number(g('minute')) };
};

export const liveLogKey = (base?: string) => {
  const b = base || apiBaseUrl;
  let h = 0;
  for (let i = 0; i < b.length; i++) h = (h * 31 + b.charCodeAt(i)) | 0;
  return `ov-live-log-${(h >>> 0).toString(36)}`;
};

const cache = new Map<string, DayLog>();
const listeners = new Map<string, Set<() => void>>();

function load(key: string): DayLog {
  const hit = cache.get(key);
  if (hit) return hit;
  let log: DayLog = { date: '', samples: EMPTY };
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? (JSON.parse(raw) as DayLog) : null;
    if (parsed && typeof parsed.date === 'string' && Array.isArray(parsed.samples)) log = parsed;
  } catch {
    /* defekter Eintrag → leer beginnen */
  }
  cache.set(key, log);
  return log;
}

/** Werte des heutigen Tages (ältere Tage zählen als leer) */
function read(key: string): LiveSample[] {
  const log = load(key);
  return log.date === viennaParts(new Date()).date ? log.samples : EMPTY;
}

/** Live-Wert aufzeichnen (von der Anzeige der jeweiligen Anlage aufgerufen, sobald neue Daten kommen) */
export function recordLiveSample(base: string | undefined, e: SystemData | null) {
  if (!e || !Number.isFinite(e.solar_energy) || !Number.isFinite(e.spend_energy) || !Number.isFinite(e.grid)) return;
  const now = new Date();
  const ts = e.timestamp ? new Date(e.timestamp) : null;
  if (ts && Number.isFinite(ts.valueOf()) && Math.abs(now.valueOf() - ts.valueOf()) > STALE_MS) return;
  const key = liveLogKey(base);
  const { date, minute } = viennaParts(now);
  const samples = read(key); // anderer Tag → leer; der alte Tag wird überschrieben
  const last = samples[samples.length - 1];
  if (last && minute >= last[0] && minute - last[0] < MIN_SPACING_MIN) return;
  const round = (v: number) => Math.round(v * 100) / 100;
  const sample: LiveSample = [minute, round(Math.max(0, e.solar_energy)), round(Math.max(0, e.spend_energy)), round(e.grid)];
  const next: DayLog = { date, samples: [...samples.filter((s) => s[0] < minute), sample].slice(-MAX_SAMPLES) };
  cache.set(key, next);
  try {
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    /* Speicher voll → nur im Speicher behalten */
  }
  listeners.get(key)?.forEach((l) => l());
}

/** Heutige, auf dem Kiosk gemessene Live-Werte der Anlage */
export function useLiveSamples(base?: string) {
  const key = liveLogKey(base);
  return useSyncExternalStore(
    (cb) => {
      const set = listeners.get(key) ?? new Set();
      set.add(cb);
      listeners.set(key, set);
      return () => set.delete(cb);
    },
    () => read(key),
  );
}
