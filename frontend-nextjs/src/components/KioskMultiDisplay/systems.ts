export interface SystemConfiguration {
  name: string;
  prefix_domain: string;
  ip_address: string;
  method: string;
  company_name: string;
  place: string;
  interval: number; // Minuten
}

/** Anzeigedauer je Anlage – identisch zur Summe, mit der App.tsx den Bildschirm taktet */
export const intervalMsOf = (c: SystemConfiguration) => Math.max(5000, (c.interval || 1) * 60_000);

/** API-Basis einer Anlage (wie bisher: <prefix>://<ip>/api/method/) */
export const baseUrlOf = (c: SystemConfiguration) => `${c.prefix_domain}://${c.ip_address}/api/method/`;
