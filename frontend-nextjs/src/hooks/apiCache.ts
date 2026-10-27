import { useEffect, useRef, useState } from 'react';

/**
 * Zwischenspeicher je API-Basis (Anlage) mit Zeitstempel.
 * Früher lagen systemData/systemSpecs/lastCo2Data global in localStorage → nach Reload oder
 * Backend-Ausfall erschienen Werte einer anderen Anlage. Jetzt: Schlüssel = Name + Hash der Basis,
 * und jeder Eintrag trägt den Zeitpunkt des letzten erfolgreichen Abrufs.
 */
export interface Cached<T> {
  data: T;
  /** ms seit Epoche – letzter erfolgreicher Abruf */
  at: number;
}

const hash = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
};

export const cacheKey = (name: string, base: string) => `ov-cache:${name}:${hash(base)}`;

export function readCache<T>(name: string, base: string, maxAgeMs = Infinity): Cached<T> | null {
  try {
    const raw = localStorage.getItem(cacheKey(name, base));
    const c = raw ? (JSON.parse(raw) as Cached<T>) : null;
    if (!c || c.data == null || !Number.isFinite(c.at)) return null;
    return Date.now() - c.at <= maxAgeMs ? c : null;
  } catch {
    return null;
  }
}

export function writeCache<T>(name: string, base: string, data: T) {
  try {
    localStorage.setItem(cacheKey(name, base), JSON.stringify({ data, at: Date.now() } satisfies Cached<T>));
  } catch {
    /* Speicher voll – kein Cache */
  }
}

/**
 * Pollt eine Frappe-Methode einer Anlage. Liefert den letzten guten Wert samt Zeitpunkt.
 * - Start mit dem Cache genau dieser Anlage (nie einer fremden); `fromCache` bis zum ersten Erfolg
 * - `enabled = false` → kein Abruf (z. B. versteckter Multi-Anlagen-Bildschirm)
 */
export function usePolledMethod<T>(base: string, method: string, name: string, intervalMs: number, enabled = true, maxCacheAgeMs = Infinity) {
  const [state, setState] = useState<{ data: T | null; at: number | null; fromCache: boolean; error: string | null; base: string }>(() => {
    const c = readCache<T>(name, base, maxCacheAgeMs);
    return { data: c?.data ?? null, at: c?.at ?? null, fromCache: !!c, error: null, base };
  });
  const lastJson = useRef<string | null>(null);

  // Anlage gewechselt → sofort deren eigenen Cache zeigen (niemals Werte der vorherigen Anlage)
  if (state.base !== base) {
    const c = readCache<T>(name, base, maxCacheAgeMs);
    setState({ data: c?.data ?? null, at: c?.at ?? null, fromCache: !!c, error: null, base });
  }

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(`${base}${method}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json?.message == null) throw new Error('Keine Daten');
        if (!alive) return;
        const text = JSON.stringify(json.message);
        const now = Date.now();
        writeCache(name, base, json.message as T);
        if (text !== lastJson.current) {
          lastJson.current = text;
          setState({ data: json.message as T, at: now, fromCache: false, error: null, base });
        } else {
          setState((s) => ({ ...s, at: now, fromCache: false, error: null }));
        }
      } catch (err) {
        if (alive) setState((s) => ({ ...s, error: err instanceof Error ? err.message : String(err) }));
      }
    };
    load();
    const id = setInterval(load, intervalMs);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [base, method, name, intervalMs, enabled]);

  return state;
}
