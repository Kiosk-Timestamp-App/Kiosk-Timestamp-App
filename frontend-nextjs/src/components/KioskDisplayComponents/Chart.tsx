import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeProvider';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { apiBaseUrl } from '../../api/apiBaseUrl';
import { useSystemData } from '../../hooks/useSystemData';
import { useSystemSpecs } from '../../hooks/useSystemSpecs';
import { useAwattarPrice } from '../../hooks/useAwattarPrice';
import { DayProgressChart } from './YesterdayChartData';
import { EnergyFlowChart } from './EnergieFlowChart';
import { WeeklyEnergyChart } from './WeeklyEnergyChart';
import { MonthlyEnergyChart } from './MonthlyEnergyData';
import { StockPricesChart } from './EnergyPriceChart';

interface KioskCharProps {
  screenWidth: number;
  screenHeight: number;
  language: string | null;
}

interface YesterdayEnergyApiItem {
  interval_start: string;
  date?: string;
  total_solar_energy?: number;
  total_grid_imported?: number;
  total_spend_energy?: number;
}

interface ChartPoint {
  time: string;
  solar: number;
  grid: number;
  consumption: number;
}

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
};

export const KiosChart: React.FC<KioskCharProps> = ({
  screenWidth,
  screenHeight,
  language,
}) => {
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [, setChartLoading] = useState(true);
  const [yesterdayDate, setYesterdayDate] = useState("");
  const [yesterdayWeekday, setYesterdayWeekday] = useState("");
  const { theme } = useTheme();
  const { awattarChartData, loading: priceLoading, error: priceError } = useAwattarPrice();
  const [showAwattar, setShowAwattar] = useState(false);
  const { systemData: energyData, loading: energyLoading } = useSystemData();
  const { systemSpecs: systemData } = useSystemSpecs();

  useEffect(() => {
    if (!systemData?.awattar) return;
    setShowAwattar(systemData.awattar === "Yes");
  }, [systemData?.awattar]);

  useEffect(() => {
    const fetchData = async () => {
      setChartLoading(true);

      try {
        // Fetch yesterday energy data
        const responseEnergy = await fetch(
          `${apiBaseUrl}kiosk_client_app.system_integration.doctype.invertar.invertar.calculate_15min_totals_yesterday`
        );
        if (!responseEnergy.ok)
          throw new Error(`Energy API error! status: ${responseEnergy.status}`);

        const dataEnergy = await responseEnergy.json();
        if (!dataEnergy.message || !Array.isArray(dataEnergy.message)) {
          throw new Error('Invalid energy data format');
        }

        const transformedEnergyData: ChartPoint[] = dataEnergy.message.map((item: YesterdayEnergyApiItem) => ({
          time: new Date(item.interval_start).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }),
          solar: item.total_solar_energy || 0,
          grid: item.total_grid_imported || 0,
          consumption: item.total_spend_energy || 0,
        }));

        if (dataEnergy.message.length > 0) {
          const dateStr = dataEnergy.message[0].date || dataEnergy.message[0].interval_start?.slice(0, 10);
          if (dateStr) {
            const [year, month, day] = dateStr.split("-");
            setYesterdayDate(`${day}.${month}.${year}`);
            const dateObj = new Date(`${year}-${month}-${day}`);
            const weekdays = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
            setYesterdayWeekday(weekdays[dateObj.getDay()]);
          }
        }
        setChartData(transformedEnergyData);

      } catch (error) {
        console.error(error);
      } finally {
        setChartLoading(false);
      }
    };

    fetchData();
    const intervalId = setInterval(fetchData, 15 * 60 * 1000); // 15 minutes
    return () => clearInterval(intervalId);
  }, []);

  const scaleFactor = Math.min(1.2, Math.max(0.7, screenWidth / 1080));
  const chartHeight = screenHeight * 0.35;
  const fontScale = Math.max(0.9, Math.min(1.3, screenWidth / 1080));
  const showBattery = systemData?.battery === 'Yes';

  // Build slides array with individual components
  const slides: React.ReactNode[] = [];

  // Day Progress Chart
  if (chartData && chartData.length > 0) {
    slides.push(
      <div key="day-progress">
        <DayProgressChart
          chartData={chartData}
          yesterdayDate={yesterdayDate}
          yesterdayWeekday={yesterdayWeekday}
          energyData={energyData}
          chartHeight={chartHeight}
          scaleFactor={scaleFactor}
          fontScale={fontScale}
          theme={theme}
          language={language}
        />
      </div>
    );
  }

  if (chartData && chartData.length > 0) {
    slides.push(
      <div key="weekly-energy">
        <WeeklyEnergyChart
          screenHeight={screenHeight}
          scaleFactor={scaleFactor}
          screenWidth={screenWidth}
          chartHeight={chartHeight}
          fontScale={fontScale}
          theme={theme}
          language={language}
        />
      </div>
    );
  }

  if (chartData && chartData.length > 0) {
    slides.push(
      <div key="monthly-energy">
        <MonthlyEnergyChart
          screenHeight={screenHeight}
          scaleFactor={scaleFactor}
          screenWidth={screenWidth}
          chartHeight={chartHeight}
          fontScale={fontScale}
          theme={theme}
          language={language}
        />
      </div>
    );
  }

  if (showAwattar && !priceError) {
    slides.push(
      <div key="stock-prices">
        <StockPricesChart
          screenHeight={screenHeight}
          scaleFactor={scaleFactor}
          screenWidth={screenWidth}
          chartHeight={chartHeight}
          fontScale={fontScale}
          theme={theme}
          awattarChartData={awattarChartData}
          loading={priceLoading}
          language={language}
        />
      </div>
    );
  }

  if (energyData && !energyLoading) {
    slides.push(
      <div key="energy-flow">
        <EnergyFlowChart
          energyData={energyData}
          energyLoading={energyLoading}
          showBattery={showBattery}
          theme={theme}
          language={language}
        />
      </div>
    );
  }

  return (
    <div
      className={`${theme === 'dark' ? 'ov-glass border-white/10' : 'bg-white/80 border-gray-200'
        } backdrop-blur-md rounded-2xl shadow-md border p-[calc(0.3vw+0.3vh)] h-[60%]`}
    >
      {slides.length > 0 ? (
        <Slider {...sliderSettings} className='h-full'>{slides}</Slider>
      ) : (
        <div className="flex items-center justify-center h-64">
          <p className={`text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
            Keine Daten verfügbar
          </p>
        </div>
      )}
    </div>
  );
};

export default KiosChart;