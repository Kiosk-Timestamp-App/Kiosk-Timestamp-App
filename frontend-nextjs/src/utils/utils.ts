// components/TVDisplay/utils.ts
import FoggyIconImg from "../assets/foggy-day.png";
import RainIconImg from "../assets/rain.png";
import ThunderstormIconImg from "../assets/thunderstorm.png";
import SnowIconImg from "../assets/winter.png";
import PartlyCloudImg from "../assets/partly-cloudy.png";
import SunIconImg from "../assets/sun.png";
import WeatherLogoImg from "../assets/weather.png";
const FoggyIcon = FoggyIconImg.src;
const RainIcon = RainIconImg.src;
const ThunderstormIcon = ThunderstormIconImg.src;
const SnowIcon = SnowIconImg.src;
const PartlyCloud = PartlyCloudImg.src;
const SunIcon = SunIconImg.src;
const WeatherLogo = WeatherLogoImg.src;
export const generateDayData = (intervalMinutes: number = 5) => {
  const data = [];
  const startTime = new Date();
  startTime.setHours(0, 0, 0, 0);

  for (let i = 0; i < 24 * 60; i += intervalMinutes) {
    const time = new Date(startTime.getTime() + i * 60 * 1000);
    const hour = time.getHours();
    const minute = time.getMinutes();

    let pvProduction = 0;
    if (hour >= 6 && hour <= 18) {
      const normalizedHour = (hour - 6) / 12;
      pvProduction = Math.max(
        0,
        400 * Math.sin(normalizedHour * Math.PI) * (0.8 + 0.2 * Math.random())
      );
    }

    const baseConsumption = 50 + 30 * Math.sin((hour / 24) * 2 * Math.PI);
    const consumption = Math.max(20, baseConsumption + 20 * Math.random());

    const excess = Math.max(0, pvProduction - consumption);

    data.push({
      time: `${hour.toString().padStart(2, "0")}:${minute
        .toString()
        .padStart(2, "0")}`,
      pvProduction: Math.round(pvProduction * 10) / 10,
      consumption: Math.round(consumption * 10) / 10,
      excess: Math.round(excess * 10) / 10,
    });
  }

  return data;
};

export const getMaxYValue = (data: ReturnType<typeof generateDayData>) => {
  let max = 0;
  data.forEach((item) => {
    max = Math.max(max, item.pvProduction, item.consumption, item.excess);
  });
  return Math.ceil(max / 100) * 100; // Round up to nearest 100
};

export const getWeatherLogo = (weatherCode: number) => {
  if (weatherCode === 0) return SunIcon;
  if (weatherCode >= 1 && weatherCode <= 3) return PartlyCloud;
  if (weatherCode >= 45 && weatherCode <= 48) return FoggyIcon;
  if (weatherCode >= 51 && weatherCode <= 67) return RainIcon;
  if (weatherCode >= 71 && weatherCode <= 77) return SnowIcon;
  if (weatherCode >= 80 && weatherCode <= 82) return RainIcon;
  if (weatherCode >= 85 && weatherCode <= 86) return SnowIcon;
  if (weatherCode >= 95 && weatherCode <= 99) return ThunderstormIcon;
  return WeatherLogo;
};

export const formatWeekday = (dateString: string, language: string | null = "DE") => {
  const date = new Date(dateString);
  const dayOfWeek = date.getDay();

  if (language === "SQ") {
    const albanianDays = ["Di", "Hë", "Ma", "Mr", "En", "Pr", "Sht"]; // Di, Hën, Mar, Mër, Enj, Pre, Sht
    return albanianDays[dayOfWeek];
  }

  const localeMap = {
    "EN": "en-US",
    "IT": "it-IT",
    "FR": "fr-FR",
    "DE": "de-DE"
  };

  const locale = localeMap[language as keyof typeof localeMap] || "de-DE";

  return new Date(dateString)
    .toLocaleDateString(locale, { weekday: "short" })
    .slice(0, 2);
};