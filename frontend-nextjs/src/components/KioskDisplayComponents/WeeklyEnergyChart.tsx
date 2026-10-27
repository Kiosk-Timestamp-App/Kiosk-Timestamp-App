import React, { useEffect, useState } from "react";
import {
    XAxis,
    YAxis,
    ResponsiveContainer,
    CartesianGrid,
    Bar,
    BarChart
} from "recharts";
import { apiBaseUrl } from "../../api/apiBaseUrl";

interface WeeklyEnergyData {
    day_date: string;
    total_solar_energy: number;
    total_grid_exported: number;
    total_spend_energy: number;
}

interface WeeklyEnergyChartProps {
    scaleFactor: number;
    screenWidth: number;
    screenHeight: number;
    chartHeight: number;
    fontScale: number;
    theme: string;
    language: string | null;
}

export const WeeklyEnergyChart = React.memo(function WeeklyEnergyChart({
    scaleFactor,
    theme,
    chartHeight,
    fontScale,
    language,
}: WeeklyEnergyChartProps) {
    const [chartData, setChartData] = useState<WeeklyEnergyData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [yMax, setYMax] = useState<number>(100);

    useEffect(() => {
        const fetchWeeklyData = async () => {
            setLoading(true);
            setError(null);

            try {
                const response = await fetch(
                    `${apiBaseUrl}kiosk_client_app.system_integration.doctype.invertar.invertar.calculate_daily_totals_last_week`
                );

                if (!response.ok) {
                    throw new Error(`API error! status: ${response.status}`);
                }

                const data = await response.json();

                if (!data.message || !Array.isArray(data.message)) {
                    throw new Error('Invalid data format');
                }

                const base = (data.message as WeeklyEnergyData[]).slice(-7);
                const dayNames =
                    language === "EN"
                        ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
                        : language === "IT"
                            ? ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"]
                            : language === "FR"
                                ? ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"]
                                : language === "SQ"
                                    ? ["Die", "Hën", "Mar", "Mër", "Enj", "Pre", "Sht"]
                                    : ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

                const transformedData = base.map((item) => {
                    const d = new Date(item.day_date);
                    return {
                        ...item,
                        day_name: dayNames[d.getDay()],
                        formatted_date: d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }),
                    };
                });

                const maxVal = transformedData.reduce((m, d) => {
                    const localMax = Math.max(d.total_solar_energy, d.total_grid_exported, d.total_spend_energy);
                    return Math.max(m, localMax);
                }, 0);
                const yMax = Math.max(100, Math.ceil(maxVal / 100) * 100);

                setChartData(transformedData);
                setYMax(yMax);
            } catch (err) {
                console.error('Error fetching weekly data:', err);
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setLoading(false);
            }
        };

        fetchWeeklyData();
        const intervalId = setInterval(fetchWeeklyData, 60 * 60 * 1000);
        return () => clearInterval(intervalId);
    }, [language]);

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className={`text-[calc(0.6vw+0.6vh)] ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                    {language === "EN" ? "Loading..." :
                        language === "IT" ? "Caricamento..." :
                            language === "FR" ? "Chargement..." :
                                language === "SQ" ? "Duke ngarkuar..." :
                                    language === "DE" ? "Laden..." : "Laden..."}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className={`text-[calc(0.6vw+0.6vh)] ${theme === "dark" ? "text-red-400" : "text-red-600"}`}>
                    {language === "EN" ? "Error loading data" :
                        language === "IT" ? "Errore nel caricamento dei dati" :
                            language === "FR" ? "Erreur lors du chargement des données" :
                                language === "SQ" ? "Gabim në ngarkimin e të dhënave" :
                                    language === "DE" ? "Fehler beim Laden der Daten" : "Fehler beim Laden der Daten"}
                </div>
            </div>
        );
    }

    return (
        <div className="h-full w-full flex flex-col">
            <div className="flex items-center justify-between py-[calc(0.3vw+0.3vh)] px-[calc(0.3vw+0.3vh)] h-[max-content]">
                <div className="flex flex-col justify-start items-start gap-2">
                    <div className="flex flex-row items-center">
                        <h2
                            className={`text-[calc(0.8vw+0.8vh)] font-bold leading-none ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}
                        >
                            {language === "EN"
                                ? "Weekly Overview"
                                : language === "IT"
                                    ? "Panoramica Settimanale"
                                    : language === "FR"
                                        ? "Aperçu Hebdomadaire"
                                        : language === "SQ"
                                            ? "Përmbledhja Javore"
                                            : language === "DE"
                                                ? "Wochenübersicht"
                                                : "Wochenübersicht"}
                        </h2>
                    </div>
                    <div className="flex flex-row items-center justify-between w-full">
                        <p
                            className={`text-[calc(0.5vw+0.5vh)] font-medium leading-none ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
                        >
                            {language === "EN"
                                ? "Last 7 days energy overview"
                                : language === "IT"
                                    ? "Panoramica energia ultimi 7 giorni"
                                    : language === "FR"
                                        ? "Aperçu énergie 7 derniers jours"
                                        : language === "SQ"
                                            ? "Përmbledhja e energjisë 7 ditët e fundit"
                                            : language === "DE"
                                                ? "Energieübersicht der letzten 7 Tage"
                                                : "Energieübersicht der letzten 7 Tage"}
                            (kWh)
                        </p>
                    </div>
                </div>
            </div>
            <div style={{ height: `${chartHeight}px` }}>
                {chartData.length === 0 ? (
                    <div className={`text-[calc(0.6vw+0.6vh)] ${theme === "dark" ? "text-gray-400" : "text-gray-600"} flex items-center justify-center h-full`}>
                        {language === "EN" ? "No weekly data found." :
                            language === "IT" ? "Nessun dato settimanale trovato." :
                                language === "FR" ? "Aucune donnée hebdomadaire trouvée." :
                                    language === "SQ" ? "Asnjë të dhënë javore gjetur." :
                                        language === "DE" ? "Keine Wochenübersicht gefunden." : "Keine Wochenübersicht gefunden."}
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="solarGradient" x1="0" y1="1" x2="0" y2="0">
                                    <stop offset="0%" stopColor="#e8f5e8" />
                                    <stop offset="100%" stopColor="#8cba58" />
                                </linearGradient>
                                <linearGradient id="consumptionGradient" x1="0" y1="1" x2="0" y2="0">
                                    <stop offset="0%" stopColor="#e3f2fd" />
                                    <stop offset="100%" stopColor="#5b94e0" />
                                </linearGradient>
                                <linearGradient id="exportGradient" x1="0" y1="1" x2="0" y2="0">
                                    <stop offset="0%" stopColor="#ffebee" />
                                    <stop offset="100%" stopColor="#f0574b" />
                                </linearGradient>
                            </defs>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke={theme === "dark" ? "rgba(255,255,255,0.10)" : "#e5e7eb"}
                                strokeWidth={1}
                            />
                            <XAxis
                                dataKey="day_name"
                                fontSize={11 * fontScale}
                                tick={{
                                    fill: theme === "dark" ? "#9aa6bc" : "#6b7280",
                                    fontWeight: 500,
                                }}
                                axisLine={{
                                    stroke: theme === "dark" ? "rgba(255,255,255,0.10)" : "#d1d5db",
                                    strokeWidth: 1,
                                }}
                                tickLine={{
                                    stroke: theme === "dark" ? "rgba(255,255,255,0.10)" : "#d1d5db",
                                }}
                            />
                            <YAxis
                                fontSize={11 * fontScale}
                                width={45 * scaleFactor}
                                tick={{
                                    fill: theme === "dark" ? "#9aa6bc" : "#6b7280",
                                    fontWeight: 500,
                                }}
                                axisLine={{ stroke: theme === "dark" ? "rgba(255,255,255,0.10)" : "#d1d5db", strokeWidth: 1 }}
                                tickLine={{ stroke: theme === "dark" ? "rgba(255,255,255,0.10)" : "#d1d5db" }}
                                domain={[0, yMax]}
                            />
                            <Bar
                                dataKey="total_solar_energy"
                                name={language === "EN"
                                    ? "PV Production"
                                    : language === "IT"
                                        ? "PV Produzione"
                                        : language === "FR"
                                            ? "PV Production"
                                            : language === "SQ"
                                                ? "Prodhimi PV"
                                                : language === "DE"
                                                    ? "PV Produktion"
                                                    : "PV Produktion"}
                                fill="url(#solarGradient)"
                                radius={[2, 2, 0, 0]}
                            />
                            <Bar
                                dataKey="total_spend_energy"
                                name={language === "EN"
                                    ? "Consumption"
                                    : language === "IT"
                                        ? "Consumo"
                                        : language === "FR"
                                            ? "Consommation"
                                            : language === "SQ"
                                                ? "Konsumi"
                                                : language === "DE"
                                                    ? "Gesamtverbrauch"
                                                    : "Gesamtverbrauch"}
                                fill="url(#consumptionGradient)"
                                radius={[2, 2, 0, 0]}
                            />
                            <Bar
                                dataKey="total_grid_exported"
                                name={language === "EN"
                                    ? "Grid Export"
                                    : language === "IT"
                                        ? "Esportazione Rete"
                                        : language === "FR"
                                            ? "Export Réseau"
                                            : language === "SQ"
                                                ? "Eksporti i Rrjetit"
                                                : language === "DE"
                                                    ? "Netzeinspeisung"
                                                    : "Netzeinspeisung"}
                                fill="url(#exportGradient)"
                                radius={[2, 2, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-5">
                <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-[#8cba58] rounded-full"></div>
                    <span
                        className={`text-xs font-semibold ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
                    >
                        {language === "EN"
                            ? "PV Production"
                            : language === "IT"
                                ? "PV Produzione"
                                : language === "FR"
                                    ? "PV Production"
                                    : language === "SQ"
                                        ? "Prodhimi PV"
                                        : language === "DE"
                                            ? "PV Produktion"
                                            : "PV Produktion"}
                    </span>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-[#5b94e0] rounded-full"></div>
                    <span
                        className={`text-xs font-semibold ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
                    >
                        {language === "EN"
                            ? "Consumption"
                            : language === "IT"
                                ? "Consumo"
                                : language === "FR"
                                    ? "Consommation"
                                    : language === "SQ"
                                        ? "Konsumi"
                                        : language === "DE"
                                            ? "Gesamtverbrauch"
                                            : "Gesamtverbrauch"}
                    </span>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-[#f0574b] rounded-full"></div>
                    <span
                        className={`text-xs font-semibold ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
                    >
                        {language === "EN"
                            ? "Grid Export"
                            : language === "IT"
                                ? "Esportazione Rete"
                                : language === "FR"
                                    ? "Export Réseau"
                                    : language === "SQ"
                                        ? "Eksporti i Rrjetit"
                                        : language === "DE"
                                            ? "Netz-Export"
                                            : "Netz-Export"}
                    </span>
                </div>
            </div>
        </div>
    );
});