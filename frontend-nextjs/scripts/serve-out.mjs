/**
 * Fertigen Build (./out) ausliefern – `next start` funktioniert mit `output: 'export'` nicht.
 *   npm run start                 → http://localhost:8081
 *   npm run start -- 9000         → anderer Port (oder Umgebung PORT=9000)
 */
import http from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..', 'out');
const port = Number(process.argv[2] || process.env.PORT || 8081);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
};

const fileFor = (urlPath) => {
  const clean = path.normalize(decodeURIComponent(urlPath.split('?')[0])).replace(/^[/\\]+/, '');
  const full = path.join(root, clean);
  if (!full.startsWith(root)) return null;
  for (const candidate of [full, path.join(full, 'index.html'), `${full}.html`]) {
    try {
      if (statSync(candidate).isFile()) return candidate;
    } catch {
      /* nächster Kandidat */
    }
  }
  return null;
};

http
  .createServer((req, res) => {
    const file = fileFor(req.url || '/') ?? path.join(root, '404.html');
    const ext = path.extname(file);
    res.setHeader('Content-Type', TYPES[ext] || 'application/octet-stream');
    if (file.includes(`${path.sep}_next${path.sep}static${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    else res.setHeader('Cache-Control', 'no-cache');
    if (file.endsWith('404.html')) res.statusCode = 404;
    createReadStream(file).on('error', () => res.end()).pipe(res);
  })
  .listen(port, '0.0.0.0', () => console.log(`Kiosk (Build) läuft auf http://localhost:${port}`));
