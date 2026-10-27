/**
 * Länder-Konfiguration, Farbskalen und Texte des Strommix-Bildschirms.
 * Ein einziger parametrisierter Aufbau für AT / DE / CH / XK.
 */
import AlbaniaFlagImg from '../../../assets/albania.png';
import AustriaFlagImg from '../../../assets/austria.png';
import BelgiumFlagImg from '../../../assets/belgium.png';
import CzechFlagImg from '../../../assets/czech.png';
import DenmarkFlagImg from '../../../assets/denmark.png';
import FranceFlagImg from '../../../assets/france.png';
import GermanFlagImg from '../../../assets/germany.png';
import HungaryFlagImg from '../../../assets/hungary.png';
import ItalyFlagImg from '../../../assets/italy.png';
import KosovoFlagImg from '../../../assets/kosovo.png';
import LuxembourgFlagImg from '../../../assets/luxembourg.png';
import MacedoniaFlagImg from '../../../assets/north-macedonia.png';
import MontenegroFlagImg from '../../../assets/montenegro.png';
import NetherlandsFlagImg from '../../../assets/netherlands.png';
import NorwayFlagImg from '../../../assets/norway.png';
import PolandFlagImg from '../../../assets/poland.png';
import SerbiaFlagImg from '../../../assets/serbia.png';
import SlovakiaFlagImg from '../../../assets/slovakia.png';
import SloveniaFlagImg from '../../../assets/slovenia.png';
import SwedenFlagImg from '../../../assets/sweden.png';
import SwitzerlandFlagImg from '../../../assets/switzerland.png';
const AlbaniaFlag = AlbaniaFlagImg.src;
const AustriaFlag = AustriaFlagImg.src;
const BelgiumFlag = BelgiumFlagImg.src;
const CzechFlag = CzechFlagImg.src;
const DenmarkFlag = DenmarkFlagImg.src;
const FranceFlag = FranceFlagImg.src;
const GermanFlag = GermanFlagImg.src;
const HungaryFlag = HungaryFlagImg.src;
const ItalyFlag = ItalyFlagImg.src;
const KosovoFlag = KosovoFlagImg.src;
const LuxembourgFlag = LuxembourgFlagImg.src;
const MacedoniaFlag = MacedoniaFlagImg.src;
const MontenegroFlag = MontenegroFlagImg.src;
const NetherlandsFlag = NetherlandsFlagImg.src;
const NorwayFlag = NorwayFlagImg.src;
const PolandFlag = PolandFlagImg.src;
const SerbiaFlag = SerbiaFlagImg.src;
const SlovakiaFlag = SlovakiaFlagImg.src;
const SloveniaFlag = SloveniaFlagImg.src;
const SwedenFlag = SwedenFlagImg.src;
const SwitzerlandFlag = SwitzerlandFlagImg.src;
export type ZoneCode = 'AT' | 'DE' | 'CH' | 'XK';

/** Flaggen nach ISO-Code (Ländergeometrie) */
export const FLAGS: Record<string, string> = {
  AL: AlbaniaFlag,
  AT: AustriaFlag,
  BE: BelgiumFlag,
  CZ: CzechFlag,
  DK: DenmarkFlag,
  FR: FranceFlag,
  DE: GermanFlag,
  HU: HungaryFlag,
  IT: ItalyFlag,
  XK: KosovoFlag,
  LU: LuxembourgFlag,
  MK: MacedoniaFlag,
  ME: MontenegroFlag,
  NL: NetherlandsFlag,
  NO: NorwayFlag,
  PL: PolandFlag,
  RS: SerbiaFlag,
  SK: SlovakiaFlag,
  SI: SloveniaFlag,
  SE: SwedenFlag,
  CH: SwitzerlandFlag,
};

/** electricitymaps-Zone (z. B. „IT-NO“, „DK-DK1“) → ISO-Land der Geometrie */
export const zoneIso = (zone: string) => zone.split('-')[0];

export interface NeighbourOverride {
  /** Grenz-/Kabelpunkt [lat, lng] für Zonen ohne gemeinsame Landgrenze (Seekabel) oder zur Feinjustierung */
  at?: [number, number];
  /** Zusatz zum Ländernamen (Gebotszone) */
  suffix?: string;
}

export interface ZoneConfig {
  code: ZoneCode;
  /** Länder, die als Nachbarn beschriftet werden (ISO) */
  neighbours: string[];
  /** Feste Punkte für Zonen ohne Landgrenze bzw. Teilzonen */
  overrides?: Record<string, NeighbourOverride>;
  /** Zusätzlicher Rand um das Fokusland (Anteil der Ausdehnung) */
  pad?: number;
}

export const ZONES: Record<ZoneCode, ZoneConfig> = {
  AT: {
    code: 'AT',
    neighbours: ['DE', 'CZ', 'SK', 'HU', 'SI', 'IT', 'CH'],
    pad: 0.32,
    // Brenner: die gemeinsame Stützpunkt-Mitte liegt sonst weit im Westen
    overrides: { 'IT-NO': { at: [46.98, 11.5] } },
  },
  DE: {
    code: 'DE',
    neighbours: ['AT', 'BE', 'CH', 'CZ', 'FR', 'LU', 'NL', 'PL', 'DK', 'NO', 'SE'],
    pad: 0.2,
    overrides: {
      'DK-DK1': { at: [54.85, 9.1], suffix: 'DK1' },
      'DK-DK2': { at: [54.45, 12.0], suffix: 'DK2' },
      'NO-NO2': { at: [54.6, 7.4], suffix: 'NO2' },
      'SE-SE4': { at: [54.65, 13.6], suffix: 'SE4' },
      LU: { at: [49.8, 6.45] },
    },
  },
  CH: { code: 'CH', neighbours: ['AT', 'DE', 'FR', 'IT'], pad: 0.4, overrides: { 'IT-NO': { suffix: 'Nord' } } },
  XK: { code: 'XK', neighbours: ['AL', 'ME', 'MK', 'RS'], pad: 0.55 },
};

/** Zone aus der Backend-Konfiguration ermitteln (URL-Parameter `zone=` oder Feld `zone`) */
export function zoneFromConfig(cfg: { api_data_url?: string; zone?: string } | null | undefined): ZoneCode {
  const raw = cfg?.zone || cfg?.api_data_url?.match(/zone=([A-Z]{2})/)?.[1] || 'AT';
  const z = raw.toUpperCase().slice(0, 2);
  return (['AT', 'DE', 'CH', 'XK'] as const).includes(z as ZoneCode) ? (z as ZoneCode) : 'AT';
}

/* ------------------------------------------------------------------ CO₂-Skala */

/** Skala in g CO₂eq/kWh; Werte darüber werden am Ende geklemmt. */
export const CI_MAX = 800;
/** Stufen (auf die Navy-Bühne entsättigt): Grün → Sonne → Rot */
export const CI_STOPS: Array<[number, string]> = [
  [0, '#3FA06A'],
  [150, '#8CBA58'],
  [300, '#E2C15A'],
  [450, '#EE9A3E'],
  [600, '#E3644E'],
  [800, '#B8405E'],
];

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

export function ciColor(v: number): string {
  const x = Math.max(0, Math.min(CI_MAX, v));
  for (let i = 0; i < CI_STOPS.length - 1; i++) {
    const [a, ca] = CI_STOPS[i];
    const [b, cb] = CI_STOPS[i + 1];
    if (x <= b) {
      const t = (x - a) / (b - a);
      const A = hex(ca);
      const B = hex(cb);
      return `rgb(${A.map((c, k) => Math.round(c + (B[k] - c) * t)).join(' ')})`;
    }
  }
  return CI_STOPS[CI_STOPS.length - 1][1];
}

export const ciGradientCss = (dir = '90deg') =>
  `linear-gradient(${dir}, ${CI_STOPS.map(([v, c]) => `${c} ${(v / CI_MAX) * 100}%`).join(', ')})`;

export type CiLevel = 'low' | 'mid' | 'high';
/** Bewertung: < 200 niedrig · 200–450 mittel · > 450 hoch */
export const CI_THRESHOLDS = { low: 200, high: 450 };
export const ciLevel = (v: number): CiLevel => (v < CI_THRESHOLDS.low ? 'low' : v <= CI_THRESHOLDS.high ? 'mid' : 'high');

/* ------------------------------------------------------------------ Texte */

export type Lang = string | null;
export interface Tx {
  DE: string;
  EN?: string;
  IT?: string;
  FR?: string;
  SQ?: string;
}

export const T = {
  co2: { DE: 'CO₂-Intensität', EN: 'CO₂ intensity', IT: 'Intensità di CO₂', FR: 'Intensité CO₂', SQ: 'Intensiteti i CO₂' },
  low: { DE: 'niedrig', EN: 'low', IT: 'bassa', FR: 'faible', SQ: 'e ulët' },
  mid: { DE: 'mittel', EN: 'medium', IT: 'media', FR: 'moyenne', SQ: 'mesatare' },
  high: { DE: 'hoch', EN: 'high', IT: 'alta', FR: 'élevée', SQ: 'e lartë' },
  fossilFree: { DE: 'Fossilfrei', EN: 'Fossil-free', IT: 'Senza fossili', FR: 'Sans fossiles', SQ: 'Pa fosile' },
  fossilFreeLabel: { DE: 'Strom ohne Kohle, Gas & Öl', EN: 'Power without coal, gas & oil', IT: 'Energia senza carbone, gas e petrolio', FR: 'Électricité sans charbon, gaz ni pétrole', SQ: 'Energji pa qymyr, gaz e naftë' },
  renewable: { DE: 'Erneuerbar', EN: 'Renewable', IT: 'Rinnovabile', FR: 'Renouvelable', SQ: 'Rinovueshme' },
  renewableLabel: { DE: 'Wasser, Wind, Sonne & Biomasse', EN: 'Hydro, wind, solar & biomass', IT: 'Acqua, vento, sole e biomassa', FR: 'Eau, vent, soleil et biomasse', SQ: 'Ujë, erë, diell e biomasë' },
  originPlain: { DE: 'Strommix {c}', EN: 'Electricity mix · {c}', IT: 'Mix elettrico {c}', FR: 'Mix électrique {c}', SQ: 'Miksi i energjisë {c}' },
  origin: { DE: 'Strommix {c} · live', EN: 'Live electricity mix · {c}', IT: 'Mix elettrico {c} · live', FR: 'Mix électrique {c} · en direct', SQ: 'Miksi i energjisë {c} · live' },
  originTitle: { DE: 'Woher kommt der Strom?', EN: 'Where does the power come from?', IT: "Da dove viene l'energia?", FR: "D'où vient l'électricité ?", SQ: 'Nga vjen energjia?' },
  leftSide: { DE: 'Netto-Import je Quelle', EN: 'Net import by source', IT: 'Import netto per fonte', FR: 'Import net par source', SQ: 'Import neto sipas burimit' },
  storageCharge: { DE: 'Speicher lädt', EN: 'To storage', IT: 'In accumulo', FR: 'En stockage', SQ: 'Në ruajtje' },
  other: { DE: 'Sonstige', EN: 'Other', IT: 'Altro', FR: 'Autres', SQ: 'Të tjera' },
  rightSide: { DE: 'Produziert', EN: 'Produced', IT: 'Prodotto', FR: 'Produit', SQ: 'Prodhuar' },
  production: { DE: 'Erzeugung', EN: 'Production', IT: 'Produzione', FR: 'Production', SQ: 'Prodhimi' },
  consumption: { DE: 'Verbrauch', EN: 'Consumption', IT: 'Consumo', FR: 'Consommation', SQ: 'Konsumi' },
  import: { DE: 'Import', EN: 'Import', IT: 'Import', FR: 'Import', SQ: 'Import' },
  export: { DE: 'Export', EN: 'Export', IT: 'Export', FR: 'Export', SQ: 'Eksport' },
  flows: { DE: 'Stromflüsse', EN: 'Power flows', IT: 'Flussi di energia', FR: "Flux d'électricité", SQ: 'Flukset e energjisë' },
  noData: { DE: 'Nachbarland · keine Daten', EN: 'Neighbour · no data', IT: 'Paese vicino · nessun dato', FR: 'Pays voisin · pas de données', SQ: 'Fqinj · pa të dhëna' },
  estimated: { DE: 'geschätzt', EN: 'estimated', IT: 'stimato', FR: 'estimé', SQ: 'vlerësuar' },
  asOf: { DE: 'Stand', EN: 'As of', IT: 'Aggiornato alle', FR: 'Mis à jour', SQ: 'Përditësuar' },
  cached: { DE: 'zwischengespeichert', EN: 'cached', IT: 'in cache', FR: 'en cache', SQ: 'e ruajtur' },
  lastGood: { DE: 'Letzter gültiger Stand', EN: 'Last valid data', IT: 'Ultimi dati validi', FR: 'Dernières données valides', SQ: 'Të dhënat e fundit të vlefshme' },
  errorTitle: { DE: 'Netzdaten derzeit nicht verfügbar', EN: 'Grid data currently unavailable', IT: 'Dati di rete non disponibili', FR: 'Données réseau indisponibles', SQ: 'Të dhënat e rrjetit nuk janë të disponueshme' },
  errorSub: { DE: 'Neuer Versuch in Kürze automatisch', EN: 'Retrying automatically shortly', IT: 'Nuovo tentativo a breve', FR: 'Nouvel essai automatique sous peu', SQ: 'Riprovim automatik së shpejti' },
  storedNote: { DE: 'Netto-Import je Quelle = Verbrauch − Erzeugung je Energieträger; „Import“ unten = Summe aller Importe · Quelle: Electricity Maps', EN: 'Net import by source = consumption − production per energy source; “Import” below = all imports combined · Source: Electricity Maps', IT: 'Import netto per fonte = consumo − produzione per fonte energetica; „Import“ sotto = totale delle importazioni · Fonte: Electricity Maps', FR: 'Import net par source = consommation − production par source d’énergie ; « Import » ci-dessous = total des importations · Source : Electricity Maps', SQ: 'Import neto sipas burimit = konsum − prodhim për çdo burim energjie; „Import“ poshtë = shuma e të gjitha importeve · Burimi: Electricity Maps' },
  unavailable: { DE: 'keine Daten', EN: 'no data', IT: 'nessun dato', FR: 'pas de données', SQ: 'pa të dhëna' },
  historyTitle: { DE: "CO₂-Intensität · letzte 24 h", EN: "CO₂ intensity · last 24 h", IT: "Intensità di CO₂ · ultime 24 h", FR: "Intensité CO₂ · dernières 24 h", SQ: "Intensiteti i CO₂ · 24 orët e fundit" },
  min: { DE: "Min", EN: "Min", IT: "Min", FR: "Min", SQ: "Min" },
  avg: { DE: "Ø", EN: "Avg", IT: "Media", FR: "Moy.", SQ: "Mes." },
  max: { DE: "Max", EN: "Max", IT: "Max", FR: "Max", SQ: "Maks" },
  historyNone: { DE: "Verlauf für diese Zone nicht verfügbar", EN: "History not available for this zone", IT: "Storico non disponibile per questa zona", FR: "Historique indisponible pour cette zone", SQ: "Historiku nuk është i disponueshëm" },
  historyEstimated: { DE: "teils geschätzt", EN: "partly estimated", IT: "in parte stimato", FR: "en partie estimé", SQ: "pjesërisht vlerësuar" },
  balanced: { DE: "Import und Export sind gerade ausgeglichen", EN: "Imports and exports are balanced right now", IT: "Import ed export sono in equilibrio", FR: "Import et export sont équilibrés", SQ: "Importi dhe eksporti janë në ekuilibër" },
  stale: { DE: 'Aktualisierung fehlgeschlagen', EN: 'Update failed', IT: 'Aggiornamento non riuscito', FR: 'Échec de la mise à jour', SQ: 'Përditësimi dështoi' },
} satisfies Record<string, Tx>;

/* ------------------------------------------------------------------ Energiequellen */

export type SourceKey =
  | 'biomass'
  | 'geothermal'
  | 'hydro'
  | 'solar'
  | 'wind'
  | 'nuclear'
  | 'battery discharge'
  | 'hydro discharge'
  | 'coal'
  | 'gas'
  | 'oil'
  | 'unknown';

export interface SourceDef {
  key: SourceKey;
  color: string;
  storage?: boolean;
  label: Tx;
}

/** Feste Reihenfolge: Erneuerbare · Kernkraft · Speicher · Fossile · Unbekannt. Farbe folgt der Quelle, nie dem Rang. */
export const SOURCES: SourceDef[] = [
  { key: 'hydro', color: '#4F95E3', label: { DE: 'Wasserkraft', EN: 'Hydropower', FR: 'Hydroélectricité', IT: 'Idroelettrico', SQ: 'Hidroenergjia' } },
  { key: 'wind', color: '#5EC4BC', label: { DE: 'Wind', EN: 'Wind', FR: 'Éolien', IT: 'Eolico', SQ: 'Era' } },
  { key: 'solar', color: '#F5B73B', label: { DE: 'Solar', EN: 'Solar', FR: 'Solaire', IT: 'Solare', SQ: 'Diellore' } },
  { key: 'biomass', color: '#8CBA58', label: { DE: 'Biomasse', EN: 'Biomass', FR: 'Biomasse', IT: 'Biomassa', SQ: 'Biomasë' } },
  { key: 'geothermal', color: '#E08A62', label: { DE: 'Geothermie', EN: 'Geothermal', FR: 'Géothermie', IT: 'Geotermia', SQ: 'Gjeotermale' } },
  { key: 'nuclear', color: '#A68BE6', label: { DE: 'Kernkraft', EN: 'Nuclear', FR: 'Nucléaire', IT: 'Nucleare', SQ: 'Bërthamore' } },
  { key: 'hydro discharge', color: '#8DB8F0', storage: true, label: { DE: 'Wasserspeicher', EN: 'Hydro Storage', FR: 'Stockage hydraulique', IT: 'Accumulo idrico', SQ: 'Depozit ujërash' } },
  { key: 'battery discharge', color: '#C6E08A', storage: true, label: { DE: 'Batteriespeicher', EN: 'Battery Storage', FR: 'Stockage de batterie', IT: 'Accumulo batteria', SQ: 'Bateri' } },
  { key: 'gas', color: '#D48A5C', label: { DE: 'Gas', EN: 'Gas', FR: 'Gaz', IT: 'Gas', SQ: 'Gaz' } },
  { key: 'coal', color: '#8C93A6', label: { DE: 'Kohle', EN: 'Coal', FR: 'Charbon', IT: 'Carbone', SQ: 'Qymyr' } },
  { key: 'oil', color: '#B5727A', label: { DE: 'Öl', EN: 'Oil', FR: 'Pétrole', IT: 'Petrolio', SQ: 'Naftë' } },
  { key: 'unknown', color: '#6F7C96', label: { DE: 'Unbekannt', EN: 'Unknown', FR: 'Inconnu', IT: 'Sconosciuto', SQ: 'I panjohur' } },
];

/** Zahlen-/Zeit-Locale je Bildschirmsprache */
export const localeOf = (language: Lang) =>
  ({ EN: 'en-GB', FR: 'fr-FR', IT: 'it-IT', SQ: 'sq-AL' } as Record<string, string>)[language ?? ''] ?? 'de-AT'; // wie fmtNum (design/hooks): de-AT-CLDR für alle Bildschirme

/** Einheit für eine ganze Ansicht wählen: ab 10 GW alles in GW, sonst MW (nie gemischt) */
export const unitFor = (maxMw: number): 'MW' | 'GW' => (maxMw >= 10000 ? 'GW' : 'MW');

/** Leistung lesbar, sprachabhängig: „1.392 MW“ / „1,392 MW“ / „1 392 MW“ bzw. „12,4 GW“ */
export function fmtMW(mw: number, unit: 'MW' | 'GW' = unitFor(Math.abs(mw)), language: Lang = 'DE') {
  const loc = localeOf(language);
  if (unit === 'GW' && mw !== 0 && Math.abs(mw) < 50) return `< ${new Intl.NumberFormat(loc, { minimumFractionDigits: 1 }).format(0.1)} GW`;
  if (unit === 'GW') return `${new Intl.NumberFormat(loc, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(mw / 1000)} GW`;
  return `${new Intl.NumberFormat(loc, { maximumFractionDigits: 0 }).format(mw)} MW`;
}

/** Uhrzeit (Europe/Vienna); mit Datum, wenn nicht heute */
export function fmtStamp(iso: string | number | undefined, language: Lang) {
  if (iso == null) return null;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  const loc = localeOf(language);
  const tz = 'Europe/Vienna';
  const day = (x: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(x);
  const time = new Intl.DateTimeFormat(loc, { hour: '2-digit', minute: '2-digit', timeZone: tz }).format(d);
  if (day(d) === day(new Date())) return time;
  return `${new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'numeric', timeZone: tz }).format(d)} ${time}`;
}
