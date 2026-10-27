/**
 * Geometrie für die SVG-Karte: Mercator-Projektion, Pfade, Grenzpunkte.
 * Keine Kacheln, keine Leaflet-Laufzeit – nur die mitgelieferte GeoJSON (Natural Earth 1:50m).
 */
import type { Feature, FeatureCollection, MultiPolygon, Polygon, Position } from 'geojson';
import countries from '../../../data/custom.geo.json';

export interface GeoProps {
  iso_a2?: string;
  iso_a2_eh?: string;
  name?: string;
  name_de?: string;
  name_en?: string;
  name_fr?: string;
  name_it?: string;
  label_x?: number;
  label_y?: number;
}

export type Pt = [number, number];

/** Projektion: x = Länge, y = Mercator-Breite (in Grad skaliert, nach unten wachsend) */
export const project = (lng: number, lat: number): Pt => [
  lng,
  -(180 / Math.PI) * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)),
];

export interface Country {
  iso: string;
  props: GeoProps;
  /** Ringe in Projektionskoordinaten */
  rings: Pt[][];
  path: string;
  bbox: [number, number, number, number];
  /** größte Fläche (Hauptteil) */
  mainRing: Pt[];
}

const ringArea = (r: Pt[]) => {
  let a = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]);
  return Math.abs(a / 2);
};

const toPath = (rings: Pt[][]) =>
  rings.map((r) => 'M' + r.map(([x, y]) => `${x.toFixed(3)} ${y.toFixed(3)}`).join('L') + 'Z').join('');

function build(): Country[] {
  const fc = countries as unknown as FeatureCollection<Polygon | MultiPolygon, GeoProps>;
  return fc.features.map((f: Feature<Polygon | MultiPolygon, GeoProps>) => {
    const p = f.properties;
    const iso = (p.iso_a2_eh && p.iso_a2_eh !== '-99' ? p.iso_a2_eh : p.iso_a2) || '';
    const polys: Position[][][] = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    const rings: Pt[][] = [];
    let mainRing: Pt[] = [];
    let best = -1;
    for (const poly of polys) {
      poly.forEach((ring, k) => {
        const r = ring.map(([lng, lat]) => project(lng, lat));
        rings.push(r);
        if (k === 0) {
          const a = ringArea(r);
          if (a > best) {
            best = a;
            mainRing = r;
          }
        }
      });
    }
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of mainRing) {
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
    return { iso, props: p, rings, path: toPath(rings), bbox: [x0, y0, x1, y1] as [number, number, number, number], mainRing };
  });
}

let cache: Country[] | null = null;
export const allCountries = () => (cache ??= build());
export const countryByIso = (iso: string) => allCountries().find((c) => c.iso === iso);

/** Flächenschwerpunkt des Hauptteils */
export function centroid(r: Pt[]): Pt {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const f = r[j][0] * r[i][1] - r[i][0] * r[j][1];
    a += f; cx += (r[j][0] + r[i][0]) * f; cy += (r[j][1] + r[i][1]) * f;
  }
  return a ? [cx / (3 * a), cy / (3 * a)] : r[0];
}

/**
 * Punkt auf der gemeinsamen Grenze zweier Länder: Natural Earth teilt die Stützpunkte benachbarter Länder.
 * Ergebnis = gemeinsamer Stützpunkt, der dem Mittel aller gemeinsamen Punkte am nächsten liegt (liegt sicher auf der Grenze).
 */
export function sharedBorderPoint(a: Country, b: Country): Pt | null {
  const key = (p: Pt) => `${p[0].toFixed(4)},${p[1].toFixed(4)}`;
  const set = new Set<string>();
  for (const r of b.rings) for (const p of r) set.add(key(p));
  const shared: Pt[] = [];
  for (const r of a.rings) for (const p of r) if (set.has(key(p))) shared.push(p);
  if (shared.length < 2) return null;
  const mx = shared.reduce((s, p) => s + p[0], 0) / shared.length;
  const my = shared.reduce((s, p) => s + p[1], 0) / shared.length;
  let best = shared[0], d = Infinity;
  for (const p of shared) {
    const dd = (p[0] - mx) ** 2 + (p[1] - my) ** 2;
    if (dd < d) { d = dd; best = p; }
  }
  return best;
}

/** Punkt-in-Polygon (für die Prüfung, ob ein Etikett im Land liegt) */
export function inRing(p: Pt, r: Pt[]) {
  let inside = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, yi] = r[i];
    const [xj, yj] = r[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Albanische Ländernamen (nicht in der GeoJSON enthalten) */
const SQ_NAMES: Record<string, string> = {
  AT: 'Austria', DE: 'Gjermania', CZ: 'Çekia', CH: 'Zvicra', IT: 'Italia', HU: 'Hungaria', SI: 'Sllovenia', SK: 'Sllovakia',
  FR: 'Franca', BE: 'Belgjika', NL: 'Holanda', LU: 'Luksemburgu', PL: 'Polonia', DK: 'Danimarka', NO: 'Norvegjia', SE: 'Suedia',
  AL: 'Shqipëria', ME: 'Mali i Zi', MK: 'Maqedonia e Veriut', RS: 'Serbia', XK: 'Kosova',
};

export const countryName = (c: Country | undefined, language: string | null) => {
  if (!c) return '';
  const p = c.props;
  if (language === 'EN') return p.name_en || p.name || '';
  if (language === 'FR') return p.name_fr || p.name || '';
  if (language === 'IT') return p.name_it || p.name || '';
  if (language === 'SQ') return SQ_NAMES[c.iso] || p.name_en || p.name || '';
  return p.name_de || p.name || '';
};
