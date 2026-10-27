import FoggyIconImg from "../../assets/foggy-day.png";
import RainIconImg from "../../assets/rain.png";
import ThunderstormIconImg from "../../assets/thunderstorm.png";
import SnowIconImg from "../../assets/winter.png";
import PartlyCloudImg from "../../assets/partly-cloudy.png";
import SunIconImg from "../../assets/sun.png";
import WeatherLogoImg from '../../assets/weather.png';
const FoggyIcon = FoggyIconImg.src;
const RainIcon = RainIconImg.src;
const ThunderstormIcon = ThunderstormIconImg.src;
const SnowIcon = SnowIconImg.src;
const PartlyCloud = PartlyCloudImg.src;
const SunIcon = SunIconImg.src;
const WeatherLogo = WeatherLogoImg.src;
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

export const formatWeekday = (dateString: string, language: string | null) => {
  const date = new Date(dateString);

  // Kontrollo sq dhe kthe direkt nga array
  if(language?.toLowerCase() === "sq") {
    const weekdaysSQ = ["D", "Hë", "Ma", "Më", "En", "Pr", "Sh"];
    return weekdaysSQ[date.getDay()];
  }

  // Për gjuhë të tjera përdor toLocaleDateString
  return date
    .toLocaleDateString(`${language}-${language?.toUpperCase()}`, { weekday: "short" })
    .slice(0, 2);
};
