import Slider from "react-slick";
import type { Theme } from "./types";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import KioskCo2Box from "./CO2";
import KioskTreesBox from "./BaeumeBox";
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
  language: string | null;
  ipAdress?: string;

}

export const KioskSliderLeftEnd = ({
language,
ipAdress = apiBaseUrl
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
    rtl: true, // 👈 this makes it slide left-to-right
    

  };

  return (
    <div className="h-full w-full ">
      <Slider {...sliderSettings} className="h-full w-full ">
        {/* --- Slide 1 --- */}
        <div className="flex flex-col h-full w-full p-[calc(0.1vw+0.1vh)] gap-[calc(0.3vw+0.3vh)]">
          <KioskCo2Box language={language} ipAdress={ipAdress}/>
        </div>
        {/* --- Slide 2 --- */}
        <div className="flex flex-col h-full w-full p-[calc(0.1vw+0.1vh)] gap-[calc(0.3vw+0.3vh)]">
          <KioskTreesBox language={language} ipAdress={ipAdress}/>
        </div>
      </Slider>
    </div>
  );
};

