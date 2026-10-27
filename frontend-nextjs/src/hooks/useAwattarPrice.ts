import { useState, useEffect, useRef } from 'react';
import { apiBaseUrl } from '../api/apiBaseUrl';

interface MomentPriceData {
  momental_price: number;
}

interface PriceEntry {
  start_time: string;
  end_time: string;
  price: number;
  unit: string;
}

export const useAwattarPrice = (systemApiBaseUrl?: string) => {
  const [momentPrice, setMomentPrice] = useState<MomentPriceData | null>(null);
  const [awattarChartData, setAwattarChartData] = useState<{ time: string; price: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const baseUrl = systemApiBaseUrl || apiBaseUrl;

  // Keep last data in memory to compare
  const lastDataRef = useRef<{ momental_price: number; chartData: { time: string; price: number }[] } | null>(null);

  const isDataEqual = (
    a: { momental_price: number; chartData: { time: string; price: number }[] },
    b: { momental_price: number; chartData: { time: string; price: number }[] }
  ) => {
    if (a.momental_price !== b.momental_price) return false;
    if (a.chartData.length !== b.chartData.length) return false;
    return a.chartData.every((entry, i) => entry.time === b.chartData[i].time && entry.price === b.chartData[i].price);
  };

  useEffect(() => {
    const fetchPriceData = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${baseUrl}kiosk_client_app.system_integration.doctype.awattar_energy_price.awattar_energy_price.get_existing_awattar_price`
        );

        if (!response.ok) throw new Error(`Price API error! status: ${response.status}`);

        const data = await response.json();
        
        // Handle moment price
        if (data.message?.momental_price !== undefined) {
          setMomentPrice({ momental_price: data.message.momental_price });
        }

        let transformedPriceData: { time: string; price: number }[] = [];

        // Handle chart data
        if (data.message?.message && Array.isArray(data.message.message)) {
          transformedPriceData = data.message.message
            .map((entry: PriceEntry) => ({
              time: entry.start_time ? entry.start_time.slice(11, 16) : '',
              price: Number(entry.price),
              fullTime: entry.start_time,
            }))
            .sort((a: { time: string; price: number; fullTime: string }, b: { time: string; price: number; fullTime: string }) => {
              return new Date(a.fullTime).getTime() - new Date(b.fullTime).getTime();
            })
            .map(({ time, price }: { time: string; price: number }) => ({ time, price }));

          setAwattarChartData(transformedPriceData);
        }

        const newData = {
          momental_price: data.message?.momental_price ?? 0,
          chartData: transformedPriceData
        };

        // Save to localStorage only if changed
        if (!lastDataRef.current || !isDataEqual(lastDataRef.current, newData)) {
          localStorage.setItem(
            "lastPriceData",
            JSON.stringify({
              timestamp: Date.now(),
              data: newData
            })
          );
          lastDataRef.current = newData;
        }

        setError(null);
      } catch (error) {
        console.error('Error fetching price data:', error);
        setError('Fehler beim Laden der Preisdaten');

        // Try to use cached data
        const savedDataRaw = localStorage.getItem("lastPriceData");
        if (savedDataRaw) {
          const savedData = JSON.parse(savedDataRaw);
          setMomentPrice({ momental_price: savedData.data.momental_price });
          setAwattarChartData(savedData.data.chartData);
          lastDataRef.current = savedData.data;
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPriceData();
    const intervalId = setInterval(fetchPriceData, 15 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [baseUrl]);

  return { momentPrice, awattarChartData, loading, error };
};
