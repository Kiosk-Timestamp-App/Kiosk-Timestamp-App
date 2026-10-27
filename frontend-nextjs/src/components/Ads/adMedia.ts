import { useEffect, useMemo, useRef, useState } from 'react';
import type { CompanyAd, ZoneRow } from '../../template/AdsDisplay';

/** Medien-Server der Anzeigen (relative `attach_file`-Pfade werden hier aufgelöst, wie bisher) */
export const AD_MEDIA_HOST = 'http://10.10.200.190:8000';

/** Absolute URLs (http/https/data/blob) unverändert, sonst relativ zum Medien-Server */
export const mediaUrl = (file: string) => (/^(https?:|data:|blob:)/i.test(file) ? file : `${AD_MEDIA_HOST}${file}`);

/** Zeilen einer Zone inkl. Wiederholungen (`replay`) */
export function useZoneRows(ad: CompanyAd, zone: string): ZoneRow[] {
  const rows = ad.zones_data?.find((z) => z.zone === zone)?.rows;
  return useMemo(() => {
    const out: ZoneRow[] = [];
    rows?.forEach((row) => {
      const n = Math.max(1, parseInt(row.replay || '1', 10) || 1);
      for (let i = 0; i < n; i++) out.push(row);
    });
    return out;
  }, [rows]);
}

export const rowDurationMs = (row?: ZoneRow) => Math.max(1, row?.duration || 5) * 1000;

/**
 * Wiedergabeliste einer Zone. Jede Zeile bleibt `duration` Sekunden stehen.
 * `stopAfterMs`: kurz vor Ende der Anzeige wird nicht mehr weitergeschaltet,
 * damit beim Wechsel zur nächsten Anzeige kein Bild nur kurz aufblitzt.
 */
export function usePlaylist(rows: ZoneRow[], stopAfterMs?: number) {
  const [state, setState] = useState({ index: 0, cycle: 0 });
  const startRef = useRef(Date.now());
  const index = rows.length ? state.index % rows.length : 0;
  const item = rows[index];
  const ms = rowDurationMs(item);

  useEffect(() => {
    if (!rows.length) return;
    const elapsed = Date.now() - startRef.current;
    if (stopAfterMs && elapsed + ms >= stopAfterMs) return;
    const t = setTimeout(() => setState((s) => ({ index: (s.index + 1) % rows.length, cycle: s.cycle + 1 })), ms);
    return () => clearTimeout(t);
  }, [rows.length, ms, state.cycle, stopAfterMs]);

  return { index, item, cycle: state.cycle, ms };
}
