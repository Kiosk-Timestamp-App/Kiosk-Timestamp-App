# ÖKOVOLT Kiosk – Next.js

The same kiosk as `../frontend` (React + Vite), ported to **Next.js 16 (App Router)**. It has the same screens, rotation, design, data sources and demo mode.

## Commands
| | |
|---|---|
| `npm install` | install dependencies |
| `npm run dev` | dev server on http://localhost:8080 |
| `npm run build` | static export to `./out` (Netlify / any static host) |
| `npm run start` | serve `./out` on http://localhost:8081 (other port: `npm run start -- 9000`) |
| `npm run build:frappe` | build under `/assets/kiosk/frontend`, copy to `../kiosk/public/frontend` and `../kiosk/www/kiosk.html` |
| `npm run lint` | ESLint |

Preview links work the same as before: `/?screen=map|kiosk|insights|ads|company`, `&spot=drohne|wartung|reinigung|repowering|outro`, `&hold=1`.
The former single previews are routes now: `/preview/insights?lang=EN` and `/preview/company`.

## Clock-in QR (Zeiterfassung)
- **Workdays 07:00–09:00** (Vienna time, Mon–Fri, Austrian public holidays and 24/31 Dec excluded): the whole TV shows the
  clock-in screen of the Zeiterfassung reception, with the same rotating QR code (new every 30 s), countdown ring, location, clock and people present.
  The normal rotation pauses and resumes at 09:00. Preview any time: `/?screen=stamp&hold=1`.
- **Footer**: the oekovolt.com QR is replaced by the same rotating clock-in QR (always).
- Data comes from the Zeiterfassung bridge `GET <zeit-url>/api/display/qr-token` (in `Zeiterfassuing/frontend`,
  `src/lib/display-qr.ts`). The kiosk-device login stays on the Zeiterfassung server; the TV only holds a display key.

**Setup:**
1. In Frappe (Zeiterfassung), generate an API key and secret for the kiosk-device user (Desk → User → API Access → Generate Keys).
2. Set these environment variables on the Zeiterfassung frontend server and restart it:
   `DISPLAY_QR_KEY` (random, 32+ characters), `DISPLAY_KIOSK_API_KEY`, `DISPLAY_KIOSK_API_SECRET`,
   `DISPLAY_QR_ORIGINS` (the address the TV page is served from, e.g. `http://10.10.200.201`),
   and optionally `DISPLAY_QR_ALLOWED_IPS` (the TV's fixed IP).
3. On the TV, open the kiosk page once with `?zeitKey=<DISPLAY_QR_KEY>`. The key is stored on the TV and removed from the address bar.

**Online first, office network as fallback:** the kiosk tries `https://zeit.oekovolt.at` (`NEXT_PUBLIC_ZEIT_URL`) and, if that does
not answer, `http://192.168.1.100:3000` (`NEXT_PUBLIC_ZEIT_LOCAL_URL`). While on the local address it re-checks online every 5 minutes.
The QR leads phones to the same address that worked. The full screen shows which one is in use ("Verbunden über …").

Code: `src/api/zeitQr.ts` (fetching), `src/components/StampQr/schedule.ts` (time window), `src/template/StampQrScreen.tsx` (full screen), `src/components/KioskDisplayComponents/Footer.tsx` (footer).

## TV in the office network (http://192.168.1.100:9000)
- Windows task **"OEKOVOLT Kiosk NextJS"** starts `scripts/Start-Kiosk.ps1` at boot (SYSTEM, restarts on crash) and serves `./out` on port 9000.
  Log: `logs/kiosk.log`. Stop/start: `Stop-ScheduledTask` / `Start-ScheduledTask "OEKOVOLT Kiosk NextJS"`.
- Firewall rule **"OEKOVOLT Kiosk NextJS (TCP 9000, LAN)"** allows port 9000 from the local subnet only.
- After code changes: `npm run build` – the running server delivers the new build immediately (no restart).
- The TV must be in the same network as this PC (192.168.1.x); Zeiterfassung on port 3000 is also only open to the local subnet.

## What differs from the Vite version
- `src/app/` – Next.js entry (layout with meta tags, Frappe CSRF placeholder, navy background before CSS).
  The kiosk loads client-side only (`src/app/KioskClient.tsx`, `ssr: false`), just like the SPA did.
- `src/main.tsx` – replaces Vite's `main.tsx` (demo data, service worker registration).
- Image imports: Next returns objects, so each file uses `XImg.src` to keep URL strings.
- Tailwind v4 runs via `@tailwindcss/postcss` (`postcss.config.mjs`) instead of the Vite plugin.
- Service worker / `_headers`: hashed files are now under `/_next/static/`.

Everything else in `src/` is unchanged from `../frontend/src` (see `README-NEUES-DESIGN.md` there for content decisions).
