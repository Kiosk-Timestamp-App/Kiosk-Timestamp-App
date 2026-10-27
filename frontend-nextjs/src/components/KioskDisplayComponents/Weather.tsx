import { useState, useEffect } from "react";
import { Wind, CalendarDays } from "lucide-react";
import type { Theme } from "./types";
import { getWeatherLogo } from "./utils";
import { formatWeekday } from "./utils";
import BatteryIconImg from "../../assets/batter-storage.png";
import { apiBaseUrl } from "../../api/apiBaseUrl";
import { WeatherSlider } from "./WeatherSlider";
import WeatherLogoImg from '../../assets/partly-cloudy.png';
const BatteryIcon = BatteryIconImg.src;
const WeatherLogo = WeatherLogoImg.src;
interface CurrentWeather {
  time: string;
  interval: number;
  temperature_2m: number;
  wind_speed_10m: number;
  weather_code: number;
}

interface DailyWeather {
  time: string[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  wind_speed_10m_max: number[];
  weather_code: number[];
}

export interface WeatherApiResponse {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  current_units: { [key: string]: string };
  current: CurrentWeather;
  daily_units: { [key: string]: string };
  daily: DailyWeather;
}

interface SystemSpecs {
  battery: string;
  carport: string; // Add this line

}

interface WeatherWidgetProps {
  theme: Theme;
  systemData: SystemSpecs | null;
  systemLoading: boolean;
  language: string | null;
  ipAdress?: string;
}

const WEATHER_CACHE_KEY = "weatherData";
const WEATHER_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 orë

function saveWeatherCache(data: WeatherApiResponse) {
  try {
    localStorage.setItem(
      WEATHER_CACHE_KEY,
      JSON.stringify({ data, ts: Date.now() })
    );
  } catch (err) {
    console.warn("Weather: failed to write weather cache to localStorage", err);
  }
}

function loadWeatherCache(): WeatherApiResponse | null {
  try {
    const raw = localStorage.getItem(WEATHER_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data: WeatherApiResponse; ts: number };
    if (!parsed?.data || !parsed?.ts) return null;
    if (Date.now() - parsed.ts > WEATHER_CACHE_TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

const defaultWeatherData: WeatherApiResponse = {
  latitude: 0,
  longitude: 0,
  generationtime_ms: 0,
  utc_offset_seconds: 0,
  timezone: "auto",
  timezone_abbreviation: "AUTO",
  elevation: 0,
  current_units: {},
  current: { time: "", interval: 0, temperature_2m: 20, wind_speed_10m: 5, weather_code: 1 },
  daily_units: {},
  daily: {
    time: Array.from({ length: 6 }, (_, i) => new Date(Date.now() + i * 86400000).toISOString().slice(0, 10)),
    temperature_2m_max: [24, 25, 23, 22, 21, 20],
    temperature_2m_min: [14, 15, 13, 12, 11, 10],
    wind_speed_10m_max: [10, 12, 9, 8, 11, 10],
    weather_code: [1, 2, 2, 3, 61, 1]
  }
};

export const WeatherCard = ({ theme, systemData, language, ipAdress = apiBaseUrl }: WeatherWidgetProps) => {
  const [weatherData, setWeatherData] = useState<WeatherApiResponse | null>(null);
  const [, setWeatherLoading] = useState<boolean>(true);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeatherCoordinates = async () => {
      try {
        // 1) Shfaq menjëherë të dhënat nga cache nëse ekzistojnë dhe janë brenda TTL
        const cached = loadWeatherCache();
        if (cached) {
          setWeatherData(cached);
          setWeatherLoading(false);
        }

        // 2) Koordinatat
        const response = await fetch(
          `${ipAdress}kiosk_client_app.system_integration.doctype.okosys_settings.okosys_settings.get_weather_latitude_longitude`
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        let latitude, longitude;

        if (typeof data === 'object' && data.message && Array.isArray(data.message) && data.message.length >= 2) {
          [latitude, longitude] = data.message;
        } else if (Array.isArray(data) && data.length >= 2) {
          [latitude, longitude] = data;
        } else if (typeof data === 'object' && data.latitude !== undefined && data.longitude !== undefined) {
          latitude = data.latitude;
          longitude = data.longitude;
        } else if (typeof data === 'string' && data.includes(',')) {
          [latitude, longitude] = data.split(',').map(Number);
        } else {
          throw new Error('Invalid coordinates format from API: ' + JSON.stringify(data));
        }

        // 3) Moti
        const weatherResponse = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,wind_speed_10m_max,weather_code&timezone=auto&forecast_days=6`
        );
        if (!weatherResponse.ok) {
          throw new Error(`Weather API error! status: ${weatherResponse.status}`);
        }

        const fresh: WeatherApiResponse = await weatherResponse.json();
        setWeatherData(fresh);
        setWeatherError(null);
        setWeatherLoading(false);

        // 4) Ruaj në LocalStorage
        saveWeatherCache(fresh);
      } catch (err) {
        console.warn("Weather: fetching weather data failed, falling back to cache/default", err);
        // provo cache në momentin e dështimit
        const cachedNow = loadWeatherCache();
        if (cachedNow) {
          setWeatherData(cachedNow);
          setWeatherLoading(false);
          setWeatherError(null); // mos trego mesazh gabimi kur kemi të dhëna
          return;
        }

        // nëse s’ka cache, jep fallback statik
        setWeatherData(defaultWeatherData);
        setWeatherLoading(false);
        setWeatherError(null); // mbaje null që UI të tregojë të dhënat
      }
    };

    fetchWeatherCoordinates();
    const interval = setInterval(fetchWeatherCoordinates, 30 * 60 * 1000); // 30 minutes
    return () => clearInterval(interval);
  }, [ipAdress]);

  if (!weatherData) return <div className="p-4 text-center"></div>;

  const isDark = theme === "dark";
  const topBoxBg = isDark ? 'ov-glass border-white/10' : 'bg-gradient-to-br from-white via-gray-50 to-gray-100 border-gray-200';
  const bottomBoxBg = isDark ? 'ov-glass border-white/10' : 'bg-gradient-to-t from-white to-white border-gray-200';

  const showBattery = systemData?.battery?.trim().toLowerCase() === 'yes';

  return (
    <div className="flex flex-col w-full h-full gap-[calc(0.4vw+0.4vh)] ">
      {/* Battery Box */}
      {showBattery && (
        <div className="h-[45%]">
          <div
            className={`rounded-2xl shadow-md pl-4 pr-4 pt-4 pb-1 flex flex-col justify-between h-full ${theme === "dark" ? "ov-glass border-white/10" : "bg-white"
              }`}

          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className={`text-lg font-bold ${theme === "dark" ? "text-white" : "text-white"}`}>
                  {language === "EN" ? "Battery" : language === "IT" ? "Batteria" : language === "FR" ? "Batterie" : language === "SQ" ? "Bateri" : language === "DE" ? "Batterie" : " Batterie"}
                </h3>
                <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                  {language === "EN" ? "Battery level" : language === "IT" ? "Niveau de batterie" : language === "FR" ? "Livello della batteria" : language === "SQ" ? "Niveli i baterisë" : language === "DE" ? "Batteriestand" : " Batteriestand"}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between mt-[-55px]">
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-5xl font-bold leading-none font-[600] ov-text-brand`}
                >
                  18.5
                </span>
                <span className={`text-xl font-medium mt-20 ${theme === "dark" ? "text-white" : "text-white"}`}>
                  %
                </span>
              </div>
              <div className="w-32 h-32">
                <img
                  src={BatteryIcon}
                  alt="Battery"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Weather Content */}
      {showBattery ? (
        <div className="h-[55%]  ">
          <div className="flex gap-3 no-scrollbar h-full ">
            <WeatherSlider
              theme={theme}
              weatherData={weatherData}
              topBoxBg={topBoxBg}
              bottomBoxBg={bottomBoxBg}
              isDark={isDark}
              todayPrice2={0} // You need to provide this value or make it optional in the interface
              today_energy={0} // You need to provide this value or make it optional in the interface
              total_energy={0} // You need to provide this value or make it optional in the interface
              total_energy_unit="" // You need to provide this value or make it optional in the interface
              co2Loading={false} // You need to provide this value or make it optional in the interface
              language={language}
            />
          </div>
        </div>
      ) : (
        // STATIC view when battery is not present
        <>
          {/* Heute */}
          <div className=" h-[45%]">
            <div className={`${topBoxBg} shadow-md rounded-2xl shadow-md p-[calc(0.6vw+0.6vh)] border flex flex-col justify-center backdrop-blur-sm h-full `} >
              <div className="relative z-10">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-2 h-2 rounded-full ${isDark ? 'bg-[#5b94e0]' : 'bg-gradient-to-r from-[#1f539a] to-[#03122b]'} animate-pulse`}></div>
                      <span className={`text-[calc(0.6vw+0.6vh)] font-medium tracking-wide ${isDark ? 'text-white' : 'text-gray-700'}`}>
                        {language === "EN" ? "TODAY" : language === "IT" ? "OGGI" : language === "FR" ? "AUJOURD'HUI" : language === "SQ" ? "SOT" : language === "DE" ? "HEUTE" : " HEUTE"}</span>
                    </div>
                    <div className={`text-[calc(1.4vw+1.4vh)] mb-3 font-bold  ${isDark ? 'text-white' : 'text-black'} leading-none`}>
                      {Math.round(weatherData.current.temperature_2m)}°
                    </div>
                  </div>
                  <img
                    src={weatherError || !weatherData ? WeatherLogo : getWeatherLogo(weatherData.current.weather_code)}
                    className="w-[calc(3vw+3vh)] h-auto drop-shadow-md"
                    alt="Weather condition"
                  />
                </div>
                <div className={`inline-flex items-center gap-2 px-4 py-1 rounded-full mt-0 ${isDark ? 'bg-[#5b94e0]/10 border border-[#5b94e0]' : 'bg-gradient-to-r from-[#1f539a]/80 to-[#03122b]/80 border border-[#5b94e0]/80'} backdrop-blur-sm`}>
                  <Wind className="w-[calc(0.7vw+0.7vh)] text-white" />
                  <span className="text-[calc(0.5vw+0.5vh)] font-medium text-white">{Math.round(weatherData.current.wind_speed_10m)} km/h</span>
                </div>
              </div>
            </div>
          </div>
          {/* 5-Tage Vorhersage */}

          <div className="h-[55%] pb-[calc(0.2vw+0.2vh)] ">
            <div className={`${bottomBoxBg} shadow-md rounded-2xl p-[calc(0.5vw+0.5vh)] border flex flex-col backdrop-blur-sm h-full`}>
              <div className="flex items-center gap-[calc(0.3vw+0.3vh)] mb-2">
                <div className={`p-1 rounded-full ${isDark ? 'bg-gradient-to-r from-[#1f539a]/80 to-[#03122b]/80 border border-[#5b94e0]/80' : 'bg-gray-400'}`}>
                  <CalendarDays className="w-[calc(0.9vw+0.9vh)] p-1 text-white" />
                </div>
                <span className={`text-[calc(0.5vw+0.5vh)] font-semibold tracking-wide ${isDark ? 'text-white' : 'text-gray-700'}`}>
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
                {weatherData.daily.time.slice(0, 5).map((date, index) => (
                  <div
                    key={date}
                    className={`flex flex-col items-center gap-[calc(0.2vw+0.2vh)] p-[calc(0.2vw+0.2vh)] rounded-2xl ${isDark ? 'bg-gray-800 hover:bg-gray-700 border border-gray-700' : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'} transition-all duration-200`}
                  >
                    <div className={`text-[calc(0.5vw+0.5vh)] font-semibold ${isDark ? 'text-white' : 'text-gray-700'}`}>
                      {formatWeekday(date, language)}
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <div className={`text-[calc(0.5vw+0.5vh)] font-bold ${isDark ? 'text-[#5b94e0]' : 'text-black'}`}>
                        {Math.round(weatherData.daily.temperature_2m_max[index])}°
                      </div>
                      <div className={`text-[calc(0.6vw+0.6vh)] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {Math.round(weatherData.daily.temperature_2m_min[index])}°
                      </div>
                    </div>
                    <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${isDark ? 'bg-[#5b94e0]/10 border border-[#5b94e0]' : 'bg-gradient-to-r from-[#1f539a]/80 to-[#03122b]/80 border border-[#5b94e0]/80'}`}>
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
        </>
      )}
    </div>
  );
};
