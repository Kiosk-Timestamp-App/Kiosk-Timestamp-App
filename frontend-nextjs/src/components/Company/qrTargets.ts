/**
 * Zentrale Konfiguration der QR-Ziele des Bildschirms „Ihr Partner vor Ort“.
 *
 * Basis-URL (in dieser Reihenfolge):
 *   1. `localStorage['kioskQrBase']` – Vor-Ort-Übersteuerung ohne neuen Build
 *   2. `QR_CONFIG.baseOverride`
 *   3. Website aus dem Backend (`get_logo_and_website`)
 * QR-Codes werden sofort gezeigt (Koordinator-Entscheidung QA5): eine Existenzprüfung per HEAD ist cross-origin
 * nicht möglich (CORS verbirgt den Status) und erzeugt nur Konsolenfehler. Fehlende Seiten bis zum Website-Start sind akzeptiert.
 *
 * OFFEN (Kundenentscheidung): Die Pfade /termin, /angebot, /foerdercheck existieren derzeit nur auf der
 * Staging-Website (oekovolt-fe-at.vercel.app), nicht auf www.oekovolt.com.
 */

export type QrKey = 'termin' | 'angebot' | 'foerdercheck';

export const QR_CONFIG = {
  baseOverride: null as string | null,
  paths: { termin: '/termin', angebot: '/angebot', foerdercheck: '/foerdercheck' } satisfies Record<QrKey, string>,
  /** Kurze UTM-Kennung, damit Scans in der Web-Statistik messbar sind (kurz → gröbere, besser scanbare QR-Codes) */
  utm: { utm_source: 'kiosk', utm_medium: 'qr', utm_campaign: 'partner-vor-ort' },
};

/** Website aus dem Backend → absolute Basis-URL ohne abschließenden Schrägstrich */
export function normalizeWebsite(website: string | null | undefined) {
  const raw = website?.trim();
  if (!raw) return null;
  const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const u = new URL(withProto);
    return `${u.origin}${u.pathname.replace(/\/+$/, '')}`;
  } catch {
    return null;
  }
}

export function resolveQrBase(backendWebsite: string | null | undefined) {
  let local: string | null = null;
  try {
    local = localStorage.getItem('kioskQrBase');
  } catch {
    local = null;
  }
  return normalizeWebsite(local) ?? normalizeWebsite(QR_CONFIG.baseOverride) ?? normalizeWebsite(backendWebsite);
}

/** Seiten-URL (für die Prüfung) und Scan-URL (mit UTM) eines Ziels */
export function qrUrls(base: string, key: QrKey) {
  const page = `${base}${QR_CONFIG.paths[key]}`;
  const scan = new URL(page);
  Object.entries({ ...QR_CONFIG.utm, utm_content: key }).forEach(([k, v]) => scan.searchParams.set(k, v));
  return { page, scan: scan.toString() };
}
