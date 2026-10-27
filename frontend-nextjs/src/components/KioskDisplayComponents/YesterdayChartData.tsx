// /home/pvadmin/kiosk/apps/kiosk/frontend/src/components/KioskDisplayComponents/DayProgressChart.tsx
import React from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

interface DayProgressPoint {
  time: string;
  solar: number;
  grid: number;
  consumption: number;
}

interface DayProgressChartProps {
  chartData: DayProgressPoint[];
  yesterdayDate: string;
  yesterdayWeekday: string;
  energyData: { timestamp?: string } | null;
  chartHeight: number;
  scaleFactor: number;
  fontScale: number;
  theme: string;
  language: string | null;
}

export const DayProgressChart: React.FC<DayProgressChartProps> = React.memo(function DayProgressChart({
  chartData,
  yesterdayDate,
  yesterdayWeekday,
  energyData,
  chartHeight,
  scaleFactor,
  fontScale,
  theme,
  language
}) {
  return (
    <div className='relative'>
      <div className="flex items-center justify-between p-[calc(0.3vw+0.3vh)] h-[1%] overflow-hidden">
        <div className='h-full'>
          <h2 className={`text-xl font-bold mb-1  ${theme === 'dark' ? 'text-gray-100' : 'text-white'}`}>
            {language === "EN"
              ? "Day Progress"
              : language === "IT"
                ? "Andamento della giornata"
                : language === "FR"
                  ? "Déroulement de la journée"
                  : language === "SQ"
                    ? "Rrjedha e ditës"
                    : language === "DE"
                      ? "Tagesverlauf"
                      : "Tagesverlauf"}
          </h2>
          <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
            {language === "EN"
              ? "Energy production and consumption"
              : language === "IT"
                ? "Produzione e consumo di energia"
                : language === "FR"
                  ? "Production et consommation d'énergie"
                  : language === "SQ"
                    ? "Prodhimi dhe konsumimi i energjisë"
                    : language === "DE"
                      ? "Energieproduktion und -verbrauch"
                      : "Energieproduktion und -verbrauch"}
            (kW)
          </p>
        </div>
        <div>
          {energyData?.timestamp ? (
            <div className={`flex flex-col items-end`}>
              <h2 className={`font-bold ${theme === 'dark' ? 'text-gray-100' : 'text-white'}`}>
                {yesterdayWeekday}
              </h2>
              <p className={`text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                {yesterdayDate ? yesterdayDate : "--.--.----"}
              </p>
            </div>
          ) : '--'}
        </div>
      </div>
      
      <div style={{ height: `${chartHeight}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="solarGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8cba58" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#8cba58" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="gridGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f0574b" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#f0574b" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="consumptionGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#5b94e0" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#5b94e0" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={theme === "dark" ? "rgba(255,255,255,0.10)" : "#e5e7eb"}
              strokeWidth={1}
            />
            <XAxis
              dataKey="time"
              angle={-45}
              fontSize={11 * fontScale}
              textAnchor="end"
              height={60}
              tick={{
                fill: theme === "dark" ? "#9aa6bc" : "#6b7280",
                fontWeight: 500,
              }}
              tickFormatter={(timeStr) => timeStr.slice(0, 5)}
            />
            <YAxis
              fontSize={11 * fontScale}
              width={45 * scaleFactor}
              tick={{
                fill: theme === "dark" ? "#9aa6bc" : "#6b7280",
                fontWeight: 500,
              }}
              axisLine={{
                stroke: theme === "dark" ? "rgba(255,255,255,0.10)" : "#d1d5db",
                strokeWidth: 1,
              }}
              tickLine={{
                stroke: theme === "dark" ? "rgba(255,255,255,0.10)" : "#d1d5db",
              }}
              domain={[0, (dataMax: number) => Math.max(10, Math.ceil(dataMax / 10) * 10)]}
            />
            <Area
              type="monotone"
              dataKey="solar"
              name="PV Produktion"
              stackId="1"
              stroke="#8cba58"
              fill="url(#solarGradient)"
              strokeWidth={2 * scaleFactor}
            />
            <Area
              type="monotone"
              dataKey="grid"
              name="Überschuss"
              stroke="#f0574b"
              fill="url(#gridGradient)"
              strokeWidth={2 * scaleFactor}
            />
            <Area
              type="monotone"
              dataKey="consumption"
              name="Gesamtbedarf"
              stroke="#5b94e0"
              fill="url(#consumptionGradient)"
              strokeWidth={3 * scaleFactor}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-[#8cba58] rounded-full"></div>
          <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            {language === "EN"
              ? "PV Production"
              : language === "IT"
                ? "PV Produzione"
                : language === "FR"
                  ? "PV Production"
                  : language === "SQ"
                    ? "Prodhimi PV"
                    : language === "DE"
                      ? "PV Produktion"
                      : "PV Produktion"}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-[#f0574b] rounded-full"></div>
          <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            {language === "EN"
              ? "Surplus"
              : language === "IT"
                ? "Eccedenza"
                : language === "FR"
                  ? "Excédent"
                  : language === "SQ"
                    ? "Tepricë"
                    : language === "DE"
                      ? "Überschuss"
                      : "Überschuss"}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-[#5b94e0] rounded-full"></div>
          <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            {language === "EN"
              ? "Total Demand"
              : language === "IT"
                ? "Fabbisogno Totale"
                : language === "FR"
                  ? "Besoins Totaux"
                  : language === "SQ"
                    ? "Nevoja Totale"
                    : language === "DE"
                      ? "Gesamtbedarf"
                      : "Gesamtbedarf"}
          </span>
        </div>
      </div>
    </div>
  );
});