export interface TVDisplayProps {
  isFullscreen: boolean;
  screenWidth: number;
  screenHeight: number;
  aspectRatio: number;
}

export interface CurrentWeather {
  temperature_2m: number;
  wind_speed_10m: number;
  time: string;
  weather_code: number;
}

export interface DailyWeather {
  time: string[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  wind_speed_10m_max: number[];
}

export interface ChartDataItem {
  time: string;
  pvProduction: number;
  consumption: number;
  excess: number;
}

export type Theme = "light" | "dark";