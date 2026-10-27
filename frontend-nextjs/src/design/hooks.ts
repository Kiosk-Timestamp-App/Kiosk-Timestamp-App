import { createContext, useContext, useEffect, useState, type CSSProperties, type RefObject } from 'react';

/** Aktuelle Zeit, aktualisiert im angegebenen Intervall */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** Verzögerung für gestaffelte Eintritte (`ov-rise`, `ov-enter-*`) */
export const delay = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties;

/** Übersetzung nach Sprachcode aus dem Backend (DE ist Standard) */
export const tr = (language: string | null, t: { DE: string; EN?: string; IT?: string; FR?: string; SQ?: string }) =>
  (language && (t as Record<string, string | undefined>)[language]) || t.DE;

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Ist der umgebende App-Bildschirm (`.ov-screen[data-active]`) gerade sichtbar?
 * Ohne umgebenden Bildschirm immer `true`. Dient zum Pausieren von Animationsschleifen
 * und zum erneuten Abspielen der Eintritte bei jedem Bildschirmwechsel.
 */
export function useScreenActive(ref: RefObject<HTMLElement | null>) {
  const [active, setActive] = useState(true);
  useEffect(() => {
    const screen = ref.current?.closest('.ov-screen');
    if (!screen) return;
    const read = () => setActive(screen.getAttribute('data-active') !== 'false');
    read();
    const mo = new MutationObserver(read);
    mo.observe(screen, { attributes: true, attributeFilter: ['data-active'] });
    return () => mo.disconnect();
  }, [ref]);
  return active;
}

/**
 * Wiedergabe-Epoche: wird bei jedem Eintritt eines Bildschirms erhöht.
 * `CountUp` zählt dann erneut von 0 hoch, Diagramme zeichnen sich neu.
 */
export const ReplayContext = createContext(0);
export const useReplay = () => useContext(ReplayContext);

/** true, sobald `ms` seit dem Einhängen vergangen sind (z. B. „Daten derzeit nicht verfügbar“ statt ewigem Skelett) */
export function useGrace(ms: number) {
  const [over, setOver] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setOver(true), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return over;
}

/** Wenn true, zeigen Zahlen „–“ statt Lade-Skelett (Daten nach Wartezeit nicht verfügbar) */
export const UnavailableContext = createContext(false);

/**
 * Zahlformat für ALLE Bildschirme (Kiosk, Karte, Insights, Unternehmen): de-AT nach CLDR,
 * d. h. Tausender mit geschütztem Leerzeichen U+00A0 („10 224“), Dezimalkomma, feste Nachkommastellen.
 * Bitte überall diesen Helfer verwenden statt eigener Intl-Aufrufe – so bleiben die Schreibweisen einheitlich.
 * Einheiten mit `NNBSP` anhängen: `${fmtNum(v)}${NNBSP}kWh`.
 */
export const fmtNum = (v: number, d = 1) => new Intl.NumberFormat('de-AT', { minimumFractionDigits: d, maximumFractionDigits: d }).format(v);

/** Schmales geschütztes Leerzeichen zwischen Zahl und Einheit */
export const NNBSP = '\u202F';

/** Leistung automatisch in kW oder MW */
export function autoPower(kw: number): { value: number; unit: string; decimals: number } {
  return Math.abs(kw) >= 1000 ? { value: kw / 1000, unit: 'MW', decimals: 2 } : { value: kw, unit: 'kW', decimals: Math.abs(kw) >= 100 ? 0 : 1 };
}

/** Energie automatisch in kWh, MWh oder GWh */
export function autoEnergy(kwh: number): { value: number; unit: string; decimals: number } {
  const a = Math.abs(kwh);
  if (a >= 1e6) return { value: kwh / 1e6, unit: 'GWh', decimals: 1 };
  if (a >= 10_000) return { value: kwh / 1000, unit: 'MWh', decimals: 1 };
  return { value: kwh, unit: 'kWh', decimals: a >= 100 ? 0 : 1 };
}
