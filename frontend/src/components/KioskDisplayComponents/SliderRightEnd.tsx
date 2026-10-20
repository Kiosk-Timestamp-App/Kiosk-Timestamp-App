import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { AktuellerPreisSlider } from "./Preis";
import type { Theme } from "./types";
import Energieproduktion from "./Energie";
import { useSystemSpecs } from "../../hooks/useSystemSpecs";

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
  start_time?: string;
  momental_price?: number;
  language: string | null;
}

export const KioskSliderRightEnd = ({
  theme,
  today_energy,
  total_energy,
  total_energy_unit,
  co2Loading,
  language
}: AutarkySliderProps) => {
  const { systemSpecs, loading: loadingSpecs } = useSystemSpecs();
  const showPriceSlider = systemSpecs?.awattar === "Yes";

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

  if (loadingSpecs) {
    return <div className="h-auto w-full">Loading...</div>;
  }

  return (
    <div className="h-auto w-full ">
      <Slider {...sliderSettings} className="h-full w-full flex ">

        <div className="flex flex-col h-full w-full p-[calc(0.1vw+0.1vh)] gap-[calc(0.3vw+0.3vh)]">

          <Energieproduktion
            theme={theme}
            todayEnergy={today_energy}
            totalEnergy={total_energy}
            totalEnergyUnit={total_energy_unit}
            loading={co2Loading}
            language={language}
          />
        </div>
        {showPriceSlider && (
          <div className="flex flex-col h-full w-full p-[calc(0.1vw+0.1vh)] gap-[calc(0.3vw+0.3vh)]">
            <AktuellerPreisSlider theme={theme} language={language} />
          </div>
        )}
      </Slider>
    </div>
  );
};