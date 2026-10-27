import React, { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Leaf, TreePine, Zap } from 'lucide-react';
import { useSystemData } from '../hooks/useSystemData';
import { useSystemSpecs } from '../hooks/useSystemSpecs';
import { useCo2Data } from '../hooks/useCO2Data';
import { EnergyFlowHero } from '../design/kiosk/EnergyFlowHero';
import { ChartStage } from '../design/kiosk/ChartStage';
import { WeatherTile } from '../design/kiosk/WeatherTile';
import { RingTile, StatTile } from '../design/kiosk/Tiles';
import { fmtNum, NNBSP, ReplayContext, tr, UnavailableContext, useGrace, useNow, useScreenActive } from '../design/hooks';
import { setStageCoords, setStageSolar } from '../design/daylight';
import { recordLiveSample, useLiveSamples } from '../design/kiosk/liveLog';
import { useWeather, useWeek } from '../design/kiosk/data';
import { liveStateOf, setOwnLive } from '../design/status';

interface KioskDisplayProps {
  screenWidth: number;
  screenHeight: number;
  aspectRatio: number;
  language: string | null;
  /** API-Basis einer anderen Anlage (Multi-Anlagen-Ansicht); Standard = eigene Anlage */
  apiBase?: string;
}

type Lang = Parameters<typeof tr>[1];
type SpotId = 'hero' | 'self' | 'auto' | 'co2' | 'energy' | 'trees';
interface Insight {
  id: SpotId;
  text: string;
  note?: string;
}

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const nf = fmtNum;

/* Vergleichsfaktoren – werden immer mit angezeigt */
const EV_KWH_PER_KM = 0.18;
const CAR_CO2_KG_PER_KM = 0.15;
const HOUSEHOLD_KWH_YEAR = 3500;
const HOUSEHOLD_KWH_DAY = HOUSEHOLD_KWH_YEAR / 365;

const SPOT_FIRST_MS = 25_000;
const SPOT_EVERY_MS = 150_000;
const SPOT_SHOW_MS = 12_000;

const toKwh = (v: number, unit: string | undefined) => {
  const u = (unit ?? 'kWh').toLowerCase();
  return u === 'gwh' ? v * 1e6 : u === 'mwh' ? v * 1000 : v;
};
const toKg = (v: number, unit: string | undefined) => {
  const u = (unit ?? 'kg').toLowerCase();
  return u === 't' ? v * 1000 : u === 'kt' ? v * 1e6 : v;
};

/** Reihenfolge so, dass nie zweimal hintereinander dieselbe Kachel hervorgehoben wird */
function alternate(list: Insight[]) {
  const out: Insight[] = [];
  const rest = [...list];
  while (rest.length) {
    const i = rest.findIndex((x) => x.id !== out[out.length - 1]?.id);
    out.push(...rest.splice(i < 0 ? 0 : i, 1));
  }
  return out;
}

/**
 * Spotlight: alle paar Minuten hebt ein Lichtschwenk eine Kennzahl hervor; die einordnende Zeile
 * erscheint in der Statuszeile des Heros (kein Banner, das andere Beschriftungen verdeckt).
 */
function useSpotlight(insights: Insight[], active: boolean) {
  const [current, setCurrent] = useState<{ insight: Insight; n: number } | null>(null);
  const listRef = useRef(insights);
  useEffect(() => {
    listRef.current = insights;
  }, [insights]);

  useEffect(() => {
    if (!active) {
      setCurrent(null);
      return;
    }
    let n = 0;
    let hide: ReturnType<typeof setTimeout> | undefined;
    const show = () => {
      const list = listRef.current;
      if (!list.length) return;
      const insight = list[n % list.length];
      n += 1;
      setCurrent({ insight, n });
      hide = setTimeout(() => setCurrent(null), SPOT_SHOW_MS);
    };
    let every: ReturnType<typeof setInterval> | undefined;
    const first = setTimeout(() => {
      show();
      every = setInterval(show, SPOT_EVERY_MS);
    }, SPOT_FIRST_MS);
    return () => {
      clearTimeout(first);
      clearTimeout(hide);
      clearInterval(every);
    };
  }, [active]);

  return current;
}

/**
 * Hauptbildschirm der Anlage als Bento-Raster:
 * Hochformat (TV hochkant): Energiefluss-Hero · Ringe · Diagramm-Bühne · Wetter/Umwelt
 * Querformat: links Hero + Ringe, rechts Diagramm + Wetter/Umwelt
 */
export const KioskDisplay: React.FC<KioskDisplayProps> = ({ language, apiBase }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const active = useScreenActive(rootRef);
  // Fremde Anlagen (Multi-Ansicht) nur abrufen, solange sichtbar; die eigene Anlage ruft auch
  // versteckt ruhig weiter ab (1×/min) – für „Heute live gemessen“ und den Status in der Kopfzeile.
  const own = !apiBase;
  const pollEnabled = active || own;
  const { systemData: energy, updatedAt, fromCache } = useSystemData({ ipAdress: apiBase, enabled: pollEnabled, intervalMs: active ? 7000 : 60_000 });
  const { systemSpecs: specs } = useSystemSpecs({ ipAdress: apiBase, enabled: pollEnabled });
  const { co2Data } = useCo2Data({ ipAdress: apiBase, enabled: pollEnabled });
  const weather = useWeather(apiBase, pollEnabled);
  const samples = useLiveSamples(apiBase);
  const graceOver = useGrace(20_000);
  const now = useNow(15_000).valueOf();
  const L = (t: Lang) => tr(language, t);

  // Wiedergabe-Epoche: bei jedem erneuten Eintritt zählen Zahlen neu hoch, Diagramme zeichnen sich neu
  const [epoch, setEpoch] = useState(0);
  const wasActive = useRef(active);
  useEffect(() => {
    if (active && !wasActive.current) setEpoch((e) => e + 1);
    wasActive.current = active;
  }, [active]);

  const live = liveStateOf({ hasData: !!energy, timestamp: energy?.timestamp, updatedAt, fromCache, graceOver, now });

  const peak = num(specs?.modulleistung);
  const solar = num(energy?.solar_energy);
  const todayKwh = num(co2Data?.today_energy);
  const totalEnergy = num(co2Data?.total_energy);
  const todayCo2 = num(co2Data?.today_co2);
  const selfUse = num(energy?.self_usage_percentage);
  const autarky = num(energy?.total_percentage);
  const totalKwh = totalEnergy != null ? toKwh(totalEnergy, co2Data?.total_energy_unit) : null;
  const totalCo2Kg = num(co2Data?.total_co2) != null ? toKg(co2Data!.total_co2!, co2Data?.total_co2_unit) : null;
  const trees = num(co2Data?.total_trees_saved);
  // Tagesspitze (auf dem Kiosk gemessen) samt Uhrzeit
  const todayPeak = useMemo(() => {
    if (samples.length < 2) return null;
    const best = samples.reduce((a, b) => (b[1] > a[1] ? b : a));
    if (best[1] < 0.05) return null;
    const hh = String(Math.floor(best[0] / 60)).padStart(2, '0');
    const mm = String(best[0] % 60).padStart(2, '0');
    return { kw: best[1], at: `${hh}:${mm}` };
  }, [samples]);
  // Gestern erzeugt: Tagessumme aus der Wochenbilanz, nur wenn der letzte Tag wirklich gestern war
  const week = useWeek(apiBase, pollEnabled);
  const yesterdayKwh = useMemo(() => {
    const last = week?.[week.length - 1];
    if (!last) return null;
    const y = new Date(Date.now() - 86_400_000);
    const ymd = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
    return last.day_date?.slice(0, 10) === ymd && Number.isFinite(last.total_solar_energy) ? last.total_solar_energy : null;
  }, [week]);

  // Heute live: nur wirklich frische Werte mitschreiben (nie Cache, nie veraltet)
  useEffect(() => {
    if (live.kind === 'live') recordLiveSample(apiBase, energy);
  }, [apiBase, energy, live.kind]);

  // Eigene Anlage: Bühne (Sonnenglühen, Tag/Nacht) und Kopfzeilen-Status koppeln
  useEffect(() => {
    if (!own) return;
    setStageSolar(peak && solar != null && live.kind === 'live' ? solar / peak : null);
  }, [own, peak, solar, live.kind]);
  useEffect(() => {
    if (own) setStageCoords(weather.coords);
  }, [own, weather.coords]);
  const liveKind = live.kind;
  const liveAt = live.at;
  useEffect(() => {
    if (own) setOwnLive({ kind: liveKind, at: liveAt });
  }, [own, liveKind, liveAt]);

  const insights = useMemo<Insight[]>(() => {
    const out: Insight[] = [];
    const evalNote = tr(language, { DE: 'Kennzahl der Anlagenauswertung', EN: 'Figure from the system evaluation', IT: "Dato dalla valutazione dell'impianto", FR: "Indicateur de l'évaluation de l'installation", SQ: 'Tregues nga vlerësimi i sistemit' });
    const hhNote = tr(language, {
      DE: 'Faktor 3.500 kWh pro Haushalt und Jahr',
      EN: 'Factor 3,500 kWh per household and year',
      IT: 'Fattore 3.500 kWh per famiglia all’anno',
      FR: 'Facteur 3 500 kWh par foyer et par an',
      SQ: 'Faktori 3.500 kWh për familje në vit',
    });
    if (todayKwh != null && todayKwh > 1) {
      const km = nf(todayKwh / EV_KWH_PER_KM, 0);
      out.push({
        id: 'hero',
        text: tr(language, {
          DE: `${nf(todayKwh, 0)}\u202FkWh heute ≈ ${km}\u202Fkm mit dem E-Auto`,
          EN: `${nf(todayKwh, 0)}\u202FkWh today ≈ ${km}\u202Fkm by electric car`,
          IT: `${nf(todayKwh, 0)}\u202FkWh oggi ≈ ${km}\u202Fkm in auto elettrica`,
          FR: `${nf(todayKwh, 0)}\u202FkWh aujourd'hui ≈ ${km}\u202Fkm en voiture électrique`,
          SQ: `${nf(todayKwh, 0)}\u202FkWh sot ≈ ${km}\u202Fkm me makinë elektrike`,
        }),
        note: tr(language, { DE: 'Faktor 0,18 kWh/km', EN: 'Factor 0.18 kWh/km', IT: 'Fattore 0,18 kWh/km', FR: 'Facteur 0,18 kWh/km', SQ: 'Faktori 0,18 kWh/km' }),
      });
    }
    if (autarky != null && autarky > 0) {
      const of10 = Math.round(autarky / 10);
      out.push({
        id: 'auto',
        text: tr(language, {
          DE: `${nf(autarky, 0)}\u202F% Autarkie – ${of10} von 10\u202FkWh stammen aus eigener Erzeugung`,
          EN: `${nf(autarky, 0)}\u202F% autarky – ${of10} of 10\u202FkWh come from own generation`,
          IT: `${nf(autarky, 0)}\u202F% di autarchia – ${of10} kWh su 10 da produzione propria`,
          FR: `${nf(autarky, 0)}\u202F% d'autarcie – ${of10} kWh sur 10 sont autoproduits`,
          SQ: `${nf(autarky, 0)}\u202F% autarki – ${of10} nga 10\u202FkWh nga prodhimi vetjak`,
        }),
        note: evalNote,
      });
    }
    if (todayKwh != null && todayKwh > HOUSEHOLD_KWH_DAY) {
      const hh = nf(todayKwh / HOUSEHOLD_KWH_DAY, 0);
      out.push({
        id: 'hero',
        text: tr(language, {
          DE: `Heute erzeugt: der Tagesbedarf von ${hh} Haushalten`,
          EN: `Generated today: the daily demand of ${hh} households`,
          IT: `Prodotto oggi: il fabbisogno giornaliero di ${hh} famiglie`,
          FR: `Produit aujourd'hui : la consommation journalière de ${hh} foyers`,
          SQ: `Prodhuar sot: nevoja ditore e ${hh} familjeve`,
        }),
        note: hhNote,
      });
    }
    if (selfUse != null && selfUse > 0) {
      out.push({
        id: 'self',
        text: tr(language, {
          DE: `${nf(selfUse, 0)}\u202F% des Solarstroms werden direkt vor Ort genutzt`,
          EN: `${nf(selfUse, 0)}\u202F% of the solar power is used right on site`,
          IT: `Il ${nf(selfUse, 0)}\u202F% dell’energia solare è usato sul posto`,
          FR: `${nf(selfUse, 0)}\u202F% de l’électricité solaire est consommée sur place`,
          SQ: `${nf(selfUse, 0)}\u202F% e energjisë diellore përdoret në vend`,
        }),
        note: evalNote,
      });
    }
    if (totalKwh != null && totalKwh > HOUSEHOLD_KWH_YEAR) {
      const hh = nf(totalKwh / HOUSEHOLD_KWH_YEAR, 0);
      out.push({
        id: 'energy',
        text: tr(language, {
          DE: `Seit Inbetriebnahme: so viel Strom, wie ${hh} Haushalte in einem Jahr brauchen`,
          EN: `Since commissioning: as much power as ${hh} households use in a year`,
          IT: `Dall’avvio: tanta energia quanta ne usano ${hh} famiglie in un anno`,
          FR: `Depuis la mise en service : autant que ${hh} foyers en un an`,
          SQ: `Që nga fillimi: aq energji sa ${hh} familje në një vit`,
        }),
        note: hhNote,
      });
    }
    return alternate(out);
  }, [todayKwh, autarky, selfUse, totalKwh, language]);

  const noInsights = useMemo<Insight[]>(() => [], []);
  const spotlight = useSpotlight(live.kind === 'offline' ? noInsights : insights, active);
  const spot = spotlight?.insight.id;

  const co2Km = todayCo2 != null && todayCo2 > 0 ? nf(todayCo2 / CAR_CO2_KG_PER_KM, 0) : null;
  // Baum-Äquivalent: Faktoren aus den Backend-Summen abgeleitet und offen ausgewiesen
  const gPerKwh = totalCo2Kg != null && totalKwh ? (totalCo2Kg * 1000) / totalKwh : null;
  const kgPerTree = totalCo2Kg != null && trees ? totalCo2Kg / trees : null;
  // Nur plausible Faktoren zeigen (Baum 10–30 kg CO₂/Jahr, Strom 50–1000 g CO₂/kWh); g/kWh selbst wird nicht angezeigt
  const treeFactorOk = kgPerTree != null && kgPerTree >= 10 && kgPerTree <= 30 && gPerKwh != null && gPerKwh >= 50 && gPerKwh <= 1000;
  const rd = (ms: number) => ({ '--rd': `${ms}ms` }) as CSSProperties;
  const evalFoot = L({ DE: 'aktueller Wert der Anlage', EN: 'current value from the system', IT: "valore attuale dell'impianto", FR: "valeur actuelle de l'installation", SQ: 'vlera aktuale e sistemit' });

  return (
    <ReplayContext.Provider value={epoch}>
      <UnavailableContext.Provider value={graceOver && !energy}>
        <div ref={rootRef} className="ov-kiosk relative h-full text-[1.5vmin] text-white portrait:text-[1.66vmin]">
          <div className="grid h-full gap-[1.1vmin] portrait:grid-rows-[35fr_13fr_28fr_24fr] landscape:grid-cols-[1.1fr_1fr] landscape:grid-rows-[1fr]">
            {/* Hero + Ringe (im Querformat linke Spalte) */}
            <div className="contents landscape:grid landscape:min-h-0 landscape:grid-rows-[1.7fr_1fr] landscape:gap-[1.1vmin]">
              <div className="ov-spot min-h-0 rounded-[32px]" data-spot={spot === 'hero' ? 'true' : 'false'} style={rd(0)}>
                <EnergyFlowHero
                  energy={energy}
                  peakKwp={peak}
                  hasBattery={false}
                  todayKwh={todayKwh}
                  language={language}
                  live={live}
                  coords={weather.coords}
                  todayPeak={todayPeak}
                  yesterdayKwh={yesterdayKwh}
                  insight={spotlight ? { text: spotlight.insight.text, note: spotlight.insight.note, key: spotlight.n } : null}
                />
                {spot === 'hero' && <span key={spotlight?.n} aria-hidden className="ov-spot-sweep z-20" />}
              </div>

              <div className="grid min-h-0 grid-cols-3 gap-[1.1vmin]" style={rd(120)}>
                <div className="min-h-0">
                  <RingTile
                    spot={spot === 'self'}
                    eyebrow={L({ DE: 'Eigenverbrauch', EN: 'Self-use', IT: 'Autoconsumo', FR: 'Autoconsommation', SQ: 'Vetëkonsumi' })}
                    label={L({ DE: 'Solarstrom selbst genutzt', EN: 'Solar power used on site', IT: 'Energia solare usata', FR: 'Solaire utilisé sur place', SQ: 'Energji e përdorur' })}
                    value={selfUse}
                    foot={evalFoot}
                  />
                </div>
                <div className="min-h-0" style={rd(180)}>
                  <RingTile
                    spot={spot === 'auto'}
                    eyebrow={L({ DE: 'Autarkie', EN: 'Autarky', IT: 'Autarchia', FR: 'Autarcie', SQ: 'Autarkia' })}
                    label={L({ DE: 'Unabhängig vom Netz', EN: 'Independent of the grid', IT: 'Indipendenza dalla rete', FR: 'Indépendance du réseau', SQ: 'E pavarur nga rrjeti' })}
                    value={autarky}
                    tone="blue"
                    foot={evalFoot}
                  />
                </div>
                <div className="min-h-0" style={rd(240)}>
                  <StatTile
                    spot={spot === 'co2'}
                    eyebrow={L({ DE: 'CO₂ heute', EN: 'CO₂ today', IT: 'CO₂ oggi', FR: "CO₂ aujourd'hui", SQ: 'CO₂ sot' })}
                    icon={<Leaf className="size-[55%]" strokeWidth={2} />}
                    value={todayCo2}
                    unit="kg"
                    accent="ov-text-brand"
                    foot={L({ DE: 'vermieden durch Solarstrom', EN: 'avoided by solar power', IT: 'evitati col solare', FR: 'évités grâce au solaire', SQ: 'shmangur me diell' })}
                    insight={
                      co2Km && (
                        <>
                          {L({ DE: `${co2Km}\u202Fkm Autofahrt`, EN: `${co2Km}\u202Fkm by car`, IT: `${co2Km}\u202Fkm in auto`, FR: `${co2Km}\u202Fkm en voiture`, SQ: `${co2Km}\u202Fkm me makinë` })}{' '}
                          <span className="whitespace-nowrap text-white/60">(0,15 kg/km)</span>
                        </>
                      )
                    }
                  />
                </div>
              </div>
            </div>

            {/* Diagramm + Bento (im Querformat rechte Spalte) */}
            <div className="contents landscape:grid landscape:min-h-0 landscape:grid-rows-[1.25fr_1fr] landscape:gap-[1.1vmin]">
              <div className="min-h-0" style={rd(200)}>
                <ChartStage language={language} showPrice={specs?.awattar === 'Yes'} apiBase={apiBase} enabled={pollEnabled} />
              </div>

              <div className="grid min-h-0 grid-cols-[1.15fr_1fr] grid-rows-2 gap-[1.1vmin]" style={rd(320)}>
                <div className="row-span-2 min-h-0">
                  <WeatherTile language={language} apiBase={apiBase} data={weather} />
                </div>
                <div className="min-h-0" style={rd(380)}>
                  <StatTile
                    spot={spot === 'trees'}
                    eyebrow={L({ DE: 'Baum-Äquivalent', EN: 'Tree equivalent', IT: 'Equivalente alberi', FR: 'Équivalent arbres', SQ: 'Ekuivalenti në pemë' })}
                    icon={<TreePine className="size-[55%]" strokeWidth={2} />}
                    value={trees != null ? Math.round(trees) : null}
                    decimals={0}
                    unit=""
                    foot={L({
                      DE: 'Bäume · CO₂-Aufnahme eines Jahres',
                      EN: 'trees · same CO₂ uptake in one year',
                      IT: 'alberi · stesso assorbimento di CO₂ in un anno',
                      FR: 'arbres · même absorption de CO₂ en un an',
                      SQ: 'pemë · e njëjta thithje CO₂ në një vit',
                    })}
                    note={
                      treeFactorOk ? (
                        <>
                          ≈ {nf(kgPerTree!, 0)}
                          {NNBSP}kg CO₂ {L({ DE: 'je Baum/Jahr', EN: 'per tree/year', IT: 'per albero/anno', FR: 'par arbre/an', SQ: 'për pemë/vit' })} ·{' '}
                          {L({ DE: 'CO₂-Berechnung: Anlagen-Server', EN: 'CO₂ calculation: system server', IT: 'Calcolo CO₂: server impianto', FR: 'Calcul CO₂ : serveur', SQ: 'Llogaritja CO₂: serveri' })}
                        </>
                      ) : undefined
                    }
                  />
                </div>
                <div className="min-h-0" style={rd(440)}>
                  <StatTile
                    spot={spot === 'energy'}
                    eyebrow={L({ DE: 'Energie gesamt', EN: 'Total energy', IT: 'Energia totale', FR: 'Énergie totale', SQ: 'Energjia totale' })}
                    icon={<Zap className="size-[55%]" strokeWidth={2} />}
                    value={totalKwh}
                    auto="energy"
                    unit="kWh"
                    accent="text-gradient-sun"
                    foot={
                      <>
                        {L({ DE: 'CO₂ vermieden gesamt', EN: 'CO₂ avoided in total', IT: 'CO₂ evitata totale', FR: 'CO₂ évité au total', SQ: 'CO₂ e shmangur gjithsej' })}{' '}
                        <span className="font-semibold text-white/85">
                          {num(co2Data?.total_co2) != null ? `${nf(co2Data!.total_co2!, 1)}\u202F${co2Data?.total_co2_unit ?? ''}` : '–'}
                        </span>
                      </>
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </UnavailableContext.Provider>
    </ReplayContext.Provider>
  );
};

export default KioskDisplay;
