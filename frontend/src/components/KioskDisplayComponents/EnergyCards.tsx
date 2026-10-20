// components/KioskDisplayComponents/EnergyBox.tsx
import React from 'react';
import { ArrowDownLeft, ArrowUpRight, Minus } from 'lucide-react';
import solarimg from "../../assets/paneli2.png";
import griddark from "../../assets/white-tower.png";
import gesamt from "../../assets/house.png";
import { CountUp } from '../../design/primitives';
import { delay, tr } from '../../design/hooks';

interface EnergyData {
  solar_energy: number;
  grid: number;
  spend_energy: number;
  self_usage_percentage?: number;
}

interface SystemSpecs {
  modulleistung: number;
  battery: string;
}

interface EnergyValue {
  value: number | null | undefined;
  loading: boolean;
}

interface EnergyBoxProps {
  solarData?: EnergyValue;
  consumptionData?: EnergyValue;
  gridData?: EnergyValue;
  theme: string;
  sideBoxHeight: number;
  energyData: EnergyData | null;
  energyLoading: boolean;
  systemData: SystemSpecs | null;
  systemLoading: boolean;
  language: string | null;
}

/** Eine Kennzahl-Karte: Eyebrow, Unterzeile, riesige Zahl (zählt hoch), Einheit klein/grau, Illustration mit Glühen */
function StatCard({
  eyebrow,
  sub,
  value,
  unit,
  tone = 'brand',
  image,
  badge,
  index,
}: {
  eyebrow: string;
  sub: React.ReactNode;
  value: number | null;
  unit: string;
  tone?: 'brand' | 'block' | 'white';
  image: string;
  badge?: React.ReactNode;
  index: number;
}) {
  const numberCls = tone === 'block' ? 'text-[#ff9c92]' : tone === 'white' ? 'text-white' : 'ov-text-brand';
  const glow = tone === 'block' ? 'rgb(240_87_75/0.32)' : tone === 'white' ? 'rgb(91_148_224/0.32)' : 'rgb(140_186_88/0.35)';
  return (
    <div
      className="ov-glass ov-rise relative flex h-full min-h-0 flex-col justify-between overflow-hidden rounded-3xl p-[calc(0.6vw+0.6vh)]"
      style={delay(index * 110)}
    >
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="eyebrow text-[calc(0.42vw+0.3vh)]">{eyebrow}</div>
          <p className="mt-[0.3em] text-[calc(0.5vw+0.35vh)] font-medium text-white/65">{sub}</p>
        </div>
        {badge}
      </div>

      <div className="relative z-10 flex items-baseline gap-[0.35em]">
        <span className={`num-display text-[calc(2.1vw+1.5vh)] leading-none ${numberCls}`}>
          <CountUp value={value} decimals={2} />
        </span>
        <span className="text-[calc(0.7vw+0.5vh)] font-semibold text-white/55">{unit}</span>
      </div>

      {/* Illustration rechts unten mit weichem Farbglühen */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-[18%] -right-[6%] size-[58%] rounded-full"
        style={{ background: `radial-gradient(closest-side, ${glow.replace(/_/g, ' ')}, transparent)` }}
      />
      <img
        src={image}
        alt=""
        className="pointer-events-none absolute bottom-[6%] right-[4%] h-[62%] w-[34%] object-contain drop-shadow-[0_18px_30px_rgba(0,0,0,0.45)]"
      />
    </div>
  );
}

const EnergyBox: React.FC<EnergyBoxProps> = ({ solarData, consumptionData, gridData, language }) => {
  const visible = [solarData, consumptionData, gridData].filter(Boolean).length;
  const cols = visible === 1 ? 'grid-cols-1' : visible === 2 ? 'grid-cols-2' : 'grid-cols-3';

  const gridValue = gridData && !gridData.loading && gridData.value != null ? Number(gridData.value) : null;
  const selling = gridValue !== null && gridValue < 0;
  const buying = gridValue !== null && gridValue > 0;

  const gridStatus = selling
    ? tr(language, { DE: 'Verkauf ins Netz', EN: 'Selling to the grid', IT: 'Vendita alla rete', FR: 'Vente au réseau', SQ: 'Shitet në rrjet' })
    : buying
      ? tr(language, { DE: 'Bezug aus dem Netz', EN: 'Buying from the grid', IT: 'Acquisto dalla rete', FR: 'Achat du réseau', SQ: 'Blerje nga rrjeti' })
      : tr(language, { DE: 'Aktueller Netzbezug', EN: 'Current grid usage', IT: 'Consumo attuale dalla rete', FR: 'Consommation actuelle du réseau', SQ: 'Konsumi aktual nga rrjeti' });

  const StatusIcon = selling ? ArrowUpRight : buying ? ArrowDownLeft : Minus;

  return (
    <div className={`grid ${cols} h-[14%] gap-[calc(0.5vw+0.5vh)]`}>
      {solarData && (
        <StatCard
          index={0}
          eyebrow={tr(language, { DE: 'Sonnenenergie', EN: 'Solar Energy', IT: 'Energia Solare', FR: 'Énergie Solaire', SQ: 'Energji Diellore' })}
          sub={tr(language, { DE: 'Aktuelle Erzeugung', EN: 'Current production', IT: 'Produzione attuale', FR: 'Production actuelle', SQ: 'Prodhimi aktual' })}
          value={solarData.loading ? null : solarData.value ?? null}
          unit="kW"
          image={solarimg}
          badge={
            <span className="glass-pill inline-flex shrink-0 items-center gap-[0.5em] rounded-full px-[0.9em] py-[0.35em] text-[calc(0.4vw+0.3vh)]">
              <span className="live-dot" />
              <span className="eyebrow-plain text-[#aed083]">Live</span>
            </span>
          }
        />
      )}

      {consumptionData && (
        <StatCard
          index={1}
          tone="white"
          eyebrow={tr(language, { DE: 'Gesamtverbrauch', EN: 'Total Consumption', IT: 'Consumo Totale', FR: 'Consommation Totale', SQ: 'Konsumi Total' })}
          sub={tr(language, { DE: 'Aktueller Verbrauch', EN: 'Current consumption', IT: 'Consumo attuale', FR: 'Consommation actuelle', SQ: 'Konsumi aktual' })}
          value={consumptionData.loading ? null : consumptionData.value ?? null}
          unit="kW"
          image={gesamt}
        />
      )}

      {gridData && (
        <StatCard
          index={2}
          tone={buying ? 'block' : 'brand'}
          eyebrow={tr(language, { DE: 'Netz', EN: 'Grid', IT: 'Rete', FR: 'Réseau', SQ: 'Rrjeti' })}
          sub={gridStatus}
          value={gridValue === null ? null : Math.abs(gridValue)}
          unit="kW"
          image={griddark}
          badge={
            <span
              className={`inline-flex size-[calc(1.3vw+1vh)] shrink-0 items-center justify-center rounded-full border ${
                buying ? 'border-[#64231f] bg-[rgb(240_87_75/0.18)] text-[#ff9c92]' : 'border-[#2c4a22] bg-[rgb(140_186_88/0.16)] text-[#aed083]'
              }`}
              aria-label={gridStatus}
            >
              <StatusIcon className="size-[55%]" strokeWidth={2.4} />
            </span>
          }
        />
      )}
    </div>
  );
};

export default EnergyBox;
