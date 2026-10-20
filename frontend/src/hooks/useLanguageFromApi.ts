import { useState, useEffect } from 'react';
import { apiBaseUrl } from '../api/apiBaseUrl';

export const useAutoLanguage = () => {
  const [languageCode, setLanguageCode] = useState<string | null>(() => {
    // Initialize from localStorage if available
    return localStorage.getItem('autoLanguage') || null;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const response = await fetch(
          `${apiBaseUrl}kiosk_client_app.system_integration.doctype.okosys_settings.okosys_settings.get_language`
        );

        if (!response.ok) throw new Error('Failed to fetch data from API');

        const data = await response.json();

        if (data?.message?.language_code) {
          const newLang = data.message.language_code;

          // Only update if different from last
          setLanguageCode((prev) => {
            if (prev !== newLang) {
              localStorage.setItem('autoLanguage', newLang);
              return newLang;
            }
            return prev;
          });

          setError(null);
        } else {
          throw new Error('No language data in response');
        }
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        // Use existing state or fallback from localStorage
        const savedLang = localStorage.getItem('autoLanguage');
        if (savedLang) setLanguageCode(savedLang);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []); // run once on mount

  return { languageCode, loading, error };
};
