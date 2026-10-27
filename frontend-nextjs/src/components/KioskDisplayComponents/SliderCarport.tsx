import Slider from "react-slick";
import type { Theme } from "./types";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { KioskWidget } from "./Autarky";
import KioskHomeUsage from "./EVCharging";


interface AutarkySliderProps {
  theme: Theme;
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
  ipAdress: string;

}

export const KioskSliderCarport = ({
  theme,
  language,
  ipAdress,
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
    <div className="h-auto w-full">
      <Slider {...sliderSettings} className="h-full w-full">
        <div className="h-full w-full">
          <div className="flex flex-col h-full w-full px-1 gap-[calc(0.3vw+0.3vh)]">
            <div className="flex-1">
              <KioskWidget
                theme={theme}
                language={language}
                ipAdress={ipAdress}
              />
            </div>
          </div>
        </div>
        <div className="h-full w-full flex flex-col">
          <div className="flex flex-col h-full w-full px-1 gap-[calc(0.3vw+0.3vh)]">
            <div className="flex-1">
              <KioskHomeUsage theme={theme} language={language} />
            </div>

          </div>
        </div>
      </Slider>
    </div>
  );
};

