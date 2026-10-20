/** Zeit-Helfer für Europe/Vienna: Öffnungsstatus und Ablauf zeitgebundener Angaben. */

const TZ = 'Europe/Vienna';

export type ViennaParts = { y: number; m: number; d: number; wd: number; hh: number; mm: number };

const WD: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const fmt = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export function viennaParts(date: Date): ViennaParts {
  const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, wd: WD[p.weekday] ?? 0, hh: +p.hour % 24, mm: +p.minute };
}

/** Lokale Wiener Wanduhrzeit als vergleichbarer Schlüssel „YYYY-MM-DDTHH:MM“ */
const key = (p: Pick<ViennaParts, 'y' | 'm' | 'd' | 'hh' | 'mm'>) =>
  `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}T${String(p.hh).padStart(2, '0')}:${String(p.mm).padStart(2, '0')}`;

/** Ist die Angabe (Wiener Ortszeit, z. B. „2026-12-31T23:59:59“) noch gültig? */
export const isStillValid = (now: Date, until: string) => key(viennaParts(now)) <= until.slice(0, 16);

/* ---------------------------------------------------------------- Feiertage AT */

function easterSunday(y: number) {
  // Anonymer gregorianischer Algorithmus
  const a = y % 19;
  const b = Math.floor(y / 100);
  const c = y % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return Date.UTC(y, month - 1, day);
}

/**
 * Gesetzliche Feiertage in Österreich (`holiday`) sowie 24. und 31. Dezember (`closed`, laut /kontakt geschlossen).
 */
function closedReason(y: number, m: number, d: number): 'holiday' | 'closed' | null {
  const md = `${m}-${d}`;
  if (md === '12-24' || md === '12-31') return 'closed';
  const fixed = ['1-1', '1-6', '5-1', '8-15', '10-26', '11-1', '12-8', '12-25', '12-26'];
  if (fixed.includes(md)) return 'holiday';
  const e = easterSunday(y);
  const t = Date.UTC(y, m - 1, d);
  const off = Math.round((t - e) / 86400000);
  // Ostermontag, Christi Himmelfahrt, Pfingstmontag, Fronleichnam
  return off === 1 || off === 39 || off === 50 || off === 60 ? 'holiday' : null;
}

/** Öffnungszeiten laut Website: Mo–Do 08:00–16:00, Fr 08:00–13:00 */
function hoursFor(wd: number): [number, number] | null {
  if (wd >= 1 && wd <= 4) return [8 * 60, 16 * 60];
  if (wd === 5) return [8 * 60, 13 * 60];
  return null;
}

const WD_LONG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
/** „8:00“ / „16:00“ – Stunde ohne führende Null, wie gesprochen */
const hm = (min: number) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;
const dm = (d: number, m: number) => `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.`;

export type OpenStatus =
  | { open: true; until: string; todayIdx: number }
  | { open: false; reason: 'holiday' | 'closed' | null; next: string; todayIdx: number };

/**
 * Live-Status (Wiener Ortszeit):
 * „Jetzt geöffnet · bis 16:00 Uhr“ · „öffnet heute/morgen um 8:00 Uhr“ · „öffnet Dienstag um 8:00 Uhr“ ·
 * ab dem dritten Tag mit Datum „öffnet Montag, 04.01., um 8:00 Uhr“. An Feiertagen mit Grund.
 */
export function openStatus(now: Date): OpenStatus {
  const p = viennaParts(now);
  const nowMin = p.hh * 60 + p.mm;
  const reason = closedReason(p.y, p.m, p.d);
  // Zeile der Öffnungszeiten, die heute gilt (0 = Mo–Do, 1 = Fr, -1 = Wochenende, -2 = Feiertag/geschlossen)
  const todayIdx = reason ? -2 : p.wd >= 1 && p.wd <= 4 ? 0 : p.wd === 5 ? 1 : -1;
  const today = reason ? null : hoursFor(p.wd);
  if (today && nowMin >= today[0] && nowMin < today[1]) return { open: true, until: hm(today[1]), todayIdx };
  if (today && nowMin < today[0]) return { open: false, reason, next: `heute um ${hm(today[0])}`, todayIdx };
  const base = Date.UTC(p.y, p.m - 1, p.d);
  for (let i = 1; i <= 14; i++) {
    const dt = new Date(base + i * 86400000);
    const y = dt.getUTCFullYear();
    const m = dt.getUTCMonth() + 1;
    const d = dt.getUTCDate();
    const wd = dt.getUTCDay();
    const h = closedReason(y, m, d) ? null : hoursFor(wd);
    if (h) {
      const when = i === 1 ? 'morgen um' : i === 2 ? `${WD_LONG[wd]} um` : `${WD_LONG[wd]}, ${dm(d, m)}, um`;
      return { open: false, reason, next: `${when} ${hm(h[0])}`, todayIdx };
    }
  }
  return { open: false, reason, next: '', todayIdx };
}
