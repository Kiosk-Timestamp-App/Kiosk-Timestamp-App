import type { Theme } from "./types";
import { TrendingUp, Zap } from "lucide-react";
import { useAwattarPrice } from "../../hooks/useAwattarPrice";
import { useSystemSpecs } from "../../hooks/useSystemSpecs";

interface AktuellerPreisProps {
  theme: Theme;
  language: string | null;
}

export const AktuellerPreisSlider = ({ theme,language }: AktuellerPreisProps) => {
  const { momentPrice, loading } = useAwattarPrice();
  const { systemSpecs, loading: loadingSpecs } = useSystemSpecs();
  const showPrice = systemSpecs?.awattar === "Yes";

  if (loadingSpecs || !showPrice) {
    return null;
  }

  return (
    <div className={`rounded-2xl shadow-md border h-full flex flex-col justify-between ${theme === "dark"
      ? "ov-glass border-white/10"
      : "bg-white border-gray-100"
      }`}>
      <div
        className={`relative rounded-2xl p-[calc(1.5vw)] h-full overflow-hidden  text-gray`}>
        <div className="absolute right-[-5vw] top-[-5vw] z-0 opacity-40">
          <Zap
            className="w-[calc(10vw+10vh)] h-[calc(10vw+10vh)] text-[#8cba58]"
            strokeWidth={0}
            fill="currentColor"
          />
        </div>

        <div className="relative z-10 h-full flex justify-between items-center">
          <div className="flex flex-col  h-full gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 ov-tile-brand rounded-2xl shadow-md">
                <TrendingUp className="w-[calc(1.2vw+1.2vh)] h-auto text-white" />
              </div>

              <div className="flex flex-col">
                <h1
                  className={`text-[calc(0.8vw+0.8vh)] font-bold ${theme === "dark" ? "text-gray-100" : "text-white"
                    }`}
                >
                  {language === "EN" ? "Electricity Price" : language === "IT" ? "Prezzo dell'energia elettrica" : language === "FR" ? "Prix de l'électricité" : language === "SQ" ? "Çmimi i energjisë elektrike" : language === "DE" ? "Strompreis" : " Strompreis"}
                </h1>
                <p
                  className={`text-[calc(0.5vw+0.5vh)] ${theme === "dark" ? "text-gray-400" : "text-gray-600"
                    }`}
                >
                  {language === "EN" ? "Price per kWh (updated hourly)" : language === "IT" ? "Prezzo per kWh (aggiornato ogni ora)" : language === "FR" ? "Prix par kWh (mis à jour toutes les heures)" : language === "SQ" ? "Çmimi për kWh (përditësohet çdo orë)" : language === "DE" ? "Preis pro kWh (stündlich aktualisiert)" : " Preis pro kWh (stündlich aktualisiert)"}
                </p>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-5xl font-bold leading-none font-[600] ov-text-brand`}
              >
                {loading
                  ? "--"
                  : momentPrice
                    ? `${momentPrice.momental_price.toFixed(2)}`
                    : "n.v."}
              </span>
              <span className={`text-xl font-medium mt-20 ${theme === "dark" ? "text-white" : "text-white"}`}>
                Eur/MWh
              </span>
            </div>
          </div>
          <div className="relative flex items-end justify-center z-10 top-[-90px]">
            <Zap
              className="w-[calc(1.6vw+1.6vh)] h-[calc(1.6vw+1.6vh)] text-[#8cba58] drop-shadow-xl"
              strokeWidth={1.5}
            />
          </div>
        </div>
      </div>
    </div>
  );
};