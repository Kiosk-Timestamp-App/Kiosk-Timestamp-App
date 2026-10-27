import { apiBaseUrl } from '../api/apiBaseUrl';
import { usePolledMethod } from './apiCache';

export interface SystemData {
  solar_energy: number;
  grid: number;
  spend_energy: number;
  self_usage_percentage: number;
  total_percentage: number;
  timestamp: string;
}

interface Options {
  ipAdress?: string;
  /** false = nicht abrufen (versteckter Bildschirm) */
  enabled?: boolean;
  intervalMs?: number;
}

/**
 * Live-Werte einer Anlage (alle 7 s). Cache je Anlage mit Zeitstempel; `updatedAt` = letzter
 * erfolgreicher Abruf, `fromCache` = Wert stammt noch aus dem Zwischenspeicher (nicht live).
 */
export const useSystemData = ({ ipAdress = apiBaseUrl, enabled = true, intervalMs = 7000 }: Options = {}) => {
  const s = usePolledMethod<SystemData>(ipAdress, 'kiosk_client_app.system_integration.doctype.invertar.invertar.get_latest_system_log', 'systemData', intervalMs, enabled);
  return { systemData: s.data, loading: s.data == null && !s.error, error: s.error, updatedAt: s.at, fromCache: s.fromCache };
};
