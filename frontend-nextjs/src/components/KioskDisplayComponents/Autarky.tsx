import { Sun } from "lucide-react";
import type { Theme } from "./types";
import { useSystemData } from "../../hooks/useSystemData";
import { useSystemSpecs } from "../../hooks/useSystemSpecs";

interface AutarkyWidgetProps {
  theme: Theme;
  fullHeight?: boolean;
  language: string | null;
  ipAdress: string;

}

export const KioskWidget = ({ theme, fullHeight = true, language,  ipAdress}: AutarkyWidgetProps) => {
  const { systemData: autarkyData, loading: autarkyLoading } = useSystemData({ipAdress});
  const { systemSpecs: systemData, loading: systemLoading } = useSystemSpecs({ipAdress});

  const cardBg = theme === "dark" ? "ov-glass border-white/10" : "bg-white border-gray-200";
  const textColor = theme === "dark" ? "text-gray-100" : "text-white";
  const subTextColor = theme === "dark" ? "text-gray-400" : "text-gray-600";

  return (
    <div
      className={`rounded-2xl shadow-md backdrop-blur-sm p-[calc(0.5vw+0.5vh)] h-full border   ${fullHeight ? 'flex flex-col h-full items-center' : 'block'} ${cardBg}`}
    >
      <div className="relative z-10 flex flex-col">
        <div className="flex items-center justify-between ">
          <div className="flex items-center gap-[calc(0.3vw+0.3vh)]">
            <div
              className={`p-3 rounded-2xl ${theme === 'dark' ? 'ov-tile-brand' : 'ov-tile-brand  '
                } `}

            >
              <Sun className="w-[calc(1.2vw+1.2vh)] h-auto text-white" />
            </div>
            <div className="flex flex-col gap-1 ">
              <h1 className={`text-[calc(0.8vw+0.8vh)] font-bold leading-none ${textColor}`}>
                {language === "EN" ? "Self-Sufficiency" : language === "IT" ? "Autosufficienza" : language === "FR" ? "Autosuffisance" : language === "SQ" ? "Mbulueshmëria" : language === "DE" ? "Autarkiegrad" : "Autarkiegrad"}
              </h1>
              <p className={`text-[calc(0.5vw+0.5vh)] ${subTextColor}`}>
                {language === "EN" ? "Energy Self-Sufficiency" : language === "IT" ? "Autosufficienza Energetica" : language === "FR" ? "Autosuffisance Énergétique" : language === "SQ" ? "Autonomi energjetike" : language === "DE" ? " Energieautarkie" : " Energieautarkie"}
              </p>
            </div>
          </div>
          <div
            className="num-display ov-text-brand text-[calc(1.5vw+1.5vh)] leading-none"
          >
            {autarkyLoading ? '--' : autarkyData?.total_percentage?.toFixed(0) ?? 0}%
          </div>
        </div>
        <div className="flex justify-between text-[calc(0.4vw+0.4vh)] mb-4 mt-4">
          <div className="font-medium text-[#aed083]">{language === "EN" ? "PV System" : language === "IT" ? "PV Impianto" : language === "FR" ? "PV Installation" : language === "SQ" ? "PV Sistemi" : language === "DE" ? " PV-Anlage" : " PV-Anlage"}
            : {systemLoading ? '--' : `${systemData?.modulleistung?.toFixed(2) ?? 'N/A'} kWp`}
          </div>
        </div>
        <div className="mt-auto">
          <div className="flex flex-col gap-1">
            <div
              className={`h-[calc(0.2vw+0.2vh)] rounded-full  ${theme === "dark" ? "ov-well" : "bg-gray-200"}`}
            >
              <div
                className={`h-full   rounded-full  ${theme === 'dark' ? 'bg-[#8cba58] ' : 'bg-[#8cba58] '
                  }`}

                style={{ width: `${autarkyData?.total_percentage?.toFixed(0) || 0}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-3.5">
              <span className={`text-[calc(0.5vw+0.5vh)] ${theme === "dark" ? "text-[#8cba58]" : "text-[#669933]"}`}>
                PV: {autarkyLoading ? '--' : autarkyData?.total_percentage?.toFixed(0) ?? 0}%
              </span>
              <span className={`text-[calc(0.5vw+0.5vh)] ${theme === "dark" ? "text-red-400" : "text-red-500"}`}>
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
                          : "Netz"}: {autarkyLoading ? '--' : 100 - (Number(autarkyData?.total_percentage?.toFixed(0) ?? 0))}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};