import { useState, useEffect } from 'react';

interface LocalizedTimeData {
  formattedTime: string;
  formattedDate: string;
  timezone: string;
}

export const useLocalizedTime = (language: string | null = "DE") => {
  const [timeData, setTimeData] = useState<LocalizedTimeData>({
    formattedTime: '',
    formattedDate: '',
    timezone: ''
  });


  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      
      const formattedTime = now.toLocaleTimeString('de-AT', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Vienna'
      });

      let formattedDate: string;
      
      if (language === "SQ") {
        const albanianDays = ["E Diel", "E Hënë", "E Martë", "E Mërkurë", "E Enjte", "E Premte", "E Shtunë"];
        const albanianMonths = ["Janar", "Shkurt", "Mars", "Prill", "Maj", "Qershor", "Korrik", "Gusht", "Shtator", "Tetor", "Nëntor", "Dhjetor"];
        
        const dayOfWeek = albanianDays[now.getDay()];
        const day = now.getDate().toString().padStart(2, '0');
        const month = albanianMonths[now.getMonth()];
        const year = now.getFullYear();
        
        formattedDate = `${dayOfWeek}, ${day} ${month} ${year}`;
      } else {
        // Use locale-based formatting for other languages
        const localeMap = {
          "EN": "en-US",
          "IT": "it-IT", 
          "FR": "fr-FR",
          "DE": "de-AT"
        };
        
        const locale = localeMap[language as keyof typeof localeMap] || "de-AT";
        
        formattedDate = now.toLocaleDateString(locale, {
          weekday: 'long',
          day: '2-digit',
          month: 'long',
          year: 'numeric',
          timeZone: 'Europe/Vienna'
        });
      }

      // Get current timezone info
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      setTimeData({
        formattedTime,
        formattedDate,
        timezone
      });
    };

    // Update immediately
    updateTime();
    
    // Update every second
    const interval = setInterval(updateTime, 1000); // 1 second
    
    return () => clearInterval(interval);
  }, [language]); // Add language as dependency

  return timeData;
};