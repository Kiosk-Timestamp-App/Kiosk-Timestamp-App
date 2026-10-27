import Slider from "react-slick";
import type { Theme } from "./types";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import KioskHomeUsage from "./EVCharging";
import { KioskWidget } from "./Autarky";
import { SelfGesamt } from "./SelfGesamt";
import { apiBaseUrl } from "../../api/apiBaseUrl";

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
  showCarport?: boolean; // Add this line
  language: string | null;
  ipAdress?: string;

}

export const KioskSlider = ({
  theme,
  showAutarkieWidget = false,
  showCarport = true, // Default to false
  language,
  ipAdress=apiBaseUrl

}: AutarkySliderProps) => {
  const sliderSettings = {
    dots: false,
    infinite: !(Number(showAutarkieWidget) + Number(showCarport) <= 1),
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 30000, // 30 seconds
    speed: 2000,
    pauseOnHover: false,
    arrows: false,
    adaptiveHeight: false,
    rtl: true, // 👈 this makes it slide left-to-right
  };

  return (

    <div className="w-full flex flex-col gap-[calc(0.4vw+0.4vh)] h-full  ">
      <div className="h-[42%]">
        <SelfGesamt theme={theme} language={language} />
      </div>
      <div className="h-[55%]">
        <Slider {...sliderSettings} className="w-full h-full">
          {showAutarkieWidget && (
            <div className="pb-[calc(0.2vw+0.2vh)]  w-full h-full">
              <KioskWidget theme={theme} fullHeight={false} language={language} ipAdress={ipAdress} />
            </div>
          )}
          {showCarport && (
            <div className="pb-[calc(0.2vw+0.2vh)]  w-full h-full">
            <KioskHomeUsage theme={theme} language={language} />
            </div>
          )}
        </Slider>
      </div>
    </div>
  );
};
