import { apiBaseUrl } from '../api/apiBaseUrl';
import { usePolledMethod } from './apiCache';

interface Co2Data {
  today_co2?: number;
  total_co2?: number;
  total_co2_unit?: string;
  today_trees_saved?: number;
  total_trees_saved?: number;
  today_energy?: number;
  total_energy?: number;
  total_energy_unit?: string;
}

interface Options {
  ipAdress?: string;
  enabled?: boolean;
}

/** CO₂-/Energie-Summen einer Anlage (alle 15 min), Cache je Anlage; Tageswerte nur vom selben Tag */
export const useCo2Data = ({ ipAdress = apiBaseUrl, enabled = true }: Options = {}) => {
  const s = usePolledMethod<Co2Data>(ipAdress, 'kiosk_client_app.system_integration.doctype.invertar.invertar.calculate_co2', 'co2Data', 15 * 60_000, enabled);
  const sameDay = s.at != null && new Date(s.at).toDateString() === new Date().toDateString();
  // Tageswerte (today_*) aus einem Cache von gestern wären falsch → verwerfen
  const co2Data = s.data && !sameDay ? { ...s.data, today_co2: undefined, today_energy: undefined, today_trees_saved: undefined } : s.data;
  return { co2Data, loading: s.data == null && !s.error, error: s.error, updatedAt: s.at };
};
