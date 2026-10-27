import { useMapData } from "../hooks/useMapData";
import { GridDisplay } from "../components/Map/shared/GridDisplay";
import { zoneFromConfig } from "../components/Map/shared/config";

interface KioskProp {
    isFullscreen: boolean;
    screenWidth: number;
    screenHeight: number;
    aspectRatio: number;
    language: string | null;
}

/**
 * Strommix-/Karten-Bildschirm. Das Land kommt aus der Backend-Konfiguration
 * (`zone=AT|DE|CH|XK` in der electricitymaps-URL bzw. Feld `zone`); Standard ist Österreich.
 * Solange die Konfiguration lädt, zeigt das Raster Lade-Skelette statt eines Spinners.
 */
export const MultiDisplayMap = ({ isFullscreen, language }: KioskProp) => {
    const { mapConfig } = useMapData();
    return (
        <div className={isFullscreen ? "fixed inset-0 z-50" : "h-full w-full"}>
            <GridDisplay zone={zoneFromConfig(mapConfig)} mapConfig={mapConfig} language={language} />
        </div>
    );
};
