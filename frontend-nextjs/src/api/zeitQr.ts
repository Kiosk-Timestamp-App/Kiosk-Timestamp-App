/**
 * Stempel-QR der Zeiterfassung (Projekt „Zeiterfassuing“) – derselbe rotierende Code wie am Empfangsbildschirm.
 *
 * Quelle: Brücke der Zeiterfassung `GET <ZEIT_URL>/api/display/qr-token` (Bearer-Anzeige-Schlüssel).
 * Die Frappe-Zugangsdaten des Kiosk-Geräts bleiben auf dem Zeiterfassungs-Server; der TV kennt nur seinen Schlüssel.
 *
 * Einrichtung am TV (einmalig, kein neuer Build nötig) – Seite einmal so öffnen:
 *   …/?zeitKey=<DISPLAY_QR_KEY>&zeitTenant=AT   (bzw. DE; optional zusätzlich &zeitUrl=<weitere Adresse>)
 * Alles landet im localStorage des TVs und wird sofort aus der Adresszeile entfernt.
 * zeitTenant wählt die Gesellschaft (Brücke: `?tenant=`, je Mandant eigener Kiosk-Benutzer); ohne Angabe gilt
 * NEXT_PUBLIC_ZEIT_TENANT bzw. der Standard der Brücke.
 *
 * Adressen in dieser Reihenfolge (die erste, die antwortet, gewinnt):
 *   1. online   NEXT_PUBLIC_ZEIT_URL       bzw. https://zeit.oekovolt.at
 *   2. optional zeitUrl aus der Einrichtung
 *   3. lokal    NEXT_PUBLIC_ZEIT_LOCAL_URL bzw. http://192.168.1.100:3000  (Firmennetz)
 * Die zuletzt funktionierende Adresse wird beibehalten; ist das die lokale, wird alle 5 min erneut online geprüft.
 * Der QR-Code führt auf dieselbe Adresse (<Adresse>/m/scan?t=…) – online erreichbar → Online-Link, sonst lokaler Link.
 *
 * Ein Code gilt nur für EINE Buchung (Zeiterfassung, Release 20.10.2026: zweiter Scan → „qr_replayed“). Nach dem ersten
 * Scan liefert kiosk.qr_token sofort einen neuen Code. Darum alle 2 s nachfragen (wie der Empfangsbildschirm,
 * use-qr-consumed.ts, QR_STATE_POLL_MS = 2000) und den neuen Code sofort zeigen. `?current=<token>` erlaubt der
 * Brücke, mit `{unchanged: true}` zu antworten, solange der Code noch gilt (kiosk_qr.state) – beides wird verstanden.
 */
import { useSyncExternalStore } from 'react';

const trimUrl = (u: string) => u.trim().replace(/\/+$/, '');
export const ZEIT_DEFAULT_URL = trimUrl(process.env.NEXT_PUBLIC_ZEIT_URL || 'https://zeit.oekovolt.at');
export const ZEIT_LOCAL_URL = trimUrl(process.env.NEXT_PUBLIC_ZEIT_LOCAL_URL || 'http://192.168.1.100:3000');
/** Wie oft bei lokaler Verbindung wieder die Online-Adresse versucht wird */
const ONLINE_RECHECK_MS = 5 * 60 * 1000;
/** Pro Adresse kurz warten – eine nicht erreichbare Adresse darf den Wechsel nicht blockieren */
const ATTEMPT_TIMEOUT_MS = 5_000;
/** Nachfrage-Takt: benutzter Code wird spätestens nach 2 s ersetzt */
const STATE_POLL_MS = 2_000;
const KEY_STORAGE = 'zeitQrKey';
const URL_STORAGE = 'zeitQrUrl';
const TENANT_STORAGE = 'zeitQrTenant';

export interface ZeitQr {
  token: string;
  scan_url: string;
  rotate_in: number;
  rotation_seconds?: number;
  valid_seconds?: number;
  expires_at?: string;
  location: string | null;
  present: number | null;
}

/** not_configured = kein Schlüssel am TV · unauthorized = Schlüssel/IP abgelehnt · unavailable = Server/Netz */
export type ZeitQrError = 'not_configured' | 'unauthorized' | 'unavailable';

export interface ZeitQrState {
  data: ZeitQr | null;
  /** Zeitpunkt des letzten erfolgreichen Abrufs (ms) */
  fetchedAt: number;
  error: ZeitQrError | null;
  /** Adresse, über die der Code zuletzt kam (online oder lokal) */
  base: string | null;
}

const read = (k: string) => {
  try {
    return localStorage.getItem(k)?.trim() || null;
  } catch {
    return null;
  }
};

/** Einmalige Einrichtung per Adresszeile: ?zeitKey=…&zeitUrl=… → localStorage, danach aus der URL entfernen */
function adoptFromUrl() {
  if (typeof window === 'undefined') return;
  const u = new URL(window.location.href);
  let changed = false;
  // neuer Schlüssel ohne zeitUrl → alte Zusatzadresse aus früheren Tests verwerfen
  if (u.searchParams.has('zeitKey') && !u.searchParams.has('zeitUrl')) u.searchParams.set('zeitUrl', '');
  for (const [param, storage] of [['zeitKey', KEY_STORAGE], ['zeitUrl', URL_STORAGE], ['zeitTenant', TENANT_STORAGE]] as const) {
    const v = u.searchParams.get(param);
    if (v === null) continue;
    try {
      if (v.trim()) localStorage.setItem(storage, v.trim());
      else localStorage.removeItem(storage);
    } catch {
      /* ohne Speicher gilt der Wert nur bis zum Neuladen nicht – Hinweis erscheint am Bildschirm */
    }
    u.searchParams.delete(param);
    changed = true;
  }
  if (changed) window.history.replaceState(null, '', u.toString());
}

const config = () => {
  const extra = read(URL_STORAGE);
  const tenant = (read(TENANT_STORAGE) || process.env.NEXT_PUBLIC_ZEIT_TENANT || '').trim().toUpperCase() || null;
  return { key: read(KEY_STORAGE), tenant, bases: [...new Set([ZEIT_DEFAULT_URL, ...(extra ? [trimUrl(extra)] : []), ZEIT_LOCAL_URL])] };
};

/* ------------------------------------------------------------------ gemeinsamer Abruf (ein Abruf für Fußzeile + Vollbild) */

let state: ZeitQrState = { data: null, fetchedAt: 0, error: null, base: null };
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | null = null;
let running = false;
/** zuletzt funktionierende Adresse und letzter Online-Versuch */
let lastGood: string | null = null;
let lastOnlineTry = 0;

const emit = (next: ZeitQrState) => {
  state = next;
  listeners.forEach((l) => l());
};

type Attempt =
  | { ok: true; data: ZeitQr; unchanged?: false }
  | { ok: true; unchanged: true }
  | { ok: false; error: Exclude<ZeitQrError, 'not_configured'> };

async function fetchFrom(base: string, key: string, tenant: string | null, current: string | null): Promise<Attempt> {
  try {
    const params = new URLSearchParams();
    if (tenant) params.set('tenant', tenant);
    if (current) params.set('current', current);
    const q = params.size ? `?${params}` : '';
    const res = await fetch(`${base}/api/display/qr-token${q}`, {
      headers: { Authorization: `Bearer ${key}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
    });
    if (res.status === 401 || res.status === 404) return { ok: false, error: 'unauthorized' };
    if (!res.ok) return { ok: false, error: 'unavailable' };
    const data = (await res.json()) as ZeitQr & { unchanged?: boolean };
    if (data?.unchanged) return { ok: true, unchanged: true };
    if (!data?.token) return { ok: false, error: 'unavailable' };
    // QR führt auf die Adresse, die gerade funktioniert (online bzw. Firmennetz) – wie am Empfang: <Adresse>/m/scan?t=…
    return { ok: true, data: { ...data, scan_url: `${base}/m/scan?t=${encodeURIComponent(data.token)}` } };
  } catch {
    return { ok: false, error: 'unavailable' };
  }
}

/** Reihenfolge: zuletzt funktionierende Adresse zuerst – außer es ist Zeit, wieder online zu prüfen */
function order(bases: string[], now: number) {
  const online = bases[0];
  if (!lastGood || !bases.includes(lastGood) || lastGood === online) return bases;
  if (now - lastOnlineTry >= ONLINE_RECHECK_MS) return bases;
  return [lastGood, ...bases.filter((b) => b !== lastGood)];
}

async function poll() {
  timer = null;
  const { key, tenant, bases } = config();
  if (!key) {
    emit({ data: null, fetchedAt: 0, error: 'not_configured', base: null });
    schedule(60_000); // Schlüssel kann jederzeit nachgetragen werden
    return;
  }
  const now = Date.now();
  let error: Exclude<ZeitQrError, 'not_configured'> = 'unavailable';
  for (const base of order(bases, now)) {
    if (base === bases[0]) lastOnlineTry = now;
    // aktueller Code nur an die Adresse, von der er stammt – und nur solange er nicht rotiert (sonst voller Abruf)
    const current = state.data && state.base === base && qrTiming(state, now).left > 1_500 ? state.data.token : null;
    const r = await fetchFrom(base, key, tenant, current);
    if (r.ok) {
      lastGood = base;
      if (r.unchanged) {
        if (state.error || state.base !== base) emit({ ...state, error: null, base });
      } else if (r.data.token !== state.data?.token || state.error || state.base !== base) {
        // neuer Code (benutzt oder Rotation) – sofort zeigen, Countdown neu
        emit({ data: r.data, fetchedAt: Date.now(), error: null, base });
      } else if (r.data.present !== state.data.present) {
        // gleicher Code: Countdown nicht zurücksetzen, nur die Anwesenden aktualisieren
        emit({ ...state, data: { ...state.data, present: r.data.present } });
      }
      schedule(STATE_POLL_MS);
      return;
    }
    if (r.error === 'unauthorized') error = 'unauthorized';
  }
  emit({ ...state, error });
  schedule(error === 'unauthorized' ? 60_000 : 10_000);
}

function schedule(ms: number) {
  if (!running) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(poll, ms);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!running) {
    running = true;
    adoptFromUrl();
    void poll();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      running = false;
      if (timer) clearTimeout(timer);
      timer = null;
    }
  };
}

const SERVER_STATE: ZeitQrState = { data: null, fetchedAt: 0, error: null, base: null };

/** Rotierender Stempel-QR (geteilt zwischen allen Anzeigen) */
export function useZeitQr(): ZeitQrState {
  return useSyncExternalStore(subscribe, () => state, () => SERVER_STATE);
}

/**
 * Countdown bis zum nächsten Code und „veraltet“ – wie am Empfangsbildschirm: ein nicht erneuerter Code gilt
 * mindestens eine Rotationsperiode ab Abruf; danach (+5 s Puffer) wird er nicht mehr gezeigt.
 */
export function qrTiming(s: ZeitQrState, now: number) {
  const rotate = (s.data?.rotate_in ?? 30) * 1000;
  const elapsed = s.data && s.fetchedAt ? now - s.fetchedAt : 0;
  const left = Math.max(0, rotate - elapsed);
  return { left, fraction: rotate ? left / rotate : 0, secs: Math.ceil(left / 1000), stale: Boolean(s.data) && elapsed > rotate + 5_000 };
}
