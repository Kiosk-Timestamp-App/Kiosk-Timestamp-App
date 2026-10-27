import { useEffect, useMemo, useState, type RefObject } from 'react';
import { apiBaseUrl } from '../../api/apiBaseUrl';
import { qrUrls, resolveQrBase, type QrKey } from './qrTargets';
import { normalizeWebsite } from '../../hooks/useLogoAndWebsite';

const WEBSITE_REFRESH_MS = 15 * 60 * 1000;
const readCachedWebsite = () => {
  try {
    const saved = localStorage.getItem('logoAndWebsite');
    return normalizeWebsite(saved ? (JSON.parse(saved) as { website?: string }).website : null);
  } catch {
    return null;
  }
};

/**
 * Website-Einstellung aus dem Backend – anders als `useLogoAndWebsite` (nur beim Start) alle 15 Minuten neu,
 * damit eine geänderte Kunden-Website ohne Neustart in den QR-Codes ankommt.
 */
export function useCompanyWebsite() {
  const [website, setWebsite] = useState<string | null>(readCachedWebsite);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch(`${apiBaseUrl}kiosk_client_app.system_integration.doctype.okosys_settings.okosys_settings.get_logo_and_website`);
        if (!r.ok) return;
        const json = await r.json();
        const w = json?.message?.website;
        if (alive) setWebsite(normalizeWebsite(typeof w === 'string' ? w : null));
      } catch {
        /* offline: letzter bekannter Wert bleibt */
      }
    };
    load();
    const id = setInterval(load, WEBSITE_REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);
  return website;
}

/** Scan-URL eines QR-Ziels (sofort, ohne Netzprüfung) – null ohne konfigurierte Website */
export function useQrTarget(key: QrKey, website: string | null) {
  const base = resolveQrBase(website);
  return useMemo(() => (base ? qrUrls(base, key).scan : null), [base, key]);
}

/**
 * Größe der Bühne → Grundschrift (alle Maße in em) und Ausrichtung.
 * Hochformat 1080×1920 ≈ 18 px, Querformat 1920×1080 ≈ 17 px.
 */
export function useStageBox(ref: RefObject<HTMLElement | null>) {
  const [box, setBox] = useState({ w: 1030, h: 1600 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  const wide = box.w > box.h * 1.15;
  const fontPx = wide ? Math.min(box.w * 0.0098, box.h * 0.0215) : Math.min(box.w * 0.0176, box.h * 0.0118);
  return { ...box, wide, fontPx: Math.max(10, fontPx) };
}
