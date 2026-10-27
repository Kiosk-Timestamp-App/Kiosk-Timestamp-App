import { useState, useEffect, useRef } from 'react';
import { apiBaseUrl } from '../api/apiBaseUrl';

interface SystemConfiguration {
  name: string;
  prefix_domain: string;
  ip_address: string;
  method: string;
  company_name: string;
  place: string;
  interval: number; // Interval in minutes
}

export const useSystemConfigurations = () => {
  const [configurations, setConfigurations] = useState<SystemConfiguration[] | null>(() => {
    const saved = localStorage.getItem('systemConfigurations');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const lastDataRef = useRef<SystemConfiguration[] | null>(configurations);

  useEffect(() => {
    const fetchConfigurations = async () => {
      try {
        const response = await fetch(
          `${apiBaseUrl}kiosk_client_app.system_integration.doctype.integration_photovoltaic_systems.integration_photovoltaic_systems.get_the_data_foreach_system`
        );

        if (!response.ok) {
          setConfigurations(null);
          setError('API nuk funksionon');
          return;
        }

        const data = await response.json();

        if (data.message && Array.isArray(data.message) && data.message.length > 0) {
          // Only update if data changed
          if (!lastDataRef.current || JSON.stringify(lastDataRef.current) !== JSON.stringify(data.message)) {
            setConfigurations(data.message);
            lastDataRef.current = data.message;
            setLastUpdate(new Date());

            // Save to localStorage
            localStorage.setItem('systemConfigurations', JSON.stringify(data.message));
          }
          setError(null);
        } else {
          setConfigurations(null);
          setError('Nuk ka sisteme');
        }
      } catch (err) {
        console.error(err);
        setError('Gabim në marrjen e të dhënave');

        // Fallback to localStorage
        const saved = localStorage.getItem('systemConfigurations');
        if (saved) {
          const savedData = JSON.parse(saved);
          setConfigurations(savedData);
          lastDataRef.current = savedData;
        }
      } finally {
        setLoading(false);
      }
    };

    fetchConfigurations();
    const intervalId = setInterval(fetchConfigurations, 30 * 1000); // 30 seconds
    return () => clearInterval(intervalId);
  }, []);

  return { configurations, loading, error, lastUpdate };
};
