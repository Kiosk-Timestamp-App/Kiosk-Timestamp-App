import { useEffect, useState } from 'react';
import { apiBaseUrl } from '../../api/apiBaseUrl';
import { readCache, usePolledMethod, writeCache } from '../../hooks/apiCache';

const INVERTAR = 'kiosk_client_app.system_integration.doctype.invertar.invertar.';

/**
 * Holt `message` einer Frappe-Methode, wiederholt im Intervall. Behält den letzten guten Wert bei Fehlern.
 * Cache je Anlage (max. `maxCacheAgeMs` alt), `enabled = false` → kein Abruf.
 */
export function useFrappe<T>(method: string, intervalMs: number, base = apiBaseUrl, enabled = true, maxCacheAgeMs = 24 * 60 * 60_000) {
  return usePolledMethod<T>(base, method, `frappe:${method}`, intervalMs, enabled, maxCacheAgeMs).data;
}

export interface DayPoint {
  interval_start: string;
  total_solar_energy: number;
  total_grid_imported: number;
  total_spend_energy: number;
}
export interface WeekPoint {
  day_date: string;
  total_solar_energy: number;
  total_grid_exported: number;
  total_spend_energy: number;
}
export interface MonthData {
  daily_data: { day_date: string; total_solar_energy: number }[];
  total_energy_produced: number;
  energy_unit: string;
}

export const useYesterday = (base?: string, enabled = true) => useFrappe<DayPoint[]>(`${INVERTAR}calculate_15min_totals_yesterday`, 15 * 60_000, base, enabled, 12 * 60 * 60_000);
export const useWeek = (base?: string, enabled = true) => useFrappe<WeekPoint[]>(`${INVERTAR}calculate_daily_totals_last_week`, 60 * 60_000, base, enabled);
export const useMonth = (base?: string, enabled = true) => useFrappe<MonthData>(`${INVERTAR}calculate_daily_solar_energy_previous_31_days`, 60 * 60_000, base, enabled);

/* ------------------------------------------------------------------ Wetter (Open-Meteo, Koordinaten aus dem Backend) */

export interface Weather {
  latitude?: number;
  longitude?: number;
  current: { temperature_2m: number; wind_speed_10m: number; weather_code: number; is_day?: number };
  daily: { time: string[]; temperature_2m_max: number[]; temperature_2m_min: number[]; weather_code: number[] };
}

const WEATHER_TTL = 6 * 60 * 60_000;

function parseCoords(data: unknown): [number, number] | null {
  const msg = (data as { message?: unknown })?.message ?? data;
  let c: [number, number] | null = null;
  if (Array.isArray(msg) && msg.length >= 2) c = [Number(msg[0]), Number(msg[1])];
  else if (typeof msg === 'string' && msg.includes(',')) {
    const [a, b] = msg.split(',').map(Number);
    c = [a, b];
  } else {
    const o = msg as { latitude?: number; longitude?: number };
    if (o && o.latitude !== undefined && o.longitude !== undefined) c = [Number(o.latitude), Number(o.longitude)];
  }
  return c && Number.isFinite(c[0]) && Number.isFinite(c[1]) ? c : null;
}

/**
 * Wetter am Standort der jeweiligen Anlage. Cache je Anlage (6 h); liefert zusätzlich die Koordinaten
 * (für Sonnenauf-/-untergang) und `failed`, wenn auch nach dem ersten Versuch keine Daten vorliegen.
 */
export function useWeather(base = apiBaseUrl, enabled = true) {
  const [state, setState] = useState<{ base: string; weather: Weather | null; coords: [number, number] | null; failed: boolean }>(() => init(base));
  if (state.base !== base) setState(init(base));

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(`${base}kiosk_client_app.system_integration.doctype.okosys_settings.okosys_settings.get_weather_latitude_longitude`);
        const coords = parseCoords(await res.json());
        if (!coords) throw new Error('Ungültige Koordinaten');
        if (alive) setState((s) => ({ ...s, coords }));
        writeCache('coords', base, coords);
        const w = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${coords[0]}&longitude=${coords[1]}&current=temperature_2m,wind_speed_10m,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=5`,
        );
        if (!w.ok) throw new Error(`Open-Meteo ${w.status}`);
        const fresh = (await w.json()) as Weather;
        writeCache('weather', base, fresh);
        if (alive) setState((s) => ({ ...s, weather: fresh, failed: false }));
      } catch (err) {
        console.warn('Wetter konnte nicht geladen werden', err);
        if (alive) setState((s) => ({ ...s, failed: !s.weather }));
      }
    };
    load();
    const id = setInterval(load, 30 * 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [base, enabled]);

  return state;
}

function init(base: string) {
  const w = readCache<Weather>('weather', base, WEATHER_TTL)?.data ?? null;
  const c = readCache<[number, number]>('coords', base)?.data ?? null;
  return { base, weather: w, coords: c, failed: false };
}

type Words = { DE: string; EN: string; IT: string; FR: string; SQ: string };
const WX: Record<string, Words> = {
  sunny: { DE: 'Sonnig', EN: 'Sunny', IT: 'Soleggiato', FR: 'Ensoleillé', SQ: 'Me diell' },
  clear: { DE: 'Klar', EN: 'Clear', IT: 'Sereno', FR: 'Dégagé', SQ: 'Kthjellët' },
  partly: { DE: 'Leicht bewölkt', EN: 'Partly cloudy', IT: 'Poco nuvoloso', FR: 'Peu nuageux', SQ: 'Pak vranët' },
  cloudy: { DE: 'Bewölkt', EN: 'Cloudy', IT: 'Nuvoloso', FR: 'Nuageux', SQ: 'Vranët' },
  fog: { DE: 'Nebel', EN: 'Fog', IT: 'Nebbia', FR: 'Brouillard', SQ: 'Mjegull' },
  rain: { DE: 'Regen', EN: 'Rain', IT: 'Pioggia', FR: 'Pluie', SQ: 'Shi' },
  snow: { DE: 'Schnee', EN: 'Snow', IT: 'Neve', FR: 'Neige', SQ: 'Borë' },
  showers: { DE: 'Schauer', EN: 'Showers', IT: 'Rovesci', FR: 'Averses', SQ: 'Rrebeshe' },
  storm: { DE: 'Gewitter', EN: 'Thunderstorm', IT: 'Temporale', FR: 'Orage', SQ: 'Stuhi' },
  mixed: { DE: 'Wechselhaft', EN: 'Changeable', IT: 'Variabile', FR: 'Variable', SQ: 'I ndryshueshëm' },
};

/** WMO-Wettercode → Kategorie */
export function weatherKind(code: number): 'clear' | 'partly' | 'cloudy' | 'fog' | 'rain' | 'snow' | 'storm' {
  if (code === 0) return 'clear';
  if (code <= 2) return 'partly';
  if (code === 3) return 'cloudy';
  if (code >= 45 && code <= 48) return 'fog';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'storm';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  return 'partly';
}

/** WMO-Wettercode → Beschreibung (alle Kiosk-Sprachen); nachts „Klar“ statt „Sonnig“ */
export function weatherLabel(code: number, language: string | null, night = false) {
  let key = 'mixed';
  if (code === 0) key = night ? 'clear' : 'sunny';
  else if (code <= 2) key = 'partly';
  else if (code === 3) key = 'cloudy';
  else if (code >= 45 && code <= 48) key = 'fog';
  else if (code >= 51 && code <= 67) key = 'rain';
  else if ((code >= 71 && code <= 77) || code === 85 || code === 86) key = 'snow';
  else if (code >= 80 && code <= 82) key = 'showers';
  else if (code >= 95) key = 'storm';
  const w = WX[key];
  return (language && (w as Record<string, string>)[language]) || w.DE;
}
