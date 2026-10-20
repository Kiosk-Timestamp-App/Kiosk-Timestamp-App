import { useState, useEffect, useRef } from 'react';
import { apiBaseUrl } from '../api/apiBaseUrl';

export interface MapDataConfig {
  api_data_url: string;
  api_carbon_url: string;
  token: string;
  country?: string;
  zone?: string;
}

export const useMapData = () => {
  const [mapConfig, setMapConfig] = useState<MapDataConfig | null>(() => {
    // Initialize from localStorage if available
    const saved = localStorage.getItem('mapConfig');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const lastDataRef = useRef<MapDataConfig | null>(mapConfig);

  useEffect(() => {
    const fetchMapConfig = async () => {
      try {
        const response = await fetch(
          `${apiBaseUrl}kiosk_client_app.system_integration.doctype.okosys_settings.okosys_settings.get_maps_data`
        );

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const json = await response.json();
        if (!json.message) throw new Error('Invalid response format');

        const newConfig: MapDataConfig = json.message;

        // Compare with last data
        if (!lastDataRef.current || JSON.stringify(lastDataRef.current) !== JSON.stringify(newConfig)) {
          setMapConfig(newConfig);
          lastDataRef.current = newConfig;

          // Save to localStorage
          localStorage.setItem('mapConfig', JSON.stringify(newConfig));
        }

        setError(null);
      } catch (err) {
        console.error('Error fetching map config:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');

        // Fallback to memory or localStorage
        const saved = localStorage.getItem('mapConfig');
        if (saved) {
          const savedData = JSON.parse(saved);
          setMapConfig(savedData);
          lastDataRef.current = savedData;
        } else {
          // Fallback to Austria config if nothing exists
          const fallbackConfig: MapDataConfig = {
            api_data_url: 'https://api.electricitymaps.com/v3/power-breakdown/latest?zone=AT',
            api_carbon_url: 'https://api.electricitymaps.com/v3/carbon-intensity/latest?zone=AT',
            token: 'rAOFsgwWelVRRs24iC01'
          };
          setMapConfig(fallbackConfig);
          lastDataRef.current = fallbackConfig;
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMapConfig();
    const intervalId = setInterval(fetchMapConfig, 15 * 60 * 1000); // 15 minutes
    return () => clearInterval(intervalId);
  }, []);

  return { mapConfig, loading, error };
};
