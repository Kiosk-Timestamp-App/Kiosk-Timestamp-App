import { useEffect, useState } from 'react';
import type { MapDataConfig } from '../../../hooks/useMapData';

/** Antwort von electricitymaps „power-breakdown/latest“ (nur genutzte Felder) */
export interface PowerBreakdown {
  datetime?: string;
  isEstimated?: boolean;
  powerConsumptionBreakdown: Record<string, number | null>;
  powerProductionBreakdown: Record<string, number | null>;
  powerImportBreakdown?: Record<string, number | null>;
  powerExportBreakdown?: Record<string, number | null>;
  renewablePercentage?: number | null;
  fossilFreePercentage?: number | null;
  powerConsumptionTotal?: number | null;
  powerProductionTotal?: number | null;
  powerImportTotal?: number | null;
  powerExportTotal?: number | null;
}

export interface CarbonIntensity {
  carbonIntensity: number | null;
  datetime?: string;
  isEstimated?: boolean;
}

export interface HistoryPoint {
  t: number;
  v: number;
  estimated: boolean;
}

export interface GridData {
  /** CO₂-Intensität der letzten 24 h (null = Endpunkt für dieses Token/Zone nicht verfügbar) */
  history: HistoryPoint[] | null;
  power: PowerBreakdown | null;
  carbon: CarbonIntensity | null;
  /** erster Abruf läuft noch */
  loading: boolean;
  /** letzter Abruf fehlgeschlagen (vorhandene Daten bleiben sichtbar) */
  error: boolean;
  /** Zeitpunkt des angezeigten zwischengespeicherten Stands (null = Daten stammen aus einem Live-Abruf) */
  cachedAt: number | null;
}

interface Snapshot {
  power: PowerBreakdown | null;
  carbon: CarbonIntensity | null;
  history: HistoryPoint[] | null;
  savedAt: number;
}

const snapKey = (cfg: MapDataConfig) => `ov-grid-snapshot:${cfg.api_data_url}`;

/** Letzten gültigen Stand lesen (überlebt Neuladen und Netzausfall; nie älter als 7 Tage) */
function loadSnapshot(cfg: MapDataConfig | null): Snapshot | null {
  if (!cfg) return null;
  try {
    const raw = localStorage.getItem(snapKey(cfg));
    const s = raw ? (JSON.parse(raw) as Snapshot) : null;
    return s && s.power && Date.now() - s.savedAt < 7 * 864e5 ? s : null;
  } catch {
    return null;
  }
}

function saveSnapshot(cfg: MapDataConfig, s: Snapshot) {
  try {
    localStorage.setItem(snapKey(cfg), JSON.stringify(s));
  } catch {
    /* Speicher voll/gesperrt – Anzeige funktioniert trotzdem */
  }
}

const REFRESH_MS = 15 * 60 * 1000;
const RETRY_MS = 60 * 1000;

async function getJson<T>(url: string, token: string, signal: AbortSignal): Promise<T> {
  const res = await fetch(url, { headers: { 'auth-token': token }, signal });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

/**
 * Ein gemeinsamer Abruf für den ganzen Bildschirm (vorher holten vier Komponenten dieselben Daten getrennt).
 * Alle 15 min neu; nach einem Fehler nach 1 min erneut. Es werden nie Ersatzwerte erfunden.
 */
export function useGridData(cfg: MapDataConfig | null): GridData {
  const [state, setState] = useState<GridData>(() => {
    const snap = loadSnapshot(cfg);
    return { power: snap?.power ?? null, carbon: snap?.carbon ?? null, history: snap?.history ?? null, loading: true, error: false, cachedAt: snap?.savedAt ?? null };
  });

  useEffect(() => {
    if (!cfg) return;
    const ctrl = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const load = async () => {
      // Verlauf: gleicher Endpunkt mit /history statt /latest (nur wenn die URL dem Schema folgt)
      const historyUrl = cfg.api_carbon_url.includes('/latest') ? cfg.api_carbon_url.replace('/latest', '/history') : null;
      const [p, c, h] = await Promise.allSettled([
        getJson<PowerBreakdown>(cfg.api_data_url, cfg.token, ctrl.signal),
        getJson<CarbonIntensity>(cfg.api_carbon_url, cfg.token, ctrl.signal),
        historyUrl ? getJson<{ history?: Array<{ carbonIntensity: number | null; datetime: string; isEstimated?: boolean }> }>(historyUrl, cfg.token, ctrl.signal) : Promise.reject(new Error('no history url')),
      ]);
      const hist =
        h.status === 'fulfilled' && Array.isArray(h.value?.history)
          ? h.value.history
              .filter((x) => typeof x.carbonIntensity === 'number')
              .map((x) => ({ t: Date.parse(x.datetime), v: x.carbonIntensity as number, estimated: !!x.isEstimated }))
              .filter((x) => Number.isFinite(x.t))
          : null;
      if (ctrl.signal.aborted) return;
      const failed = p.status === 'rejected' || c.status === 'rejected';
      if (failed) console.error('Strommix: electricitymaps-Abruf fehlgeschlagen', p.status === 'rejected' ? p.reason : '', c.status === 'rejected' ? c.reason : '');
      setState((s) => {
        const okP = p.status === 'fulfilled' && !!p.value?.powerProductionBreakdown;
        const okC = c.status === 'fulfilled' && typeof c.value?.carbonIntensity === 'number';
        const next: GridData = {
          power: okP ? (p.value as PowerBreakdown) : s.power,
          carbon: okC ? (c.value as CarbonIntensity) : s.carbon,
          history: hist && hist.length > 1 ? hist : s.history,
          loading: false,
          error: failed,
          cachedAt: okP && okC ? null : s.cachedAt,
        };
        if (okP && okC) saveSnapshot(cfg, { power: next.power, carbon: next.carbon, history: next.history, savedAt: Date.now() });
        return next;
      });
      timer = setTimeout(load, failed ? RETRY_MS : REFRESH_MS);
    };

    load();
    return () => {
      ctrl.abort();
      clearTimeout(timer);
    };
  }, [cfg]);

  return state;
}
