import type { MapDataConfig } from '../../../hooks/useMapData';
import { KpiRing } from './KpiRing';
import { tr } from '../../../design/hooks';
import { T, ZONES, type Lang, type ZoneCode } from './config';
import { useGridData } from './useGridData';
import { countryByIso, countryName } from './geo';
import { CarbonGauge } from './CarbonGauge';
import { FlowMap } from './FlowMap';
import { OriginChart } from './OriginChart';
import { CarbonHistory } from './CarbonHistory';
import '../map.css';

interface Props {
  zone: ZoneCode;
  mapConfig: MapDataConfig | null;
  language: Lang;
}

const pct = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/**
 * Strommix-Bildschirm als Bento-Raster (gleich für AT / DE / CH / XK):
 * Hochformat: Kennzahlen · CO₂-Verlauf 24 h · Karte · Herkunft
 * Querformat: links Kennzahlen + Herkunft, rechts Karte + Verlauf
 */
export function GridDisplay({ zone, mapConfig, language }: Props) {
  const { power, carbon, history, loading, error, cachedAt } = useGridData(mapConfig);
  const L = (t: Parameters<typeof tr>[1]) => tr(language, t);
  const ci = carbon?.carbonIntensity ?? null;
  const busy = loading || !mapConfig;
  // Verlauf nur zeigen, wenn electricitymaps ihn für Token/Zone liefert – sonst bekommen Karte und Herkunft den Platz
  // nicht live: zwischengespeicherter Stand oder letzter Abruf fehlgeschlagen
  const staleLabel = power ? (cachedAt != null ? L(T.cached) : error ? L(T.stale) : null) : null;
  const showHistory = busy || history != null;

  return (
    <div className="h-full text-[1.5vmin] text-white">
      <div
        className={`grid h-full gap-[1.1vmin] landscape:grid-cols-[1fr_1.18fr] ${showHistory ? 'portrait:grid-rows-[18fr_13fr_38fr_31fr] landscape:grid-rows-[1fr_0.34fr]' : 'portrait:grid-rows-[19fr_44fr_37fr] landscape:grid-rows-[1fr]'}`}
      >
        <div className="contents landscape:grid landscape:min-h-0 landscape:row-span-full landscape:grid-rows-[0.68fr_1.32fr] landscape:gap-[1.1vmin]">
          {/* Kennzahlen */}
          <div className="ov-stagger grid min-h-0 grid-cols-[1.2fr_1fr] gap-[1.1vmin]">
            <CarbonGauge value={ci} loading={busy} language={language} staleLabel={staleLabel} />
            <div className="ov-stagger grid min-h-0 grid-rows-2 gap-[1.1vmin]">
              <KpiRing eyebrow={L(T.fossilFree)} label={L(T.fossilFreeLabel)} value={pct(power?.fossilFreePercentage)} failed={!busy && !power} tone="blue" staleLabel={staleLabel} />
              <KpiRing eyebrow={L(T.renewable)} label={L(T.renewableLabel)} value={pct(power?.renewablePercentage)} failed={!busy && !power} staleLabel={staleLabel} />
            </div>
          </div>

          {/* Herkunft (Querformat: unter den Kennzahlen) */}
          <div className="ov-stagger min-h-0 portrait:order-3">
            <OriginChart power={power} country={countryName(countryByIso(zone), language)} loading={busy} stale={!!staleLabel} language={language} />
          </div>
        </div>

        {/* CO₂-Verlauf der letzten 24 h (Querformat: unter der Karte) */}
        {showHistory && (
          <div className="ov-stagger min-h-0 portrait:order-1 landscape:col-start-2 landscape:row-start-2">
            <CarbonHistory history={history} loading={busy} language={language} staleLabel={staleLabel} />
          </div>
        )}

        {/* Karte */}
        <div className="ov-stagger min-h-0 portrait:order-2 landscape:col-start-2 landscape:row-start-1">
          <FlowMap zone={ZONES[zone]} power={power} ci={ci} loading={busy} error={error} cachedAt={cachedAt} language={language} />
        </div>
      </div>
    </div>
  );
}

export default GridDisplay;
