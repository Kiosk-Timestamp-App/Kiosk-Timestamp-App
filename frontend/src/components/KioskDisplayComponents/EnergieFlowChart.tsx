// /home/pvadmin/kiosk/apps/kiosk/frontend/src/components/KioskDisplayComponents/EnergyFlowChart.tsx
import React from 'react';
import { Euro } from 'lucide-react';
import OkoLogo from '../../assets/OkoIcon.png';
import GridIcon from '../../assets/tower2.png';
import PlugIcon from '../../assets/house.png';
import SolarIcon from '../../assets/Solar Panels.png';
import BatteryIcon from '../../assets/batter-storage.png';
import GridIcondark from "../../assets/white-tower.png";
import type { SystemData } from '../../hooks/useSystemData';

interface EnergyFlowChartProps {
  energyData: SystemData | null;
  energyLoading: boolean;
  showBattery: boolean;
  theme: string;
  language: string | null;
}

export const EnergyFlowChart: React.FC<EnergyFlowChartProps> = React.memo(function EnergyFlowChart({
  energyData,
  energyLoading,
  showBattery,
  theme,
  language
}) {
  if (showBattery) {
    return <EnergyFlowWithBattery {...{ energyData, energyLoading, theme, language }} />;
  }
  
  return <EnergyFlowWithoutBattery {...{ energyData, energyLoading, theme, language }} />;
});

const EnergyFlowWithoutBattery: React.FC<Omit<EnergyFlowChartProps, 'showBattery'>> = ({
  energyData,
  energyLoading,
  theme,
  language
}) => {
  return (
    <div>
      {/* Header Section */}
      <div className="flex items-center justify-between py-[calc(0.3vw+0.3vh)] px-[calc(0.3vw+0.3vh)]">
        <div>
          <h2 className={`text-xl lg:text-2xl font-bold mb-1 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
            {language === "EN"
              ? "Current Energy Flow"
              : language === "IT"
                ? "Flusso Energetico Attuale"
                : language === "FR"
                  ? "Flux Énergétique Actuel"
                  : language === "SQ"
                    ? "Fluxi i Energjisë Aktual"
                    : language === "DE"
                      ? "Energiefluss aktuell"
                      : "Energiefluss aktuell"}
          </h2>
          <p
            className={`text-[calc(0.5vw+0.5vh)]  font-medium leading-none ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
          >
            {language === "EN"
              ? "Instantaneous Power"
              : language === "IT"
                ? "Potenza Istantanea"
                : language === "FR"
                  ? "Puissance Instantanée"
                  : language === "SQ"
                    ? "Fuqi Aktuale"
                    : language === "DE"
                      ? "Momentane Leistung"
                      : "Momentane Leistung"}
          </p>
        </div>
        <div className={`rounded-xl p-2 ${theme === 'dark' ? 'ov-well' : 'bg-gray-100'} 
        ${energyData && !energyLoading ?
            (energyData.solar_energy < energyData.spend_energy ?
              'animate-pulse bg-red-500/20' :
              'animate-pulse bg-green-500/20') :
            ''}`}>
          <Euro
            className={`w-5 h-5 transition-all duration-500
            ${energyData && !energyLoading ?
                (energyData.solar_energy < energyData.spend_energy ?
                  'text-red-500' :
                  'text-green-500') :
                (theme === 'dark' ? 'text-gray-300' : 'text-gray-600')}`}
          />
        </div>
      </div>
      
      {/* SVG Diagram Section */}
      <div className="relative h-[550px] w-full max-w-2xl mx-auto flex items-center justify-center">
        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0"
          width="100%" height="80%" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <path id="solarPath" d="M 18 43 L 18 55 L 41 55" />
            <path id="housePath" d="M 55 55 L 82 55 L 82 44" />
            <path id="gridPathUp" d="M 50 82 L 50 64" />
            <path id="gridPathDown" d="M 50 63 L 50 78" />
          </defs>
          
          {/* Static Paths */}
          <path d="M 18 43 L 18 55 L 43 55" stroke="#8cba58" strokeWidth="0.4" fill="none" />
          <path d="M 82 43 L 82 55 L 57 55" stroke="#8cba58" strokeWidth="0.4" fill="none" />
          <path
            d="M 50 80 L 50 63"
            stroke={energyData && energyData.grid > 0 ? "#f0574b" : energyData && energyData.grid < 0 ? "#8cba58" : "#a1a1aa"}
            strokeWidth="0.4"
            fill="none"
          />
          
          {/* Solar Energy Animation */}
          {energyData && energyData.solar_energy > 0 && (
            <>
              <path d="M0 -1.2 L2 0 L0 1.2" stroke="#8cba58" strokeWidth="0.4" fill="none">
                <animateMotion dur="3s" repeatCount="indefinite" rotate="auto" begin="0s">
                  <mpath href="#solarPath" />
                </animateMotion>
              </path>
              <path d="M0 -1.2 L2 0 L0 1.2" stroke="#8cba58" strokeWidth="0.4" fill="none">
                <animateMotion dur="3s" repeatCount="indefinite" rotate="auto" begin="1s">
                  <mpath href="#solarPath" />
                </animateMotion>
              </path>
              <path d="M0 -1.2 L2 0 L0 1.2" stroke="#8cba58" strokeWidth="0.4" fill="none">
                <animateMotion dur="3s" repeatCount="indefinite" rotate="auto" begin="2s">
                  <mpath href="#solarPath" />
                </animateMotion>
              </path>
            </>
          )}

          {/* Grid Energy Animation */}
          {energyData && energyData.grid > 0 ? (
            <>
              <path d="M0 -1.2 L2 0 L0 1.2" stroke="#f0574b" strokeWidth="0.4" fill="none">
                <animateMotion dur="3s" repeatCount="indefinite" rotate="auto" begin="0s">
                  <mpath href="#gridPathUp" />
                </animateMotion>
              </path>
              <path d="M0 -1.2 L2 0 L0 1.2" stroke="#f0574b" strokeWidth="0.4" fill="none">
                <animateMotion dur="3s" repeatCount="indefinite" rotate="auto" begin="1.5s">
                  <mpath href="#gridPathUp" />
                </animateMotion>
              </path>
            </>
          ) : energyData && energyData.grid < 0 ? (
            <>
              <path d="M0 -1.2 L2 0 L0 1.2" stroke="#8cba58" strokeWidth="0.4" fill="none">
                <animateMotion dur="3s" repeatCount="indefinite" rotate="auto" begin="0s">
                  <mpath href="#gridPathDown" />
                </animateMotion>
              </path>
              <path d="M0 -1.2 L2 0 L0 1.2" stroke="#8cba58" strokeWidth="0.4" fill="none">
                <animateMotion dur="3s" repeatCount="indefinite" rotate="auto" begin="1.4s">
                  <mpath href="#gridPathDown" />
                </animateMotion>
              </path>
            </>
          ) : null}
          
          {/* House Consumption Animation */}
          <path d="M0 -1.2 L2 0 L0 1.2" stroke="#8cba58" strokeWidth="0.4" fill="none">
            <animateMotion dur="3s" repeatCount="indefinite" rotate="auto" begin="0s">
              <mpath href="#housePath" />
            </animateMotion>
          </path>
          <path d="M0 -1.2 L2 0 L0 1.2" stroke="#8cba58" strokeWidth="0.4" fill="none">
            <animateMotion dur="3s" repeatCount="indefinite" rotate="auto" begin="2s">
              <mpath href="#housePath" />
            </animateMotion>
          </path>
          <path d="M0 -1.2 L2 0 L0 1.2" stroke="#8cba58" strokeWidth="0.4" fill="none">
            <animateMotion dur="3s" repeatCount="indefinite" rotate="auto" begin="4s">
              <mpath href="#housePath" />
            </animateMotion>
          </path>
        </svg>
        
        {/* Solar Energy Icon and Label */}
        <div className="absolute top-[-55px] left-[-1%] flex flex-col items-center z-10">
          <div className="flex items-center justify-center">
            <img src={SolarIcon} className="w-73 h-83" />
          </div>
          <div className="flex flex-col items-center ml-[-43px] mt-[-105px]">
            <p className={`text-md font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
              {language === "EN" ? "Solar Energy" : 
               language === "IT" ? "Energia Solare" : 
               language === "FR" ? "Énergie Solaire" : 
               language === "SQ" ? "Energji Diellore" : 
               language === "DE" ? "Sonnenenergie" : "Sonnenenergie"}
            </p>
            <p className="text-md font-medium ov-text-brand">
              {energyLoading ? '--' : energyData?.solar_energy.toFixed(2) ?? 'N/A'} kW
            </p>
          </div>
        </div>
        
        {/* Consumption Icon and Label */}
        <div className="absolute -top-[20px] right-[0%] flex flex-col items-center z-10">
          <div className="flex items-center justify-center">
            <img src={PlugIcon} className="w-63 h-53" />
          </div>
          <div className="flex flex-col items-center mt-[-20px]">
            <p className={`text-md font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
              {language === "EN" ? "Total Consumption" : 
               language === "IT" ? "Consumo Totale" : 
               language === "FR" ? "Consommation Totale" : 
               language === "SQ" ? "Konsum Total" : 
               language === "DE" ? "Gesamtverbrauch" : "Gesamtverbrauch"}
            </p>
            <p className="text-md font-medium ov-text-brand">
              {energyLoading ? '--' : energyData?.spend_energy.toFixed(2) ?? 'N/A'} kW
            </p>
          </div>
        </div>
        
        {/* Grid Icon and Label */}
        <div className="absolute top-110 left-[50%] transform -translate-x-1/2 flex flex-col items-center z-10">
          <p className={`text-md font-medium ${energyData && energyData.grid > 0 ? 'text-[#f0574b]' : energyData && energyData.grid < 0 ? 'ov-text-brand' : 'ov-text-brand'}`}>
            {energyLoading ? '--' : Math.abs(Number(energyData?.grid.toFixed(2))) ?? 'N/A'} kW
          </p>
          <p className={`text-md font-semibold -mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
            {language === "EN"
              ? "Net"
              : language === "IT"
                ? "Rete"
                : language === "FR"
                  ? "Réseau"
                  : language === "SQ"
                    ? "Rrjeti"
                    : language === "DE"
                      ? "Netz"
                      : "Netz"}
          </p>
          <div className="flex items-center justify-center">
            <img src={theme === 'dark' ? GridIcondark : GridIcon} className="w-50 h-40" />
          </div>
        </div>
        
        {/* OKOVOLT Logo */}
        <div className="absolute top-75 left-1/2 transform -translate-x-1/2 -translate-y-1/2 px-4 z-10">
          <img
            src={OkoLogo}
            alt="ÖKOVOLT Logo"
            className="w-16 h-auto object-contain transition-transform duration-300"
          />
        </div>
      </div>
    </div>
  );
};

const EnergyFlowWithBattery: React.FC<Omit<EnergyFlowChartProps, 'showBattery'>> = ({
  energyData,
  energyLoading,
  theme,
  language
}) => {
  return (
    <div>
      {/* Header Section */}
      <div className="flex items-center justify-between mb-3 py-[calc(0.3vw+0.3vh)] px-[calc(0.3vw+0.3vh)]">
        <div>
          <h2 className={`text-xl lg:text-2xl font-bold mb-1 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
            {language === "EN"
              ? "Current Energy Flow"
              : language === "IT"
                ? "Flusso Energetico Attuale"
                : language === "FR"
                  ? "Flux Énergétique Actuel"
                  : language === "SQ"
                    ? "Fluxi i Energjisë Aktual"
                    : language === "DE"
                      ? "Energiefluss aktuell"
                      : "Energiefluss aktuell"}
          </h2>
          <p
            className={`text-[calc(0.5vw+0.5vh)]  font-medium leading-none ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
          >
            {language === "EN"
              ? "Instantaneous Power"
              : language === "IT"
                ? "Potenza Istantanea"
                : language === "FR"
                  ? "Puissance Instantanée"
                  : language === "SQ"
                    ? "Fuqi Aktuale"
                    : language === "DE"
                      ? "Momentane Leistung"
                      : "Momentane Leistung"}
          </p>
        </div>
        <div className={`rounded-xl p-2 ${theme === 'dark' ? 'ov-well' : 'bg-gray-100'} 
        ${energyData && !energyLoading ?
            (energyData.solar_energy < energyData.spend_energy ?
              'animate-pulse bg-red-500/20' :
              'animate-pulse bg-green-500/20') :
            ''}`}>
          <Euro
            className={`w-5 h-5 transition-all duration-500
            ${energyData && !energyLoading ?
                (energyData.solar_energy < energyData.spend_energy ?
                  'text-red-500' :
                  'text-green-500') :
                (theme === 'dark' ? 'text-gray-300' : 'text-gray-600')}`}
          />
        </div>
      </div>
      
      {/* SVG Diagram Section with Battery */}
      <div className="relative h-[550px] w-full max-w-2xl mx-auto flex items-center justify-center">
        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0"
          width="100%" height="80%" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <path id="solarPath2" d="M 18 50 L 18 62 L 42 62" />
            <path id="housePath2" d="M 59 62 L 82 62 L 82 51" />
            <path id="BatteryPath" d="M 18 78 L 18 66 L 42 66" />
            <path id="gridPathUp2" d="M 82 78 L 82 66 L 58 66" />
            <path id="gridPathDown2" d="M 59 66 L 82 66 L 82 77" />
          </defs>
          
          {/* Static Paths with Battery */}
          <path d="M 18 50 L 18 62 L 43 62" stroke="#8cba58" strokeWidth="0.4" fill="none" />
          <path d="M 18 78 L 18 66 L 43 66" stroke="#8cba58" strokeWidth="0.4" fill="none" />
          <path d="M 82 50 L 82 62 L 57 62" stroke="#8cba58" strokeWidth="0.4" fill="none" />
          <path d="M 82 78 L 82 66 L 57 66" stroke={energyData && energyData.grid > 0 ? "#f0574b" : energyData && energyData.grid < 0 ? "#8cba58" : "#a1a1aa"} strokeWidth="0.4" fill="none" />
          
          {/* Solar Energy Animation */}
          {energyData && energyData.solar_energy > 0 && (
            <>
              <path d="M0 -1.2 L2 0 L0 1.2" stroke="#8cba58" strokeWidth="0.4" fill="none">
                <animateMotion dur="3s" repeatCount="indefinite" rotate="auto" begin="0s">
                  <mpath href="#solarPath2" />
                </animateMotion>
              </path>
              <path d="M0 -1.2 L2 0 L0 1.2" stroke="#8cba58" strokeWidth="0.4" fill="none">
                <animateMotion dur="3s" repeatCount="indefinite" rotate="auto" begin="1s">
                  <mpath href="#solarPath2" />
                </animateMotion>
              </path>
              <path d="M0 -1.2 L2 0 L0 1.2" stroke="#8cba58" strokeWidth="0.4" fill="none">
                <animateMotion dur="3s" repeatCount="indefinite" rotate="auto" begin="2s">
                  <mpath href="#solarPath2" />
                </animateMotion>
              </path>
            </>
          )}
          
          {/* House Consumption Animation */}
          <path d="M0 -1.2 L2 0 L0 1.2" stroke="#8cba58" strokeWidth="0.4" fill="none">
            <animateMotion dur="3s" repeatCount="indefinite" rotate="auto" begin="0s">
              <mpath href="#housePath2" />
            </animateMotion>
          </path>
          <path d="M0 -1.2 L2 0 L0 1.2" stroke="#8cba58" strokeWidth="0.4" fill="none">
            <animateMotion dur="3s" repeatCount="indefinite" rotate="auto" begin="1s">
              <mpath href="#housePath2" />
            </animateMotion>
          </path>
          <path d="M0 -1.2 L2 0 L0 1.2" stroke="#8cba58" strokeWidth="0.4" fill="none">
            <animateMotion dur="3s" repeatCount="indefinite" rotate="auto" begin="2s">
              <mpath href="#housePath2" />
            </animateMotion>
          </path>

          {/* Battery Animation */}
          <path d="M0 -1.2 L2 0 L0 1.2" stroke="#8cba58" strokeWidth="0.4" fill="none">
            <animateMotion dur="3s" repeatCount="indefinite" rotate="auto" begin="0s">
              <mpath href="#BatteryPath" />
            </animateMotion>
          </path>
          <path d="M0 -1.2 L2 0 L0 1.2" stroke="#8cba58" strokeWidth="0.4" fill="none">
            <animateMotion dur="3s" repeatCount="indefinite" rotate="auto" begin="1s">
              <mpath href="#BatteryPath" />
            </animateMotion>
          </path>
          <path d="M0 -1.2 L2 0 L0 1.2" stroke="#8cba58" strokeWidth="0.4" fill="none">
            <animateMotion dur="3s" repeatCount="indefinite" rotate="auto" begin="2s">
              <mpath href="#BatteryPath" />
            </animateMotion>
          </path>
          
          {/* Grid Energy Animation */}
          {energyData && energyData.grid > 0 ? (
            <>
              <path d="M0 -1.2 L2 0 L0 1.2" stroke="#f0574b" strokeWidth="0.4" fill="none">
                <animateMotion dur="3s" repeatCount="indefinite" rotate="auto" begin="0s">
                  <mpath href="#gridPathUp2" />
                </animateMotion>
              </path>
              <path d="M0 -1.2 L2 0 L0 1.2" stroke="#f0574b" strokeWidth="0.4" fill="none">
                <animateMotion dur="3s" repeatCount="indefinite" rotate="auto" begin="1s">
                  <mpath href="#gridPathUp2" />
                </animateMotion>
              </path>
              <path d="M0 -1.2 L2 0 L0 1.2" stroke="#f0574b" strokeWidth="0.4" fill="none">
                <animateMotion dur="3s" repeatCount="indefinite" rotate="auto" begin="2s">
                  <mpath href="#gridPathUp2" />
                </animateMotion>
              </path>
            </>
          ) : energyData && energyData.grid < 0 ? (
            <>
              <path d="M0 -1.2 L2 0 L0 1.2" stroke="#8cba58" strokeWidth="0.4" fill="none">
                <animateMotion dur="3s" repeatCount="indefinite" rotate="auto" begin="0s">
                  <mpath href="#gridPathDown2" />
                </animateMotion>
              </path>
              <path d="M0 -1.2 L2 0 L0 1.2" stroke="#8cba58" strokeWidth="0.4" fill="none">
                <animateMotion dur="3s" repeatCount="indefinite" rotate="auto" begin="1s">
                  <mpath href="#gridPathDown2" />
                </animateMotion>
              </path>
              <path d="M0 -1.2 L2 0 L0 1.2" stroke="#8cba58" strokeWidth="0.4" fill="none">
                <animateMotion dur="3s" repeatCount="indefinite" rotate="auto" begin="2s">
                  <mpath href="#gridPathDown2" />
                </animateMotion>
              </path>
            </>
          ) : null}
        </svg>
        
        {/* Solar Energy Icon and Label */}
        <div className="absolute top-[19px] left-[4.5%] flex flex-col items-center z-10">
          <div className="flex items-center justify-center">
            <img src={SolarIcon} className="w-63 h-73" />
          </div>
          <div className="flex flex-col items-center ml-[-43px] mt-[-105px]">
            <p className={`text-[calc(0.6vw+0.6vh)] font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
              {language === "EN" ? "Solar Energy" : 
               language === "IT" ? "Energia Solare" : 
               language === "FR" ? "Énergie Solaire" : 
               language === "SQ" ? "Energji Diellore" : 
               language === "DE" ? "Sonnenenergie" : "Sonnenenergie"}
            </p>
            <p className="text-[calc(0.6vw+0.6vh)] font-medium ov-text-brand">
              {energyLoading ? '--' : energyData?.solar_energy.toFixed(2) ?? 'N/A'} kW
            </p>
          </div>
        </div>
        
        {/* Consumption Icon and Label */}
        <div className="absolute top-[55px] right-[0%] flex flex-col items-center z-10">
          <div className="flex items-center justify-center">
            <img src={PlugIcon} className="w-53 h-43" />
          </div>
          <div className="flex flex-col items-center mt-[-20px]">
            <p className={`text-[calc(0.6vw+0.6vh)] font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
              {language === "EN" ? "Total Consumption" : 
               language === "IT" ? "Consumo Totale" : 
               language === "FR" ? "Consommation Totale" : 
               language === "SQ" ? "Konsum Total" : 
               language === "DE" ? "Gesamtverbrauch" : "Gesamtverbrauch"}
            </p>
            <p className="text-[calc(0.6vw+0.6vh)] font-medium ov-text-brand">
              {energyLoading ? '--' : energyData?.spend_energy.toFixed(2) ?? 'N/A'} kW
            </p>
          </div>
        </div>
        
        {/* Battery Icon and Label */}
        <div className="absolute top-110 left-[18%] transform -translate-x-1/2 flex flex-col items-center z-10">
          <p className={`text-[calc(0.6vw+0.6vh)] font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
            {language === "EN" ? "Battery" : 
             language === "IT" ? "Batteria" : 
             language === "FR" ? "Batterie" : 
             language === "SQ" ? "Bateri" : 
             language === "DE" ? "Batterie" : "Batterie"}
          </p>
          <p className="text-[calc(0.6vw+0.6vh)] font-medium ov-text-brand">
            80 %
          </p>
          <div className="flex items-center justify-center">
            <img src={BatteryIcon} className="w-50 h-30" />
          </div>
        </div>
        
        {/* Grid Icon and Label */}
        <div className="absolute top-110 right-[-6%] transform -translate-x-1/2 flex flex-col items-center z-10">
          <p className={`text-[calc(0.6vw+0.6vh)] font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
            {language === "EN"
              ? "Net"
              : language === "IT"
                ? "Rete"
                : language === "FR"
                  ? "Réseau"
                  : language === "SQ"
                    ? "Rrjeti"
                    : language === "DE"
                      ? "Netz"
                      : "Netz"}
          </p>
          <p className={`text-[calc(0.6vw+0.6vh)] font-medium ${energyData && energyData.grid > 0 ? 'text-[#f0574b]' : energyData && energyData.grid < 0 ? 'ov-text-brand' : 'ov-text-brand'}`}>
            {energyLoading ? '--' : Math.abs(Number(energyData?.grid.toFixed(2))) ?? 'N/A'} kW
          </p>
          <div className="flex items-center justify-center">
            <img src={theme === 'dark' ? GridIcondark : GridIcon} className="w-40 h-30" />
          </div>
        </div>
        
        {/* OKOVOLT Logo */}
        <div className="absolute top-87 left-1/2 transform -translate-x-1/2 -translate-y-1/2 px-4 z-10">
          <img
            src={OkoLogo}
            alt="ÖKOVOLT Logo"
            className="w-16 h-auto object-contain transition-transform duration-300"
          />
        </div>
      </div>
    </div>
  );
};