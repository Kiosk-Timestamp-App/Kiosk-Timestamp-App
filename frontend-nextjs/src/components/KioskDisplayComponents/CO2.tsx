import { Leaf } from "lucide-react";
import { useTheme } from "../../context/ThemeProvider";
import { useCo2Data } from '../../hooks/useCO2Data';

interface KioskCo2BoxProps {
  language: string | null;
  ipAdress: string;
}

const KioskCo2Box = ({
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
            <Leaf className="w-[calc(1.2vw+1.2vh)] h-auto text-white" />
          </div>
          <div className="flex flex-col">
            <h1
              className={`text-[calc(0.8vw+0.8vh)] font-bold ${theme === "dark" ? "text-gray-100" : "text-white"
                }`}
            >
              CO<sub>2</sub> {language === "EN"
                  ? "Savings "
                  : language === "IT"
                    ? "Risparmio"
                    : language === "FR"
                      ? "Économies "
                      : language === "SQ"
                        ? "Kursimi"
                        : language === "DE"
                          ? "Ersparnis"
                          : "Ersparnis"}
            </h1>
            <p
              className={`text-[calc(0.5vw+0.5vh)] ${theme === "dark" ? "text-gray-400" : "text-gray-600"
                }`}
            >
              CO<sub>2</sub>  {language === "EN"
                  ? "Savings through solar power"
                  : language === "IT"
                    ? "Risparmio grazie all'energia solare"
                    : language === "FR"
                      ? "Économies grâce à l'énergie solaire"
                      : language === "SQ"
                        ? "Kursimi me energji diellore"
                        : language === "DE"
                          ? "Einsparung durch Solarstrom"
                          : "Einsparung durch Solarstrom"}
            </p>
          </div>
        </div>

        <div className="space-y-4">
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
                {co2Loading ? "--" : co2Data?.today_co2?.toFixed(2) || "N/A"}
              </span>
              <span className="ml-1">kg</span>
            </div>
          </div>

          <div
            className={`flex items-center justify-between p-3 rounded-xl ${theme === "dark" ? "bg-blue-500/10" : "bg-[#5b94e0]/10"
              }`}
          >
            <div className="flex items-center space-x-3">
              <div
                className={`w-[calc(0.6vw+0.6vh)] h-[calc(0.6vw+0.6vh)] rounded-full ${theme === "dark" ? "bg-blue-500" : "bg-[#0a1b36]"
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
                {co2Loading ? "--" : co2Data?.total_co2?.toFixed(2) || "N/A"}
              </span>
              <span className="ml-1">
                {co2Loading ? "--" : co2Data?.total_co2_unit || "N/A"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KioskCo2Box;
