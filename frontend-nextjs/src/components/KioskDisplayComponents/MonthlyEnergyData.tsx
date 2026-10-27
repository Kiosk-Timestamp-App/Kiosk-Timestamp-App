import React, { useEffect, useState } from "react";
import {
    XAxis,
    YAxis,
    ResponsiveContainer,
    CartesianGrid,
    Bar,
    BarChart,
} from "recharts";
import { Sigma } from 'lucide-react';
import { apiBaseUrl } from "../../api/apiBaseUrl";

interface DailyItem {
    day_date: string;
    total_solar_energy: number;
    sample_count: number;
}

interface MonthlyApi {
    daily_data: DailyItem[];
    total_energy_produced: number;
    energy_unit: string;
    total_energy_until_date: string;
    month: string;
    start_date_range: string;
    end_date_range: string;
    days_count: number;
}

interface MonthlySolarChartProps {
    scaleFactor: number;
    screenWidth: number;
    screenHeight: number;
    chartHeight: number;
    fontScale: number;
    theme: ThemeMode;
    language: string | null;
}

type ThemeMode = 'light' | 'dark' | string;

export const MonthlyEnergyChart = React.memo(function MonthlySolarChart({
    scaleFactor,
    chartHeight,
    fontScale,
    theme,
    language,
}: MonthlySolarChartProps) {
    const [chartData, setChartData] = useState<Array<DailyItem & { label: string }>>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [, setMonthLabel] = useState<string>("");
    const [totalLabel, setTotalLabel] = useState<string>("");
    const [dateRange, setDateRange] = useState<string>("");
    const [yMax, setYMax] = useState<number>(100);

    useEffect(() => {
        const fetchMonthly = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(
                    `${apiBaseUrl}kiosk_client_app.system_integration.doctype.invertar.invertar.calculate_daily_solar_energy_previous_31_days`
                );
                if (!res.ok) throw new Error(`API error ${res.status}`);
                const json = await res.json();

                const msg: MonthlyApi = json.message;
                if (!msg || !Array.isArray(msg.daily_data)) throw new Error("Invalid data format");

                // Ruaj rendin e API-së; label = dita e muajit (DD)
                const data = msg.daily_data.map((d) => {
                    const dt = new Date(d.day_date);
                    const dd = dt.toLocaleDateString("de-DE", { day: "2-digit" });
                    return { ...d, label: dd };
                });

                // Y maksimal dinamik (tavane në qindra)
                const maxVal = data.reduce((m, d) => Math.max(m, d.total_solar_energy), 0);
                const dynMax = Math.max(100, Math.ceil(maxVal / 100) * 100);

                setChartData(data);
                setYMax(dynMax);

                // Generate month label based on date range
                const startDate = new Date(msg.start_date_range);
                const endDate = new Date(msg.end_date_range);

                const startMonth = startDate.toLocaleDateString("en-US", { month: "long" });
                const endMonth = endDate.toLocaleDateString("en-US", { month: "long" });

                let monthLabel = "";
                if (startMonth === endMonth) {
                    monthLabel = startMonth;
                } else {
                    monthLabel = `${startMonth} - ${endMonth}`;
                }

                setMonthLabel(monthLabel);
                setTotalLabel(`${msg.total_energy_produced} ${msg.energy_unit || "kWh"}`);
                setDateRange(monthLabel);
            } catch (e: unknown) {
                setError((e instanceof Error && e.message) || "Unknown error");
            } finally {
                setLoading(false);
            }
        };

        fetchMonthly();
        const id = setInterval(fetchMonthly, 60 * 60 * 1000);
        return () => clearInterval(id);
    }, [language]);


    if (loading) {
        return <div className="h-full flex items-center justify-center">
            <div className={`text-[calc(0.6vw+0.6vh)] ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                {language === "EN" ? "Loading..." : language === "IT" ? "Caricamento..." : language === "FR" ? "Chargement..." : language === "SQ" ? "Duke ngarkuar..." : "Laden..."}
            </div>
        </div>;
    }
    if (error) {
        return <div className="h-full flex items-center justify-center">
            <div className={`text-[calc(0.6vw+0.6vh)] ${theme === "dark" ? "text-red-400" : "text-red-600"}`}>{error}</div>
        </div>;
    }

    return (
        <div className="h-full w-full flex flex-col">
            <div className="flex items-center justify-between py-[calc(0.3vw+0.3vh)] px-[calc(0.3vw+0.3vh)] h-[max-content]">
                <div className="flex flex-col justify-start items-start gap-2 ">
                    <div className="flex flex-row items-center">
                        <h2
                            className={`text-[calc(0.8vw+0.8vh)] font-bold leading-none ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}
                        >
                            {language === "EN"
                                ? "Last 30 Days Solar Production"
                                : language === "IT"
                                    ? "Produzione Solare Ultimi 30 Giorni"
                                    : language === "FR"
                                        ? "Production Solaire 30 Derniers Jours"
                                        : language === "SQ"
                                            ? "Prodhimi Solar 30 Ditët e Fundit"
                                            : language === "DE"
                                                ? "Solarproduktion der letzten 30 Tage"
                                                : "Solarproduktion der letzten 30 Tage"}
                        </h2>
                    </div>
                    <div className="flex flex-row items-center justify-between w-full">
                        <p
                            className={`text-[calc(0.5vw+0.5vh)] font-medium leading-none ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
                        >
                            {language === "EN"
                                ? "Daily solar energy production"
                                : language === "IT"
                                    ? "Produzione giornaliera di energia solare"
                                    : language === "FR"
                                        ? "Production quotidienne d'énergie solare"
                                        : language === "SQ"
                                            ? "Prodhimi ditor i energjisë solare"
                                            : language === "DE"
                                                ? "Tägliche Solarproduktion"
                                                : "Tägliche Solarproduktion"}
                            (kW)
                        </p>
                    </div>
                </div>
                <div className="flex flex-col justify-end items-end">
                    <div className="flex flex-row items-center justify-end gap-2">
                        <div
                            className={`rounded-xl p-2 ${theme === "dark" ? "ov-well" : "bg-gray-100"
                                }`}
                        >
                            <Sigma
                                className={`w-[1vw] h-[auto] ${theme === "dark" ? "text-gray-300" : "text-gray-600"
                                    }`}
                            />
                        </div>
                        <div className="flex flex-row items-end justify-end">
                            <p
                                className={`text-[calc(0.8vw+0.8vh)] font-bold leading-none ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}
                            >
                                {totalLabel}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-row items-end justify-center">
                        <p
                            className={`text-[calc(0.5vw+0.5vh)] font-medium leading-none ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
                        >
                            {dateRange}
                        </p>
                    </div>
                </div>
            </div>
            <div style={{ height: `${chartHeight}px` }}>
                {chartData.length === 0 ? (
                    <div className={`text-[calc(0.6vw+0.6vh)] ${theme === "dark" ? "text-gray-400" : "text-gray-600"} flex items-center justify-center flex-1`}>
                        {language === "EN" ? "No monthly data." :
                            language === "IT" ? "Nessun dato mensile." :
                                language === "FR" ? "Aucune donnée mensuelle." :
                                    language === "SQ" ? "S'ka të dhëna mujore." : "Keine Monatsdaten."}
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "rgba(255,255,255,0.10)" : "#e5e7eb"} strokeWidth={1} />
                            <XAxis
                                dataKey="label"
                                fontSize={11 * fontScale}
                                tick={{ fill: theme === "dark" ? "#9aa6bc" : "#6b7280", fontWeight: 500 }}
                                axisLine={{ stroke: theme === "dark" ? "rgba(255,255,255,0.10)" : "#d1d5db", strokeWidth: 1 }}
                                tickLine={{ stroke: theme === "dark" ? "rgba(255,255,255,0.10)" : "#d1d5db" }}
                            />
                            <YAxis
                                fontSize={11 * fontScale}
                                width={45 * scaleFactor}
                                tick={{ fill: theme === "dark" ? "#9aa6bc" : "#6b7280", fontWeight: 500 }}
                                axisLine={{ stroke: theme === "dark" ? "rgba(255,255,255,0.10)" : "#d1d5db", strokeWidth: 1 }}
                                tickLine={{ stroke: theme === "dark" ? "rgba(255,255,255,0.10)" : "#d1d5db" }}
                                domain={[0, yMax]}
                            />
                            <Bar
                                dataKey="total_solar_energy"
                                fill="#8cba58"
                                stroke="#8cba58"
                                radius={[2, 2, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>

            <div className="flex flex-wrap justify-center mt-5">
                <div className="flex items-center space-x-2">
                    <div className="w-[calc(0.25vw+0.25vh)] h-[calc(0.25vw+0.25vh)] bg-[#8cba58] rounded-full"></div>
                    <span
                        className={`text-[calc(0.4vw+0.4vh)] font-semibold ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
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
            </div>
        </div>
    );
});