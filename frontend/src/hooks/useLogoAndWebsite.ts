import { useState, useEffect, useRef } from 'react';
import { apiBaseUrl } from '../api/apiBaseUrl';

interface LogoAndWebsiteData {
  kiosk_logo: string;
  website: string;
}

/** Öffentliche ÖKOVOLT-Website (Kundenvorgabe: .com statt .at) */
export const PUBLIC_WEBSITE = 'https://www.oekovolt.com';

/** Website aus dem Backend vereinheitlichen: oekovolt.at → oekovolt.com, leer → PUBLIC_WEBSITE */
export const normalizeWebsite = (website: string | null | undefined) => {
  const w = (website ?? '').trim();
  if (!w) return PUBLIC_WEBSITE;
  return w.replace(/oekovolt\.at\b/gi, 'oekovolt.com');
};

const normalize = (d: LogoAndWebsiteData): LogoAndWebsiteData => ({ ...d, website: normalizeWebsite(d.website) });

export const useLogoAndWebsite = () => {
  const [data, setData] = useState<LogoAndWebsiteData | null>(() => {
    // Initialize from localStorage if available
    const saved = localStorage.getItem('logoAndWebsite');
    return saved ? normalize(JSON.parse(saved)) : null;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const lastDataRef = useRef<LogoAndWebsiteData | null>(data);

  useEffect(() => {
    const fetchLogoAndWebsite = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${apiBaseUrl}kiosk_client_app.system_integration.doctype.okosys_settings.okosys_settings.get_logo_and_website`
        );

        if (!response.ok) throw new Error('API error');

        const responseData = await response.json();
        if (!responseData.message) throw new Error('No data');

        const newData: LogoAndWebsiteData = normalize({
          kiosk_logo: responseData.message.kiosk_logo,
          website: responseData.message.website
        });

        // Compare with last data in memory
        if (
          !lastDataRef.current ||
          lastDataRef.current.kiosk_logo !== newData.kiosk_logo ||
          lastDataRef.current.website !== newData.website
        ) {
          setData(newData);
          lastDataRef.current = newData;

          // Save to localStorage
          localStorage.setItem('logoAndWebsite', JSON.stringify(newData));
        }

        setError(null);
      } catch (err) {
        console.error('Error fetching logo and website:', err);
        setError('Error fetching logo and website');

        // Fallback to localStorage if API fails
        const saved = localStorage.getItem('logoAndWebsite');
        if (saved) {
          const savedData = normalize(JSON.parse(saved));
          setData(savedData);
          lastDataRef.current = savedData;
        }
      } finally {
        setLoading(false);
      }
    };

    fetchLogoAndWebsite();
  }, []);

  return { data, loading, error };
};
