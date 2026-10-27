import { apiBaseUrl } from '../api/apiBaseUrl';
import { usePolledMethod } from './apiCache';

interface SystemSpecs {
  modulleistung: number;
  battery: string;
  charging_power: string;
  carport: string;
  awattar?: string;
}

interface Options {
  ipAdress?: string;
  enabled?: boolean;
}

/** Stammdaten einer Anlage (alle 30 s), Cache je Anlage */
export const useSystemSpecs = ({ ipAdress = apiBaseUrl, enabled = true }: Options = {}) => {
  const s = usePolledMethod<SystemSpecs>(ipAdress, 'kiosk_client_app.system_integration.doctype.invertar.invertar.get_system_specs', 'systemSpecs', 30_000, enabled);
  return { systemSpecs: s.data, loading: s.data == null && !s.error, error: s.error, updatedAt: s.at };
};
