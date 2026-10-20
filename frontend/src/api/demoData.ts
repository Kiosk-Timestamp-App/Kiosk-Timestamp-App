/**
 * Demo-Daten statt Kiosk-Backend.
 *
 * Fängt alle Aufrufe an `…/api/method/kiosk_client_app…` ab und antwortet lokal mit plausiblen Werten.
 * Ausnahme: `get_maps_data` (Strommix-Karte) geht weiterhin an das echte Backend.
 * Öffentliche Dienste (aWATTar, Open-Meteo, Electricity Maps) bleiben unverändert.
 *
 * Die Werte folgen einer Tageskurve (Sonnenauf-/-untergang je nach Jahreszeit). Bewölkung und Verbrauch
 * werden je 15-Minuten-Abschnitt per Zufall (mit festem Startwert) gewürfelt – sie ändern sich also alle
 * 15 Minuten und bleiben nach einem Neuladen gleich. Zwischen zwei Abschnitten wird weich übergeblendet.
 *
 * Abschalten: `DEMO_DATA = false` → alles geht wieder an das echte Backend.
 */
import { apiBaseUrl } from './apiBaseUrl';
import { liveLogKey, type LiveSample } from '../design/kiosk/liveLog';

export const DEMO_DATA = true;

/* ------------------------------------------------------------------ Anlage */

const PEAK_KWP = 29.6;
const INSTALLED = new Date(2021, 3, 14); // Inbetriebnahme
const KWH_PER_KWP_YEAR = 1080;
const CO2_KG_PER_KWH = 0.227;
const KG_CO2_PER_TREE_YEAR = 12.5;
const COORDS: [number, number] = [48.2082, 16.3738];

/* ------------------------------------------------------------------ Zufall mit festem Startwert */

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};
/** Zufallszahl 0…1, immer gleich für denselben Schlüssel */
const rand = (key: string) => {
  let t = (hash(key) + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dayOfYear = (d: Date) => Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(), 0, 0)) / 86_400_000);
const round = (v: number, digits = 2) => Math.round(v * 10 ** digits) / 10 ** digits;

/* ------------------------------------------------------------------ Modell: Erzeugung und Verbrauch (kW) */

/** Wetter des Tages: 0.25 (trüb) … 1 (klar) */
const dayClarity = (day: string) => 0.25 + 0.75 * Math.pow(rand(`day:${day}`), 0.6);

/** Bewölkung eines 15-min-Abschnitts */
const slotClarity = (day: string, slot: number) => {
  const base = dayClarity(day);
  const r = rand(`cloud:${day}:${slot}`);
  return Math.min(1, Math.max(0.12, base + (r - 0.5) * 0.45 * (1.2 - base)));
};

/** Mittlere Leistung (kW) im Abschnitt `slot` (0…95) eines Tages */
function solarAt(date: Date, slot: number) {
  const doy = dayOfYear(date);
  const season = Math.sin((2 * Math.PI * (doy - 80)) / 365); // −1 Winter … +1 Sommer
  const dayLen = 12 + 3.9 * season; // Stunden
  const summerTime = date.getTimezoneOffset() < new Date(date.getFullYear(), 0, 1).getTimezoneOffset();
  const noon = 11.95 + (summerTime ? 1 : 0);
  const h = slot / 4 + 0.125;
  const x = (h - (noon - dayLen / 2)) / dayLen;
  if (x <= 0 || x >= 1) return 0;
  const elevation = 0.62 + 0.3 * season; // Wintersonne steht flacher
  const shape = Math.pow(Math.sin(Math.PI * x), 1.35);
  return PEAK_KWP * 0.86 * elevation * shape * slotClarity(ymd(date), slot);
}

function consumptionAt(date: Date, slot: number) {
  const h = slot / 4;
  const weekend = date.getDay() === 0 || date.getDay() === 6;
  const morning = Math.exp(-((h - 7.2) ** 2) / 1.6) * (weekend ? 1.2 : 2.1);
  const noon = Math.exp(-((h - 12.5) ** 2) / 2) * (weekend ? 1.6 : 0.9);
  const evening = Math.exp(-((h - 19) ** 2) / 3) * 2.8;
  const r = rand(`use:${ymd(date)}:${slot}`);
  const spike = r > 0.9 ? 2 + r * 3 : 0; // Herd, Waschmaschine, E-Auto …
  return 0.55 + morning + noon + evening + spike + (r - 0.5) * 0.5;
}

/** Werte im Abschnitt, weich zum nächsten Abschnitt übergeblendet (Zeitpunkt `t`) */
function liveAt(t: Date) {
  const minutes = t.getHours() * 60 + t.getMinutes() + t.getSeconds() / 60;
  const slot = Math.floor(minutes / 15);
  const f = (minutes - slot * 15) / 15;
  const ease = f * f * (3 - 2 * f);
  const next = Math.min(95, slot + 1);
  const mix = (a: number, b: number) => a + (b - a) * ease;
  const solar = mix(solarAt(t, slot), solarAt(t, next));
  const use = mix(consumptionAt(t, slot), consumptionAt(t, next));
  return { solar, use };
}

/** Summen eines Tages bis Abschnitt `untilSlot` (exklusiv), kWh */
function dayTotals(date: Date, untilSlot = 96) {
  let solar = 0;
  let use = 0;
  let self = 0;
  let imported = 0;
  let exported = 0;
  for (let s = 0; s < untilSlot; s++) {
    const p = solarAt(date, s) * 0.25;
    const u = consumptionAt(date, s) * 0.25;
    solar += p;
    use += u;
    self += Math.min(p, u);
    imported += Math.max(0, u - p);
    exported += Math.max(0, p - u);
  }
  return { solar, use, self, imported, exported };
}

const daysAgo = (n: number) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
};

/* ------------------------------------------------------------------ Antworten je Methode */

function systemLog() {
  const now = new Date();
  const { solar, use } = liveAt(now);
  const jitter = 1 + (Math.random() - 0.5) * 0.03; // kleine Messschwankung zwischen zwei Abrufen
  const s = round(solar * jitter);
  const u = round(use * (1 + (Math.random() - 0.5) * 0.02));
  const slot = Math.floor((now.getHours() * 60 + now.getMinutes()) / 15);
  const today = dayTotals(now, slot + 1);
  return {
    solar_energy: s,
    spend_energy: u,
    grid: round(u - s),
    self_usage_percentage: today.solar > 0 ? round((today.self / today.solar) * 100, 1) : 0,
    total_percentage: today.use > 0 ? round((today.self / today.use) * 100, 1) : 0,
    timestamp: now.toISOString(),
  };
}

function co2() {
  const now = new Date();
  const slot = Math.floor((now.getHours() * 60 + now.getMinutes()) / 15);
  const todayKwh = dayTotals(now, slot + 1).solar;
  const years = (now.valueOf() - INSTALLED.valueOf()) / (365.25 * 86_400_000);
  const totalKwh = years * PEAK_KWP * KWH_PER_KWP_YEAR * 0.985 + todayKwh;
  const totalCo2Kg = totalKwh * CO2_KG_PER_KWH;
  const todayCo2 = todayKwh * CO2_KG_PER_KWH;
  return {
    today_energy: round(todayKwh, 1),
    total_energy: round(totalKwh / 1000, 2),
    total_energy_unit: 'MWh',
    today_co2: round(todayCo2, 1),
    total_co2: round(totalCo2Kg / 1000, 2),
    total_co2_unit: 't',
    today_trees_saved: round(todayCo2 / KG_CO2_PER_TREE_YEAR, 1),
    total_trees_saved: Math.round(totalCo2Kg / KG_CO2_PER_TREE_YEAR),
  };
}

function yesterday15min() {
  const d = daysAgo(1);
  const day = ymd(d);
  return Array.from({ length: 96 }, (_, s) => {
    const p = solarAt(d, s);
    const u = consumptionAt(d, s);
    return {
      interval_start: `${day} ${pad(Math.floor(s / 4))}:${pad((s % 4) * 15)}:00`,
      total_solar_energy: round(p),
      total_grid_imported: round(Math.max(0, u - p)),
      total_spend_energy: round(u),
    };
  });
}

function lastWeek() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = daysAgo(7 - i);
    const t = dayTotals(d);
    return {
      day_date: ymd(d),
      total_solar_energy: round(t.solar, 1),
      total_grid_exported: round(t.exported, 1),
      total_spend_energy: round(t.use, 1),
    };
  });
}

function last31Days() {
  const daily_data = Array.from({ length: 31 }, (_, i) => {
    const d = daysAgo(31 - i);
    return { day_date: ymd(d), total_solar_energy: round(dayTotals(d).solar, 1) };
  });
  return { daily_data, total_energy_produced: round(daily_data.reduce((a, b) => a + b.total_solar_energy, 0), 0), energy_unit: 'kWh' };
}

/** Börsenpreise (Fallback, falls aWATTar nicht erreichbar): heute + morgen, stündlich, ct/kWh */
function prices() {
  const rows: { start_time: string; end_time: string; price: number; unit: string }[] = [];
  for (let dayOffset = 0; dayOffset < 2; dayOffset++) {
    const d = daysAgo(-dayOffset);
    const day = ymd(d);
    for (let h = 0; h < 24; h++) {
      const shape = 9 + 4 * Math.exp(-((h - 8) ** 2) / 4) + 6 * Math.exp(-((h - 19) ** 2) / 5) - 5 * Math.exp(-((h - 13.5) ** 2) / 6);
      const price = round(Math.max(0.5, shape + (rand(`price:${day}:${h}`) - 0.5) * 3), 2);
      rows.push({ start_time: `${day} ${pad(h)}:00:00`, end_time: `${day} ${pad(h)}:59:59`, price, unit: 'ct/kWh' });
    }
  }
  const h = new Date().getHours();
  return { momental_price: rows[h].price, message: rows };
}

function news() {
  const d = (n: number) => daysAgo(n).toUTCString();
  return {
    news_items: [
      { pubDate: d(0), description: 'Sonnige Stunden nutzen: Waschmaschine und Geschirrspüler zur Mittagszeit laufen lassen erhöht den Eigenverbrauch.' },
      { pubDate: d(1), description: 'Batteriespeicher machen den Sonnenstrom auch am Abend nutzbar – ÖKOVOLT berät Sie gerne.' },
      { pubDate: d(2), description: 'Regelmäßige Wartung hält Ihre Photovoltaikanlage effizient und sicher.' },
      { pubDate: d(3), description: 'E-Auto mit eigenem Sonnenstrom laden: Wallbox und PV-Anlage aus einer Hand.' },
      { pubDate: d(5), description: 'Wärmepumpe und Photovoltaik ergänzen sich ideal für ein energieeffizientes Zuhause.' },
    ],
  };
}

const HANDLERS: Record<string, () => unknown> = {
  get_latest_system_log: systemLog,
  get_system_specs: () => ({ modulleistung: PEAK_KWP, battery: 'Yes', charging_power: '11 kW', carport: 'No', awattar: 'Yes' }),
  calculate_co2: co2,
  calculate_15min_totals_yesterday: yesterday15min,
  calculate_daily_totals_last_week: lastWeek,
  calculate_daily_solar_energy_previous_31_days: last31Days,
  get_existing_awattar_price: prices,
  get_latest_news: news,
  get_weather_latitude_longitude: () => ({ latitude: COORDS[0], longitude: COORDS[1] }),
  get_language: () => ({ language_code: 'DE' }),
  get_logo_and_website: () => ({ kiosk_logo: '', website: 'https://www.oekovolt.com' }),
  get_kiosk_ads_props: () => ({ kiosk_duration_minutes: 3.5 }),
  get_active_company_ads_data_if_permanent_is_not_exist: () => [],
  get_the_data_foreach_system: () => [],
  has_been_offline_too_long: () => false,
};

/** Methoden, die weiterhin an das echte Backend gehen */
const PASS_THROUGH = new Set(['get_maps_data']);

/* ------------------------------------------------------------------ „Heute live“ von Mitternacht bis jetzt vorbefüllen */

function seedLiveLog() {
  try {
    const now = new Date();
    const key = liveLogKey(apiBaseUrl);
    const date = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Europe/Vienna' }).format(now);
    const raw = localStorage.getItem(key);
    const log = raw ? (JSON.parse(raw) as { date: string; samples: LiveSample[] }) : null;
    if (log?.date === date && log.samples.length > 20) return;
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const samples: LiveSample[] = [];
    for (let m = 0; m < nowMin; m += 3) {
      const t = new Date(now);
      t.setHours(Math.floor(m / 60), m % 60, 0, 0);
      const { solar, use } = liveAt(t);
      samples.push([m, round(solar), round(use), round(use - solar)]);
    }
    localStorage.setItem(key, JSON.stringify({ date, samples }));
  } catch {
    /* kein Speicher → „Heute live“ füllt sich von selbst */
  }
}

/* ------------------------------------------------------------------ fetch abfangen */

export function installDemoData() {
  if (!DEMO_DATA || typeof window === 'undefined') return;
  seedLiveLog();
  const realFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const m = /\/api\/method\/kiosk_client_app\.[\w.]*\.(\w+)(?:\?|$)/.exec(url);
    if (m && !PASS_THROUGH.has(m[1])) {
      const handler = HANDLERS[m[1]];
      await new Promise((r) => setTimeout(r, 80 + Math.random() * 160));
      if (!handler) return new Response(JSON.stringify({ message: null }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify({ message: handler() }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return realFetch(input, init);
  };
}
