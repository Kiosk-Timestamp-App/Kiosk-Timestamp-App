'use client';

import dynamic from 'next/dynamic';

/**
 * Der Kiosk läuft komplett im Browser (localStorage, window, Leaflet, GSAP …) – wie zuvor die Vite-SPA.
 * Darum ohne Server-Rendering laden; bis dahin zeigt die Seite nur die Navy-Bühne.
 */
const Kiosk = dynamic(() => import('../main'), { ssr: false });

export default function KioskClient() {
  return <Kiosk />;
}
