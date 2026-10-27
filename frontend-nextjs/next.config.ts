import type { NextConfig } from 'next';

/**
 * Kiosk als statische Seite (wie der frühere Vite-Build):
 *   - `npm run build` schreibt nach ./out (für Netlify oder Frappe unter /assets/kiosk/frontend/)
 *   - Basis-Pfad per Umgebung: NEXT_PUBLIC_BASE_PATH=/assets/kiosk/frontend npm run build
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig: NextConfig = {
  output: 'export',
  basePath,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
