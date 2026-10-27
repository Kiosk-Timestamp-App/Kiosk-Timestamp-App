import React from 'react';
import { Sun } from 'lucide-react';
import { Leaf } from "lucide-react";
import { useTheme } from '../../context/ThemeProvider';
import { useCo2Data } from '../../hooks/useCO2Data';

interface KioskEndBoxesProps {
  isFullscreen?: boolean;
  screenWidth?: number;
  screenHeight?: number;
  aspectRatio?: number;
  showCo2Box?: boolean;
  showTreesBox?: boolean;
}

export const KiosEndBoxes: React.FC<KioskEndBoxesProps> = ({
  showCo2Box = true,
  showTreesBox = true
}) => {
  const { theme } = useTheme();
  const { co2Data, loading: co2Loading } = useCo2Data();

  // Calculate the number of columns needed
  const boxCount = [showCo2Box, showTreesBox].filter(Boolean).length;
  const gridCols = boxCount === 1 ? 'grid-cols-1' : 'grid-cols-2';
  const boxWidth = boxCount === 1 ? 'w-full' : 'w-full';

  return (
    <div className={`grid ${gridCols} gap-4 mb-6`}>
      {/* CO2 Box - only shown if showCo2Box is true */}
      {showCo2Box && (
        <div
          className={`rounded-2xl shadow-md p-[calc(0.6vw+0.6vh)] border relative overflow-hidden h-full flex flex-col justify-between ${boxWidth} ${theme === 'dark' ? 'ov-glass border-white/10' : 'bg-white border-gray-100'
            }`}
        >
          <div className="relative z-10 flex flex-col justify-center h-full gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 ov-tile-brand rounded-2xl shadow-md">
                <Leaf className="w-[calc(1.2vw+1.2vh)] h-auto text-white" />
              </div>
              <div className="flex flex-col">
                <h1 className={`text-[calc(0.8vw+0.8vh)] font-bold ${theme === 'dark' ? 'text-gray-100' : 'text-white'}`}>CO₂ Ersparnis</h1>
                <p className={`text-[calc(0.5vw+0.5vh)] ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>CO₂ Einsparung durch Solarstrom</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className={`flex items-center justify-between p-3 rounded-xl ${theme === 'dark' ? 'bg-emerald-500/10' : 'bg-[#8cba58]/10'}`}>
                <div className="flex items-center space-x-3">
                  <div className="w-[calc(0.6vw+0.6vh)] h-[calc(0.6vw+0.6vh)] bg-[#669933] rounded-full animate-pulse"></div>
                  <span className={`text-[calc(0.3vw+0.6vh)] font-semibold ${theme === 'dark' ? 'text-[#8cba58]' : 'text-[#669933]'}`}>Heute</span>
                </div>
                <div className="text-right">
                  <span className={`text-[calc(0.3vw+0.6vh)] font-bold ${theme === 'dark' ? 'text-[#8cba58]' : 'text-[#669933]'}`}>{co2Loading ? '--' : co2Data?.today_co2?.toFixed(2) || 'N/A'}</span>
                  <span className={`text-[calc(0.3vw+0.6vh)] ml-1 ${theme === 'dark' ? 'text-[#8cba58]' : 'text-[#669933]'}`}>kg</span>
                </div>
              </div>

              <div className={`flex items-center justify-between p-3 rounded-xl ${theme === 'dark' ? 'bg-blue-500/10' : 'bg-[#5b94e0]/10'}`}>
                <div className="flex items-center space-x-3">
                  <div className={`w-[calc(0.6vw+0.6vh)] h-[calc(0.6vw+0.6vh)] rounded-full ${theme === 'dark' ? 'bg-blue-500' : 'bg-[#0a1b36]'}`}></div>
                  <span className={`text-[calc(0.3vw+0.6vh)] font-semibold ${theme === 'dark' ? 'text-blue-400' : 'text-white'}`}>Gesamt</span>
                </div>
                <div className="text-right">
                  <span className={`text-[calc(0.3vw+0.6vh)] font-bold ${theme === 'dark' ? 'text-blue-400' : 'text-white'}`}>{co2Loading ? '--' : co2Data?.total_co2?.toFixed(2) || 'N/A'}</span>
                  <span className={`text-[calc(0.3vw+0.6vh)] ml-1 ${theme === 'dark' ? 'text-blue-400' : 'text-white'}`}>{co2Loading ? '--' : co2Data?.total_co2_unit || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trees Box - only shown if showTreesBox is true */}
      {showTreesBox && (
        <div
          className={`rounded-3xl shadow-md p-[calc(0.6vw+0.6vh)] border relative overflow-hidden h-full flex flex-col justify-between ${boxWidth} ${theme === 'dark' ? 'ov-glass border-white/10' : 'bg-white border-gray-100'
            }`}
        >
          <div className="relative z-10 flex flex-col justify-center h-full gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 ov-tile-brand rounded-2xl shadow-lg">
                <Sun className="w-[calc(1.2vw+1.2vh)] h-auto text-white" />
              </div>
              <div className="flex flex-col">
                <h1 className={`text-[calc(0.8vw+0.8vh)] font-bold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>Umwelt Beitrag</h1>
                <p className={`text-[calc(0.5vw+0.5vh)] ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Umweltbeitrag durch Solarstrom</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className={`flex items-center justify-between p-3 rounded-xl ${theme === 'dark' ? 'bg-emerald-500/10' : 'bg-[#8cba58]/10'}`}>
                <div className="flex items-center space-x-3">
                  <Leaf className={`w-[calc(0.6vw+0.6vh)] h-auto ${theme === 'dark' ? 'text-[#8cba58]' : 'text-[#669933]'}`} />
                  <span className={`text-[calc(0.3vw+0.6vh)] font-semibold ${theme === 'dark' ? 'text-[#8cba58]' : 'text-[#669933]'}`}>Bäume gerettet (Heute)</span>
                </div>
                <div className="text-right">
                  <span className={`text-[calc(0.3vw+0.6vh)] font-bold ${theme === 'dark' ? 'text-[#8cba58]' : 'text-[#669933]'}`}>{co2Loading ? '--' : co2Data?.today_trees_saved?.toFixed(2) || 'N/A'}</span>
                </div>
              </div>

              <div className={`flex items-center justify-between p-3 rounded-xl ${theme === 'dark' ? 'bg-blue-500/10' : 'bg-[#5b94e0]/10'}`}>
                <div className="flex items-center space-x-3">
                  <Leaf className={`w-[calc(0.6vw+0.6vh)] h-auto ${theme === 'dark' ? 'text-blue-500' : 'text-white'}`} />
                  <span className={`text-[calc(0.3vw+0.6vh)] font-semibold ${theme === 'dark' ? 'text-blue-400' : 'text-white'}`}>Bäume gerettet (Gesamt)</span>
                </div>
                <div className="text-right">
                  <span className={`text-[calc(0.3vw+0.6vh)] font-bold ${theme === 'dark' ? 'text-blue-400' : 'text-white'}`}>{co2Loading ? '--' : co2Data?.total_trees_saved?.toFixed(2) || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KiosEndBoxes;