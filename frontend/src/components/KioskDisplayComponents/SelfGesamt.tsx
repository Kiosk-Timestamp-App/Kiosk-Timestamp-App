import EfficiencyIcon from "../../assets/panel2.png";
import type { Theme } from "./types";
import { useSystemData } from "../../hooks/useSystemData";

interface SelfGesamtProps {
  theme: Theme;
  language: string | null;
}

export const SelfGesamt = ({ theme, language }: SelfGesamtProps) => {
  const { systemData, loading, error } = useSystemData();
  const selfUsagePercentage = systemData?.self_usage_percentage ?? null;

  if (loading) {
    return (
      <div className={`rounded-2xl shadow-md p-[calc(0.6vw+0.6vh)] flex flex-col justify-between  ${theme === "dark" ? "ov-glass border-white/10" : "bg-white"
        }`} style={{ minHeight: "170px" }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-2xl shadow-md p-[calc(0.6vw+0.6vh)] flex flex-col justify-between ${theme === "dark" ? "ov-glass border-white/10" : "bg-white"
        }`} style={{ minHeight: "170px" }}>
        <div>Error: {error}</div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl shadow-md p-[calc(0.6vw+0.6vh)] flex flex-col justify-between border h-full ${theme === "dark" ? "ov-glass border-white/10" : "bg-white border-gray-200"
        }`}
    // style={{ minHeight: "170px" }}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className={`text-lg font-bold ${theme === "dark" ? "text-white" : "text-white"}`}>
            {language === "EN" ? "Own Consumption" : language === "IT" ? "Consumo Proprio" : language === "FR" ? "Consommation Propre" : language === "SQ" ? "Konsum Vetjak" : language === "DE" ? "Eigenverbrauch" : "Eigenverbrauch"}
              
          </h3>
          <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
             {language === "EN" ? "Current Own Consumption" : language === "IT" ? "Consumo Proprio Sttuale" : language === "FR" ? "Consommation Propre Actuelle" : language === "SQ" ? "Konsum Aktual Vetjak" : language === "DE" ? "Aktuelle Eigenverbrauch" : "Aktuelle Eigenverbrauch"}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-[-55px]">
        <div className="flex items-baseline gap-2">
          <span
            className={`text-5xl font-bold leading-none font-[600] ov-text-brand`}
          >
            {selfUsagePercentage ?? "N/A"}
          </span>
          <span className={`text-xl font-medium mt-22 ${theme === "dark" ? "text-white" : "text-white"}`}>
            %
          </span>
        </div>
        <div className="w-32 h-32">
          <img
            src={EfficiencyIcon}
            alt="Efficiency"
            className="w-full h-full object-contain"
          />
        </div>
      </div>
    </div>
  );
};