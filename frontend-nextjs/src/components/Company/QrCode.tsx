import { useMemo } from 'react';
import QRCode from 'qrcode';

/**
 * QR-Code als Vektor (SVG), synchron im ersten Render erzeugt – keine leeren Kacheln, scharf in jeder Auflösung.
 * Fehlerkorrektur L: größere Module bei gleicher Fläche → aus größerer Entfernung scanbar
 * (M, wenn eine Bildmarke in der Mitte liegt – wie am Empfangsbildschirm der Zeiterfassung).
 */
export function QrCode({ value, label, className, level = 'L' }: { value: string; label: string; className?: string; level?: 'L' | 'M' }) {
  const path = useMemo(() => {
    const { modules } = QRCode.create(value, { errorCorrectionLevel: level });
    const n = modules.size;
    let d = '';
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (modules.data[y * n + x]) {
          // waagrechte Läufe zusammenfassen → kurzer Pfad
          let w = 1;
          while (x + w < n && modules.data[y * n + x + w]) w++;
          d += `M${x + 1} ${y + 1}h${w}v1h-${w}z`;
          x += w - 1;
        }
      }
    }
    return { d, size: n + 2 };
  }, [value, level]);
  return (
    <svg viewBox={`0 0 ${path.size} ${path.size}`} className={className} role="img" aria-label={label} shapeRendering="crispEdges">
      <rect width={path.size} height={path.size} fill="#ffffff" />
      <path d={path.d} fill="#03122b" />
    </svg>
  );
}
