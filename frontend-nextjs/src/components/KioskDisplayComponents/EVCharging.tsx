import { Package, Trash2 } from "lucide-react";
import CarImg from "../../assets/teslacars.png";
const Car = CarImg.src;
interface TVCarportProps {
  theme?: "dark" | "light";
  language: string | null;
  slots?: Array<{
    status: "fresh" | "occupied" | "free";
    percentage: number;

  }>;
}

const defaultSlots = [
  { status: "fresh" as const, percentage: 85 },
  { status: "occupied" as const, percentage: 45 },
  { status: "free" as const, percentage: 0 },
  { status: "free" as const, percentage: 0 },
  { status: "free" as const, percentage: 0 },
];

export default function TVCarport({
  theme = "dark",
  slots = defaultSlots,
  language
}: TVCarportProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "fresh":
        return {
          bgColor: "bg-[#669933]",
          textColor: "text-[#669933]",
          icon: Package,
          label: language === "EN" ? "DONE" : language === "IT" ? "FATTO" : language === "FR" ? "TERMINÉ" : language === "SQ" ? "GATI" : language === "DE" ? "FERTIG" : "FERTIG",
          description: "Einsatzbereit",
          carImage: Car,
        };
      case "occupied":
        return {
          bgColor: "bg-[#0a1b36]",
          textColor: "text-white",
          icon: Package,
          label: language === "EN" ? "OCCUPIED"
            : language === "IT" ? "OCCUPATO"
              : language === "FR" ? "OCCUPÉ"
                : language === "SQ" ? "ZENE"
                  : language === "DE" ? "BELEGT"
                    : "BELEGT"
          ,
          description: "Im Einsatz",
          carImage: Car,
        };
      case "free":
        return {
          bgColor: "bg-gray-500",
          textColor: "text-gray-500",
          icon: Trash2,
          label: language === "EN" ? "FREE"
            : language === "IT" ? "LIBERO"
              : language === "FR" ? "LIBRE"
                : language === "SQ" ? "LIRË"
                  : language === "DE" ? "FREI"
                    : "FREI",
          description: "Verfügbar",
          carImage: Car,
        };
      default:
        return {
          bgColor: "bg-gray-500",
          textColor: "text-gray-500",
          icon: Trash2,
          label: language === "EN" ? "FREE"
            : language === "IT" ? "LIBERO"
              : language === "FR" ? "LIBRE"
                : language === "SQ" ? "LIRË"
                  : language === "DE" ? "FREI"
                    : "FREI",
          description: "Verfügbar",
          carImage: Car,
        };
    }
  };

  const CarDisplay = ({ percentage, status }: { percentage: number; status: string }) => {
    const config = getStatusConfig(status);

    return (
      <div className="relative flex flex-col items-center h-full">
        <div className="relative mb-2">
          <img
            src={config.carImage}
            alt={`${config.label} car`}
            className="w-14 h-20 object-contain"
          />
          <div className={`absolute -top-2 -right-2 ${config.bgColor} text-white text-xs font-bold px-2 py-1 rounded-full min-w-[32px] text-center`}>
            {percentage}%
          </div>
        </div>
        <div className="w-16 h-2 bg-gray-400 rounded-full ">
          <div
            className={`h-full ${config.bgColor} transition-all duration-300`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className={`rounded-2xl shadow-md p-[calc(0.6vw+0.6vh)] border relative  flex-grow h-full flex flex-col ${theme === "dark" ? "ov-glass border-white/10" : "bg-white border-gray-200"
      }`}>
      <div className="flex justify-center items-center gap-10 mb-4 mt-5">
        {slots.map((slot, idx) => (
          <CarDisplay
            key={idx}
            percentage={slot.percentage}
            status={slot.status}
          />
        ))}
      </div>
      <div className="flex justify-center items-center gap-14 mb-3">
        {slots.map((slot, idx) => {
          const config = getStatusConfig(slot.status);
          return (
            <div key={idx} className="w-12 text-center">
              <div className={`text-sm font-bold ${config.textColor} mb-0.5`}>
                {idx + 1}
              </div>
              <div className={`text-xs font-semibold ${config.textColor} tracking-wider`}>
                {config.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}