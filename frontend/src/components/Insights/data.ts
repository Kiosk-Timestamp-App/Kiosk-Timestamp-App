/**
 * Datenquellen des Bildschirms „Energie heute & Prognose“ (alle browserseitig):
 * – Börsenpreise Day-Ahead AT: aWATTar-API (öffentlich, CORS offen) → Fallback Backend (aWATTar-Doctype) → Cache
 * – PV-Prognose: Open-Meteo (geneigte Globalstrahlung + Lufttemperatur) für die Koordinaten aus dem Backend
 * Letzte gute Werte liegen mit Zeitstempel im localStorage; es wird nie etwas erfunden.
 */
import { useEffect, useMemo, useState } from 'react';
import { apiBaseUrl } from '../../api/apiBaseUrl';
import { HOUR, fromVienna, hourStart, viennaMidnight, viennaParts } from './time';

export type LoadState = 'loading' | 'ok' | 'stale' | 'error';

export interface PriceSlot {
  /** Beginn der Stunde (Unix-ms) */
  start: number;
  /** Day-Ahead-Preis netto in ct/kWh */
  ct: number;
}

export interface PriceData {
  slots: PriceSlot[];
  source: 'aWATTar' | 'Backend' | null;
  fetchedAt: number | null;
  state: LoadState;
  /** Erster Ladeversuch abgeschlossen (danach nie mehr Skelett, sondern Daten oder Hinweis) */
  settled: boolean;
}

export interface PvSlot {
  start: number;
  /** Mittlere geneigte Globalstrahlung der Stunde in W/m² */
  gti: number;
  temp: number;
  /** Prognostizierte mittlere Leistung der Stunde in kW (= kWh in dieser Stunde) */
  kw: number;
}

export interface SunDay {
  day: number;
  sunrise: number;
  sunset: number;
}

export interface PvData {
  slots: PvSlot[];
  sun: SunDay[];
  fetchedAt: number | null;
  state: LoadState;
  settled: boolean;
}

/* ------------------------------------------------------------------ Modellannahmen (werden im Bildschirm genannt) */

export const PV_MODEL = {
  tilt: 15,
  azimuth: 0, // Open-Meteo: 0 = Süd
  losses: 0.14,
  gamma: -0.0035, // −0,35 %/K
  heat: 0.026, // T_mod = T_air + 0,026 · GTI
};

/** P = kWp × GTI/1000 × (1 − Verluste) × (1 + γ·(T_mod − 25)), begrenzt auf kWp */
export function pvPower(kwp: number, gti: number, tAir: number) {
  if (!(gti > 0) || !(kwp > 0)) return 0;
  const tMod = tAir + PV_MODEL.heat * gti;
  const p = kwp * (gti / 1000) * (1 - PV_MODEL.losses) * (1 + PV_MODEL.gamma * (tMod - 25));
  return Math.max(0, Math.min(kwp, p));
}

/* ------------------------------------------------------------------ Cache */

interface Cached<T> {
  ts: number;
  data: T;
}
function readCache<T>(key: string): Cached<T> | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Cached<T>) : null;
  } catch {
    return null;
  }
}
function writeCache<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch (err) {
    console.warn('Insights: Cache konnte nicht gespeichert werden', err);
  }
}

/* ------------------------------------------------------------------ Koordinaten */

export function parseCoords(data: unknown): [number, number] | null {
  const msg = (data as { message?: unknown })?.message ?? data;
  let out: [number, number] | null = null;
  if (Array.isArray(msg) && msg.length >= 2) out = [Number(msg[0]), Number(msg[1])];
  else if (typeof msg === 'string' && msg.includes(',')) {
    const [a, b] = msg.split(',').map(Number);
    out = [a, b];
  } else {
    const o = msg as { latitude?: number; longitude?: number } | null;
    if (o && o.latitude !== undefined && o.longitude !== undefined) out = [Number(o.latitude), Number(o.longitude)];
  }
  return out && Number.isFinite(out[0]) && Number.isFinite(out[1]) ? out : null;
}

/* ------------------------------------------------------------------ Preise */

const PRICE_KEY = 'ov-insights-prices';

/** Stundenmittel bilden (aWATTar liefert Stunden; feinere Werte würden gemittelt) */
function toHourly(raw: { start: number; ct: number }[]): PriceSlot[] {
  const map = new Map<number, { sum: number; n: number }>();
  for (const r of raw) {
    if (!Number.isFinite(r.ct) || !Number.isFinite(r.start)) continue;
    const k = hourStart(r.start);
    const e = map.get(k) ?? { sum: 0, n: 0 };
    e.sum += r.ct;
    e.n += 1;
    map.set(k, e);
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([start, e]) => ({ start, ct: e.sum / e.n }));
}

async function fetchAwattar(): Promise<PriceSlot[]> {
  const start = viennaMidnight(Date.now());
  const end = viennaMidnight(Date.now(), 2);
  const res = await fetch(`https://api.awattar.at/v1/marketdata?start=${start}&end=${end}`);
  if (!res.ok) throw new Error(`aWATTar ${res.status}`);
  const json = (await res.json()) as { data?: { start_timestamp: number; marketprice: number; unit?: string }[] };
  const rows = (json.data ?? []).map((d) => {
    const perMwh = !d.unit || /mwh/i.test(d.unit);
    return { start: d.start_timestamp, ct: perMwh ? d.marketprice / 10 : d.marketprice * 100 };
  });
  const slots = toHourly(rows);
  if (!slots.length) throw new Error('aWATTar: keine Daten');
  return slots;
}

/** Backend-Doctype (Zeiten als Wiener Wanduhrzeit „YYYY-MM-DD HH:MM:SS“) */
async function fetchBackend(base: string): Promise<PriceSlot[]> {
  const res = await fetch(`${base}kiosk_client_app.system_integration.doctype.awattar_energy_price.awattar_energy_price.get_existing_awattar_price`);
  if (!res.ok) throw new Error(`Backend ${res.status}`);
  const json = (await res.json()) as { message?: { message?: { start_time: string; price: number | string; unit?: string }[] } };
  const rows = (json.message?.message ?? []).map((e) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(e.start_time ?? '');
    const start = m ? fromVienna(+m[1], +m[2], +m[3], +m[4], +m[5]) : NaN;
    const v = Number(e.price);
    const unit = e.unit ?? '';
    const ct = /mwh/i.test(unit) ? v / 10 : /(€|eur)\/kwh/i.test(unit) ? v * 100 : v;
    return { start, ct };
  });
  const slots = toHourly(rows);
  if (!slots.length) throw new Error('Backend: keine Preisdaten');
  return slots;
}

/** Liegen schon Preise für morgen vor? (Day-Ahead-Auktion, Veröffentlichung ca. 13 Uhr) */
const hasTomorrow = (slots: PriceSlot[]) => slots.some((s) => s.start >= viennaMidnight(Date.now(), 1));

export function usePrices(base = apiBaseUrl): PriceData {
  const [data, setData] = useState<PriceData>(() => {
    const c = readCache<{ slots: PriceSlot[]; source: PriceData['source'] }>(PRICE_KEY);
    return c
      ? { slots: c.data.slots, source: c.data.source, fetchedAt: c.ts, state: 'stale', settled: false }
      : { slots: [], source: null, fetchedAt: null, state: 'loading', settled: false };
  });

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = async () => {
      let slots: PriceSlot[] | null = null;
      let source: PriceData['source'] = null;
      try {
        slots = await fetchAwattar();
        source = 'aWATTar';
      } catch (err) {
        console.warn('Insights: aWATTar nicht erreichbar, nutze Backend', err);
        try {
          slots = await fetchBackend(base);
          source = 'Backend';
        } catch (err2) {
          console.warn('Insights: Backend-Preise nicht verfügbar, nutze Cache', err2);
        }
      }
      if (!alive) return;
      if (slots) {
        writeCache(PRICE_KEY, { slots, source });
        setData({ slots, source, fetchedAt: Date.now(), state: 'ok', settled: true });
      } else {
        setData((d) => ({ ...d, state: d.slots.length ? 'stale' : 'error', settled: true }));
      }
      // Nach 13 Uhr ohne Preise für morgen alle 10 min nachsehen, sonst alle 30 min (Abfragelimit der API)
      const waiting = viennaParts(Date.now()).h >= 13 && !(slots && hasTomorrow(slots));
      timer = setTimeout(load, waiting ? 10 * 60_000 : 30 * 60_000);
    };
    load();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [base]);

  return data;
}

/* ------------------------------------------------------------------ PV-Prognose */

const PV_KEY = 'ov-insights-pv';
const COORD_KEY = 'ov-insights-coords';

interface OpenMeteo {
  hourly: { time: number[]; global_tilted_irradiance: (number | null)[]; temperature_2m: (number | null)[] };
  daily: { time: number[]; sunrise: number[]; sunset: number[] };
}
interface PvRaw {
  hours: { start: number; gti: number; temp: number }[];
  sun: SunDay[];
}

async function fetchCoords(base: string): Promise<[number, number]> {
  try {
    const res = await fetch(`${base}kiosk_client_app.system_integration.doctype.okosys_settings.okosys_settings.get_weather_latitude_longitude`);
    const c = parseCoords(await res.json());
    if (!c) throw new Error('Ungültige Koordinaten');
    writeCache(`${COORD_KEY}:${base}`, c);
    return c;
  } catch (err) {
    const cached = readCache<[number, number]>(`${COORD_KEY}:${base}`);
    if (cached) return cached.data;
    throw err;
  }
}

async function fetchPv(base: string): Promise<PvRaw> {
  const [lat, lon] = await fetchCoords(base);
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&hourly=global_tilted_irradiance,temperature_2m&tilt=${PV_MODEL.tilt}&azimuth=${PV_MODEL.azimuth}` +
    `&daily=sunrise,sunset&timezone=Europe%2FVienna&timeformat=unixtime&forecast_days=3`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  const j = (await res.json()) as OpenMeteo;
  // Strahlungswerte von Open-Meteo sind Mittel der VORANGEHENDEN Stunde → Stundenbeginn = Zeitstempel − 1 h
  const hours = j.hourly.time.map((t, i) => ({
    start: t * 1000 - HOUR,
    gti: Math.max(0, j.hourly.global_tilted_irradiance[i] ?? 0),
    temp: j.hourly.temperature_2m[i] ?? 15,
  }));
  const sun = j.daily.time.map((t, i) => ({ day: t * 1000, sunrise: j.daily.sunrise[i] * 1000, sunset: j.daily.sunset[i] * 1000 }));
  if (!hours.length) throw new Error('Open-Meteo: keine Daten');
  return { hours, sun };
}

export function usePvForecast(kwp: number | null, base = apiBaseUrl): PvData {
  const [raw, setRaw] = useState<{ raw: PvRaw | null; fetchedAt: number | null; state: LoadState; settled: boolean }>(() => {
    const c = readCache<PvRaw>(`${PV_KEY}:${base}`);
    return c ? { raw: c.data, fetchedAt: c.ts, state: 'stale', settled: false } : { raw: null, fetchedAt: null, state: 'loading', settled: false };
  });

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const fresh = await fetchPv(base);
        if (!alive) return;
        writeCache(`${PV_KEY}:${base}`, fresh);
        setRaw({ raw: fresh, fetchedAt: Date.now(), state: 'ok', settled: true });
      } catch (err) {
        console.warn('Insights: PV-Prognose nicht verfügbar, nutze Cache', err);
        if (alive) setRaw((r) => ({ ...r, state: r.raw ? 'stale' : 'error', settled: true }));
      }
    };
    load();
    const id = setInterval(load, 60 * 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [base]);

  const slots = useMemo<PvSlot[]>(
    () => (raw.raw && kwp ? raw.raw.hours.map((h) => ({ ...h, kw: pvPower(kwp, h.gti, h.temp) })) : []),
    [raw.raw, kwp],
  );
  const sun = useMemo(() => raw.raw?.sun ?? [], [raw.raw]);
  // Ohne bekannte Anlagenleistung kann (noch) nichts gerechnet werden
  const state: LoadState = !kwp && raw.state !== 'error' ? 'loading' : raw.state;
  return { slots, sun, fetchedAt: raw.fetchedAt, state, settled: raw.settled };
}
