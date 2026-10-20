import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { installDemoData } from './api/demoData'

// Demo-Daten statt Kiosk-Backend (Karte bleibt live) – abschalten in src/api/demoData.ts
installDemoData()

// PWA: Service Worker nur im eigenständigen Build (Netlify, Basis /) – nicht im Frappe-Build unter /assets/kiosk/frontend/
if ('serviceWorker' in navigator && import.meta.env.PROD && import.meta.env.BASE_URL === '/') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => console.warn('Service Worker nicht registriert', err))
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
