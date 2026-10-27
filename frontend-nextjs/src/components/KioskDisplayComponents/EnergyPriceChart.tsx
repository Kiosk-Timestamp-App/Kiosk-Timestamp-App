// /home/pvadmin/kiosk/apps/kiosk/frontend/src/components/KioskDisplayComponents/EnergyPriceChart.tsx
import React, { useEffect } from 'react';
import { Activity } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";

type ThemeMode = 'light' | 'dark' | string;

interface StockPricesChartProps {
  scaleFactor: number;
  screenWidth: number;
  screenHeight: number;
  chartHeight: number;
  fontScale: number;
  theme: ThemeMode;
  awattarChartData: { time: string; price: number }[];
  loading: boolean;
  onHasDataChange?: (hasData: boolean) => void;
  language: string | null;
}

export const StockPricesChart: React.FC<StockPricesChartProps> = React.memo(function StockPricesChart({
  scaleFactor,
  chartHeight,
  fontScale,
  theme,
  awattarChartData,
  loading,
  onHasDataChange,
  language
}: StockPricesChartProps) {

  useEffect(() => {
    if (onHasDataChange) onHasDataChange(awattarChartData.length > 0);
  }, [awattarChartData, onHasDataChange]);

  const chartData = awattarChartData.map((d) => ({
    ...d,
    pricePos: Math.max(d.price, 0),
    priceNeg: Math.min(d.price, 0),
  }));

  const minPrice = Math.min(...awattarChartData.map(d => d.price), 0);
  const maxPrice = Math.max(...awattarChartData.map(d => d.price), 0);
  const zeroOffset = maxPrice === minPrice ? 50 : (maxPrice / (maxPrice - minPrice)) * 100;

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex items-center justify-between py-[calc(0.3vw+0.3vh)] px-[calc(0.3vw+0.3vh)] h-[max-content]">
        <div className="flex flex-col justify-start items-start gap-2">
          <h2
            className={`text-[calc(0.8vw+0.8vh)] font-bold leading-none ${theme === "dark" ? "text-gray-100" : "text-white"
              }`}
          >
            {language === "EN"
              ? "Market Prices"
              : language === "IT"
                ? "Prezzi di Mercato"
                : language === "FR"
                  ? "Prix du Marché"
                  : language === "SQ"
                    ? "Çmimi i tregut"
                    : language === "DE"
                      ? "Börsenpreise"
                      : "Börsenpreise"}
          </h2>
          <p
            className={`text-[calc(0.5vw+0.5vh)]  font-medium leading-none ${theme === "dark" ? "text-gray-400" : "text-gray-600"
              }`}
          >
            {language === "EN"
              ? "Electricity prices per Hour"
              : language === "IT"
                ? "Prezzi dell'energia elettrica all'ora"
                : language === "FR"
                  ? "Prix de l'électricité par heure"
                  : language === "SQ"
                    ? "Çmimet e energjisë elektrike për orë"
                    : language === "DE"
                      ? "Strompreise pro Stunde"
                      : "Strompreise pro Stunde"}  (Euro/MWh)
          </p>
        </div>
        <div
          className={`rounded-xl p-2 ${theme === "dark" ? "ov-well" : "bg-gray-100"
            }`}
        >
          <Activity
            className={`w-[1vw] h-[auto] ${theme === "dark" ? "text-gray-300" : "text-gray-600"
              }`}
          />
        </div>
      </div>

      <div className="flex-1" style={{ height: "100%" }}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p
              className={`text-[calc(0.6vw+0.6vh)] ${theme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}
            >
              Loading price data...
            </p>
          </div>
        ) : awattarChartData.length === 0 ? (
          <div className={`flex items-center justify-center h-full ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            Keine älteren Preisdaten gefunden.
          </div>
        ) : (
          <div style={{ height: `${chartHeight}px` }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 35, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="positiveNegativeFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8cba58" stopOpacity={0.8} />
                    <stop offset={`${zeroOffset}%`} stopColor="#8cba58" stopOpacity={0.1} />
                    <stop offset={`${zeroOffset}%`} stopColor="#e63946" stopOpacity={0.1} />
                    <stop offset="100%" stopColor="#e63946" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
                <XAxis dataKey="time" fontSize={10 * fontScale} />
                <YAxis
                  fontSize={11 * fontScale}
                  width={45 * scaleFactor}
                  domain={[0, (maxPrice: number) => Math.max(10, Math.ceil(maxPrice / 10) * 10)]}
                />
                <ReferenceLine y={0} stroke="#efeeff" />
                <Area
                  type="monotone"
                  dataKey="price"
                  strokeWidth={1}
                  stroke="url(#positiveNegativeFill)"
                  fillOpacity={1}
                  isAnimationActive={false}
                  baseValue={0}
                  fill="url(#positiveNegativeFill)"
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="#4b5563"
                  fill="transparent"
                  isAnimationActive={false}
                  dot={({ cx, cy, payload, index }) => {
                    if (!payload || payload.price === 0 || !cx || !cy) return null as unknown as React.ReactElement<SVGElement>;
                    return (
                      <g key={index}>
                        <circle cx={cx} cy={cy} r={5} stroke="#8cba58" strokeWidth={2} fill="#fff" />
                        <foreignObject x={cx - 25} y={cy - 35} width={50} height={20}>
                          <div
                            style={{
                              backgroundColor: "gray",
                              color: "#fff",
                              fontSize: "10px",
                              padding: "2px 4px",
                              borderRadius: "4px",
                              textAlign: "center",
                              fontWeight: "bold",
                            }}
                          >
                            {payload.price} €
                          </div>
                        </foreignObject>
                      </g>
                    );
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
});