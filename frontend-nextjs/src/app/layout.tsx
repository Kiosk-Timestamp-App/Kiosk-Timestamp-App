import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

const base = process.env.NEXT_PUBLIC_BASE_PATH || '';

export const metadata: Metadata = {
  title: 'ÖKOVOLT Kiosk',
  manifest: `${base}/manifest.webmanifest`,
  icons: {
    icon: { url: `${base}/favicon.png`, type: 'image/png' },
    apple: `${base}/icon-192.png`,
  },
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent' },
  other: { 'mobile-web-app-capable': 'yes' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#03122b',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <head>
        {/* Navy-Hintergrund schon vor dem CSS-Laden: kein weißer Blitz beim Start des TVs */}
        <style>{'html,body{margin:0;background:#03122b}'}</style>
        {/* Frappe ersetzt den Platzhalter, wenn die Seite als www/kiosk.html ausgeliefert wird */}
        <script dangerouslySetInnerHTML={{ __html: "window.csrf_token = '{{ frappe.session.csrf_token }}';" }} />
      </head>
      <body>
        <div id="root">{children}</div>
      </body>
    </html>
  );
}
