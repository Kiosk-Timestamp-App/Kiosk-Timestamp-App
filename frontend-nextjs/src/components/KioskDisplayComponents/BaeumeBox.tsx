import { Leaf, Sun } from "lucide-react";
import { useTheme } from "../../context/ThemeProvider";
import { useCo2Data } from '../../hooks/useCO2Data';

interface KioskCo2BoxProps {
  language: string | null;
  ipAdress:string;
}

const KioskTreesBox = ({
  language,
  ipAdress
}: KioskCo2BoxProps) => {
  const { theme } = useTheme();
  const { co2Data, loading: co2Loading } = useCo2Data({ipAdress});

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
              className={`text-[calc(0.8vw+0.8vh)] font-bold ${theme === "dark" ? "text-gray-100" : "text-gray-900"
                }`}
            >
              {language === "EN" ? "Eco Impact" : language === "IT" ? "Impatto eco" : language === "FR" ? "Impact éco" : language === "SQ" ? "Ndikimi mjedisor" : language === "DE" ? "Umwelt Beitrag" : "Umwelt Beitrag"}
            </h1>
            <p
              className={`text-[calc(0.5vw+0.5vh)] ${theme === "dark" ? "text-gray-400" : "text-gray-600"
                }`}
            >
              {language === "EN" ? "Environmental contribution from solar power" : language === "IT" ? "Contribution environnementale de l’énergie solaire" : language === "FR" ? "Contributo ambientale dell’energia solare" : language === "SQ" ? "Kontributi mjedisor nga energjia diellore" : language === "DE" ? "Umweltbeitrag durch Solarstrom" : "Umweltbeitrag durch Solarstrom"}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div
            className={`flex items-center justify-between p-3 rounded-xl ${theme === "dark" ? "bg-emerald-500/10" : "bg-[#8cba58]/10"
              }`}
          >
            <div className="flex items-center space-x-3">
              <Leaf
                className={`w-[calc(0.6vw+0.6vh)] h-auto ${theme === "dark" ? "text-[#8cba58]" : "text-[#669933]"
                  }`}
              />
              <span
                className={`text-[calc(0.3vw+0.6vh)] font-semibold ${theme === "dark" ? "text-[#8cba58]" : "text-[#669933]"
                  }`}
              >
                {language === "EN" ? "Trees saved (Today)" : language === "IT" ? "Alberi salvati (Oggi)" : language === "FR" ? "Arbres sauvés (Aujourd'hui)" : language === "SQ" ? "Pemë të kursyera (Sot)" : language === "DE" ? "Bäume gerettet (Heute)" : "Bäume gerettet (Heute)"}
              </span>
            </div>
            <div className="text-right">
              <span
                className={`text-[calc(0.3vw+0.6vh)] font-bold ${theme === "dark" ? "text-[#8cba58]" : "text-[#669933]"
                  }`}
              >
                {co2Loading ? "--" : co2Data?.today_trees_saved?.toFixed(2) || "N/A"}
              </span>
            </div>
          </div>

          <div
            className={`flex items-center justify-between p-3 rounded-xl ${theme === "dark" ? "bg-blue-500/10" : "bg-[#5b94e0]/10"
              }`}
          >
            <div className="flex items-center space-x-3">
              <Leaf
                className={`w-[calc(0.6vw+0.6vh)] h-auto ${theme === "dark" ? "text-blue-500" : "text-white"
                  }`}
              />
              <span
                className={`text-[calc(0.3vw+0.6vh)] font-semibold ${theme === "dark" ? "text-blue-400" : "text-white"
                  }`}
              >
                {language === "EN" ? "Trees saved (Total)" : language === "IT" ? "Alberi salvati (Totale)" : language === "FR" ? "Arbres sauvés (Total)" : language === "SQ" ? "Pemë të kursyera (Total)" : language === "DE" ? "Bäume gerettet (Gesamt)" : "Bäume gerettet (Gesamt)"}
              
              </span>
            </div>
            <div className="text-right">
              <span
                className={`text-[calc(0.3vw+0.6vh)] font-bold ${theme === "dark" ? "text-blue-400" : "text-white"
                  }`}
              >
                {co2Loading ? "--" : co2Data?.total_trees_saved?.toFixed(2) || "N/A"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KioskTreesBox;
