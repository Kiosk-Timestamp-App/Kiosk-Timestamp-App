import Slider from "react-slick";
import { Wind, CalendarDays } from "lucide-react";
import type { Theme } from "./types";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { getWeatherLogo, formatWeekday } from "./utils";
import type { WeatherApiResponse } from "./Weather";

interface AutarkySliderProps {
  theme: Theme;
  weatherData: WeatherApiResponse;
  topBoxBg: string;
  bottomBoxBg: string;
  isDark: boolean;
  todayPrice2: number;
  today_energy: number;
  total_energy: number;
  total_energy_unit: string;
  co2Loading: boolean;
  showEnergieproduktion?: boolean;
  showAutarkieWidget?: boolean;
  showStromPreis?: boolean;
  showHomeUsage?: boolean;
  language: string | null;
}

export const WeatherSlider = ({
  weatherData,
  topBoxBg,
  bottomBoxBg,
  isDark,
  language

}: AutarkySliderProps) => {
  const sliderSettings = {
    dots: false,
    infinite: true,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 30000, // 30 seconds
    speed: 2000,
    pauseOnHover: false,
    arrows: false,
    adaptiveHeight: false,
  };

  return (
    <div className="h-full w-full ">
      <Slider {...sliderSettings} className="h-full w-full overflow-visible">
        {/* --- Slide 1 --- */}
        <div className="h-full w-full ">
          <div className="flex flex-col h-full w-full  gap-[calc(0.3vw+0.3vh)] ">
            <div className="flex-1 h-full pb-[calc(0.2vw+0.2vh)] ">
              <div className={`${topBoxBg} shadow-md rounded-2xl p-[calc(0.3vw+0.3vh)] border flex flex-col justify-center backdrop-blur-sm h-full`}>
                <div className="relative z-10">
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 mb-6">
                        <div
                          className={`w-2 h-2 rounded-full ${isDark ? "bg-[#5b94e0]" : "bg-gradient-to-r from-[#1f539a] to-[#03122b]"
                            } animate-pulse`}
                        ></div>
                        <span
                          className={`text-[calc(0.6vw+0.6vh)] font-medium tracking-wide  ${isDark ? "text-white" : "text-gray-700"
                            }`}
                        >
                           {language === "EN" ? "TODAY" : language === "IT" ? "OGGI" : language === "FR" ? "AUJOURD'HUI" : language === "SQ" ? "SOT" : language === "DE" ? "HEUTE" : " HEUTE"}
                        </span>
                      </div>
                      <div
                        className={`text-[calc(1.4vw+1.4vh)] font-bold mt-2 mb-6 ${isDark ? "text-white" : "text-black"
                          } leading-none`}
                      >
                        {Math.round(weatherData.current.temperature_2m)}°
                      </div>
                    </div>
                    <img
                      src={getWeatherLogo(weatherData.current.weather_code)}
                      className="w-[calc(3vw+3vh)] h-auto drop-shadow-md"
                      alt="Weather condition"
                    />
                  </div>
                  <div
                    className={`inline-flex items-center gap-2 px-4 py-1 rounded-full mt-4 mb-5 ${isDark
                        ? "bg-[#5b94e0]/10 border border-[#5b94e0]"
                        : "bg-gradient-to-r from-[#1f539a]/80 to-[#03122b]/80 border border-[#5b94e0]/80"
                      } backdrop-blur-sm`}
                  >
                    <Wind className="w-[calc(0.7vw+0.7vh)] text-white" />
                    <span className="text-[calc(0.5vw+0.5vh)] font-medium text-white">
                      {Math.round(weatherData.current.wind_speed_10m)} km/h
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- Slide 2 --- */}
        <div className="h-full w-full flex flex-col  ">
          <div className="flex flex-col h-full w-full gap-[calc(0.3vw+0.3vh)] ">
            <div className="flex-1 h-full pb-[calc(0.2vw+0.2vh)]">
              <div
                className={`${bottomBoxBg} shadow-md rounded-2xl p-[calc(0.3vw+0.3vh)] border flex flex-col justify-between backdrop-blur-sm h-full`}
              >
                <div className="flex items-center gap-3 mb-[calc(0.3vw+0.3vh)]">
                  <div
                    className={`p-1 rounded-full ${isDark
                        ? "bg-gradient-to-r from-[#1f539a]/80 to-[#03122b]/80 border border-[#5b94e0]/80"
                        : "bg-gray-400"
                      }`}
                  >
                    <CalendarDays className="w-[calc(0.9vw+0.9vh)] p-1 text-white" />
                  </div>
                  <span
                    className={`text-[calc(0.5vw+0.5vh)] font-semibold tracking-wide ${isDark ? "text-white" : "text-gray-700"
                      }`}
                  >
                     {language === "EN"
                  ? "5-DAY FORECAST"
                  : language === "IT"
                    ? "PREVISIONI A 5 GIORNI"
                    : language === "FR"
                      ? "Prévisions à 5 jours"
                      : language === "SQ"
                        ? "Parashikimet për 5 ditë"
                        : language === "DE"
                          ? "5-TAGE VORHERSAGE"
                          : "5-TAGE VORHERSAGE"}
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-[calc(0.3vw+0.3vh)]">
                  {weatherData.daily.time.slice(0, 5).map((date: string, index: number) => (
                    <div
                      key={date}
                      className={`flex flex-col items-center gap-1 p-[calc(0.2vw+0.2vh)] rounded-2xl ${isDark
                          ? "bg-gray-800 hover:bg-gray-700 border border-gray-700"
                          : "bg-gray-50 hover:bg-gray-100 border border-gray-200"
                        } transition-all duration-200`}
                    >
                      <div
                        className={`text-[calc(0.6vw+0.6vh)] font-semibold ${isDark ? "text-white" : "text-gray-700"
                          }`}
                      >
                        {formatWeekday(date,language)}
                      </div>
                      <div className="flex flex-col items-center gap-0.5">
                        <div
                          className={`text-[calc(0.6vw+0.6vh)] font-bold ${isDark ? "text-[#5b94e0]" : "text-black"
                            }`}
                        >
                          {Math.round(weatherData.daily.temperature_2m_max[index])}°
                        </div>
                        <div
                          className={`text-[calc(0.6vw+0.6vh)] ${isDark ? "text-gray-400" : "text-gray-500"
                            }`}
                        >
                          {Math.round(weatherData.daily.temperature_2m_min[index])}°
                        </div>
                      </div>
                      <div
                        className={`flex items-center gap-1 px-3 py-1 rounded-full ${isDark
                            ? "bg-[#5b94e0]/10 border border-[#5b94e0]"
                            : "bg-gradient-to-r from-[#1f539a]/80 to-[#03122b]/80 border border-[#5b94e0]/80"
                          }`}
                      >
                        <Wind className="w-[calc(0.5vw+0.5vh)] text-white" />
                        <span className="text-[calc(0.5vw+0.5vh)] font-medium text-white">
                          {Math.round(weatherData.daily.wind_speed_10m_max[index])}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Slider>
    </div>
  );
};
