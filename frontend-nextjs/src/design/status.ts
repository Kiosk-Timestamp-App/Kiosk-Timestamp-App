/**
 * Aktualität der Live-Daten („live“ nur, wenn es wirklich live ist).
 * - live:    letzter erfolgreicher Abruf / Zeitstempel < 2 min alt
 * - stale:   < 20 min → „Stand HH:MM“
 * - offline: älter oder keine Daten nach Wartezeit → „Verbindung unterbrochen“
 * - pending: noch keine Daten, Wartezeit läuft
 */
import { useSyncExternalStore } from 'react';

export type LiveKind = 'live' | 'stale' | 'offline' | 'pending';
export interface LiveState {
  kind: LiveKind;
  /** Zeitpunkt der angezeigten Daten (ms) */
  at: number | null;
}

const LIVE_MS = 2 * 60_000;
const STALE_MS = 20 * 60_000;

/** Zeitpunkt der Daten: Zeitstempel der Anlage, falls plausibel, sonst Abrufzeit */
function dataTime(timestamp: string | undefined, updatedAt: number | null, now: number) {
  const ts = timestamp ? Date.parse(timestamp) : NaN;
  if (Number.isFinite(ts) && ts <= now + 5 * 60_000) return updatedAt != null ? Math.min(ts, updatedAt) : ts;
  return updatedAt;
}

export function liveStateOf(opts: { hasData: boolean; timestamp?: string; updatedAt: number | null; fromCache: boolean; graceOver: boolean; now: number }): LiveState {
  const { hasData, timestamp, updatedAt, fromCache, graceOver, now } = opts;
  if (!hasData) return { kind: graceOver ? 'offline' : 'pending', at: null };
  const at = dataTime(timestamp, updatedAt, now);
  if (at == null) return { kind: graceOver ? 'offline' : 'pending', at: null };
  const age = now - at;
  if (!fromCache && age < LIVE_MS) return { kind: 'live', at };
  if (age < STALE_MS) return { kind: fromCache && !graceOver ? 'pending' : 'stale', at };
  return { kind: 'offline', at };
}

/* ------------------------------------------------------------------ Status der eigenen Anlage (für die Kopfzeile) */

let own: LiveState = { kind: 'pending', at: null };
const listeners = new Set<() => void>();

export function setOwnLive(s: LiveState) {
  if (s.kind === own.kind && s.at === own.at) return;
  own = s;
  listeners.forEach((l) => l());
}

export function useOwnLive() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => own,
  );
}
