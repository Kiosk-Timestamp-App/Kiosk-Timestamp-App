"use client";
import React from "react";
import { Sun } from "lucide-react";


interface EnergieproduktionProps {
  theme: "light" | "dark";
  todayEnergy?: number;
  totalEnergy?: number;
  totalEnergyUnit?: string;
  loading: boolean;
  language: string | null;
}

const Energieproduktion: React.FC<EnergieproduktionProps> = ({
  theme,
  todayEnergy,
  totalEnergy,
  totalEnergyUnit,
  loading,
  language
}) => {
  return (
    <div
      className={`rounded-2xl shadow-md p-[calc(0.6vw+0.6vh)] border h-full flex flex-col justify-between ${theme === "dark"
        ? "ov-glass border-white/10"
        : "bg-white border-gray-100"
        }`}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 ov-tile-brand rounded-2xl shadow-md">
            <Sun className="w-[calc(1.2vw+1.2vh)] h-auto text-white" />
          </div>

          <div className="flex flex-col">
            <h1
              className={`text-[calc(0.8vw+0.8vh)] font-bold ${theme === "dark" ? "text-gray-100" : "text-white"
                }`}
            >
              {language === "EN"
                ? "Energy production"
                : language === "IT"
                  ? "Produzione di Energia"
                  : language === "FR"
                    ? "Production en Énergie"
                    : language === "SQ"
                      ? "Prodhimi i energjisë"
                      : language === "DE"
                        ? "Energieproduktion"
                        : "Energieproduktion"}
            </h1>
            <p
              className={`text-[calc(0.5vw+0.5vh)] ${theme === "dark" ? "text-gray-400" : "text-gray-600"
                }`}
            >
              {language === "EN"
                ? "Solar Yield"
                : language === "IT"
                  ? "Rendimento Solare"
                  : language === "FR"
                    ? "Rendement Solaire"
                    : language === "SQ"
                      ? "Rendimenti Diellor"
                      : language === "DE"
                        ? "Solarertrag"
                        : "Solarertrag"}
            </p>
          </div>
        </div>

        {/* Content Boxes */}
        <div className="space-y-4">
          {/* Heute */}
          <div
            className={`flex items-center justify-between p-3 rounded-xl ${theme === "dark" ? "bg-emerald-500/10" : "bg-[#8cba58]/10"
              }`}
          >
            <div className="flex items-center space-x-3">
              <div className="w-[calc(0.6vw+0.6vh)] h-[calc(0.6vw+0.6vh)] bg-[#669933] rounded-full animate-pulse"></div>
              <span
                className={`text-[calc(0.3vw+0.6vh)] font-semibold ${theme === "dark" ? "text-[#8cba58]" : "text-[#669933]"
                  }`}
              >
                {language === "EN" ? "Today" : language === "IT" ? "Oggi" : language === "FR" ? "Aujourd'hui" : language === "SQ" ? "Sot" : language === "DE" ? "Heute" : " Heute"}
              </span>
            </div>
            <div className="text-right">
              <span
                className={`text-[calc(0.3vw+0.6vh)] font-bold ${theme === "dark" ? "text-[#8cba58]" : "text-[#669933]"
                  }`}
              >
                {loading ? "--" : todayEnergy?.toFixed(2) || "N/A"}
              </span>
              <span className="ml-1">kWh</span>
            </div>
          </div>

          {/* Gesamt */}
          <div
            className={`flex items-center justify-between p-3 rounded-xl ${theme === "dark" ? "bg-blue-500/10" : "bg-[#5b94e0]/10"
              }`}
          >
            <div className="flex items-center space-x-3">
              <div
                className={`w-[calc(0.6vw+0.6vh)] h-[calc(0.6vw+0.6vh)] rounded-full ${theme === "dark" ? "bg-blue-400" : "bg-[#0a1b36]"
                  }`}
              ></div>
              <span
                className={`text-[calc(0.3vw+0.6vh)] font-semibold ${theme === "dark" ? "text-blue-400" : "text-white"
                  }`}
              >
                {language === "EN" ? "Total" : language === "IT" ? "Totale" : language === "FR" ? "Total" : language === "SQ" ? "Total" : language === "DE" ? "Gesamt" : " Gesamt"}
              </span>
            </div>
            <div className="text-right">
              <span
                className={`text-[calc(0.3vw+0.6vh)] font-bold ${theme === "dark" ? "text-blue-400" : "text-white"
                  }`}
              >
                {loading ? "--" : totalEnergy?.toFixed(2) || "N/A"}
              </span>
              <span className="ml-1">
                {loading ? "--" : totalEnergyUnit || "N/A"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Energieproduktion;
