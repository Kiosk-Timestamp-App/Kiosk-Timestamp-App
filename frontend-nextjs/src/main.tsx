/**
 * Browser-Einstieg des Kiosks (früher Vite: src/main.tsx).
 * Wird nur im Browser geladen (siehe src/app/KioskClient.tsx) – alles hier darf window/localStorage nutzen.
 */
import './index.css';
import App from './App';
import { installDemoData } from './api/demoData';

// Demo-Daten statt Kiosk-Backend (Karte bleibt live) – abschalten in src/api/demoData.ts
installDemoData();

// PWA: Service Worker nur im eigenständigen Build (Netlify, Basis /) – nicht im Frappe-Build unter /assets/kiosk/frontend/
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_BASE_PATH) {
  if (document.readyState === 'complete') {
    navigator.serviceWorker.register('/sw.js').catch((err) => console.warn('Service Worker nicht registriert', err));
  } else {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => console.warn('Service Worker nicht registriert', err));
    });
  }
}

export default App;
