/**
 * Frappe-Build (früher: `vite build --base=/assets/kiosk/frontend/ && yarn copy-html-entry`):
 * baut mit Basis-Pfad /assets/kiosk/frontend, kopiert nach ../kiosk/public/frontend
 * und legt die Startseite als ../kiosk/www/kiosk.html ab.
 */
import { execSync } from 'node:child_process';
import { cpSync, rmSync, mkdirSync, copyFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const target = path.resolve(root, '../kiosk/public/frontend');
const www = path.resolve(root, '../kiosk/www');

execSync('npx next build', {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, NEXT_PUBLIC_BASE_PATH: '/assets/kiosk/frontend' },
});

rmSync(target, { recursive: true, force: true });
cpSync(path.join(root, 'out'), target, { recursive: true });
mkdirSync(www, { recursive: true });
copyFileSync(path.join(target, 'index.html'), path.join(www, 'kiosk.html'));
console.log(`Kopiert nach ${target} und ${path.join(www, 'kiosk.html')}`);
