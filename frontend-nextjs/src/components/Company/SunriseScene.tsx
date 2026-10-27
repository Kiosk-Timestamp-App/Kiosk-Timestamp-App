import { useId } from 'react';
import { delay } from '../../design/hooks';

const W = 1000;
const H = 560;
const HORIZON = 300;
const VP = { x: 725, y: HORIZON };
const ROWS = 8;
const BOTTOM = H + 30;

/** Tiefe → Bildzeile (Zentralperspektive, Fluchtpunkt in der aufgehenden Sonne) */
const rowY = (t: number) => HORIZON + (BOTTOM - HORIZON) * Math.pow(t / ROWS, 1.7);
/** Modultische: geneigte Fläche (zwei Module hoch), darunter Gestell/Schatten und sichtbarer Wiesenstreifen */
const ROW_BANDS = Array.from({ length: ROWS }, (_, i) => ({ i, y0: rowY(i + 0.22), y1: rowY(i + 0.72), y2: rowY(i + 0.9) }));
/** Modulkanten als Strahlen vom Fluchtpunkt zum unteren Rand */
const RAYS = Array.from({ length: 64 }, (_, k) => VP.x + (k - 32) * 48);
/** Wartungsgassen zwischen den Tischen: schmale Keile zum Fluchtpunkt (in der Ferne automatisch schmaler) */
const AISLES = RAYS.filter((_, k) => k % 6 === 3);
const AISLE_W = 16;
/** x-Position eines Strahls in Höhe y */
const rayX = (bottomX: number, y: number) => VP.x + (bottomX - VP.x) * ((y - VP.y) / (BOTTOM - VP.y));

/** Zeitplan der Signatur (ms ab Kapiteleintritt) */
const ROLL_START = 1100;
const ROLL_STEP = 460; // 8 Reihen → ~3,7 s Lichtlauf
/** vorderste vollständig sichtbare Reihe (die unterste wird vom Bildrand angeschnitten) */
const FRONT_ROW = ROWS - 2;
const FLARE_AT = ROLL_START + FRONT_ROW * ROLL_STEP + 500;
const FRONT = ROW_BANDS[FRONT_ROW];
const FLARE = { x: VP.x - 40, y: (FRONT.y0 + FRONT.y1) / 2 };

/**
 * Signatur-Illustration „Sonnenaufgang über dem Solarpark“ (reines SVG, keine Fotos):
 * 1) Die Sonne steigt auf. 2) Das Morgenlicht rollt in ~4 s Tisch für Tisch vom Horizont zum Betrachter.
 * 3) Der erste Sonnenstrahl trifft die vorderste Modulreihe – weicher Lichtblitz mit Glanzstreif, der zu einem
 *    ruhigen Schimmer abklingt. 4) Danach gleitet in ruhigem Takt ein Reflex die Lichtbahn entlang.
 * Bei jedem Kapiteleintritt neu (das Kapitel wird neu gemountet). Nur transform/opacity.
 */
export function SunriseScene({ className }: { className?: string }) {
  const id = useId().replace(/:/g, '');
  const u = (n: string) => `url(#${id}-${n})`;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMax slice"
      className={`[mask-image:linear-gradient(180deg,transparent_4%,black_40%)] ${className ?? ''}`}
      aria-hidden
      fill="none"
    >
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2={HORIZON} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#0a2550" stopOpacity="0" />
          <stop offset="0.55" stopColor="#1f539a" stopOpacity="0.25" />
          <stop offset="0.88" stopColor="#c77a2a" stopOpacity="0.35" />
          <stop offset="1" stopColor="#FFC766" stopOpacity="0.55" />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx={VP.x} cy={HORIZON} r="460" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFE7A3" stopOpacity="0.6" />
          <stop offset="0.22" stopColor="#F5A70F" stopOpacity="0.25" />
          <stop offset="1" stopColor="#F5A70F" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-sun`}>
          <stop offset="0" stopColor="#FFFBEA" />
          <stop offset="0.55" stopColor="#FFE08A" />
          <stop offset="1" stopColor="#F5A70F" />
        </radialGradient>
        <radialGradient id={`${id}-corona`}>
          <stop offset="0.45" stopColor="#FFE7A3" stopOpacity="0.55" />
          <stop offset="1" stopColor="#FFD873" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-shaft`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#FFE7A3" stopOpacity="0.22" />
          <stop offset="1" stopColor="#FFE7A3" stopOpacity="0" />
        </linearGradient>
        {/* Wiese zwischen den Tischen: dunkles Grün statt Blau – liest sich als Feld, nicht als Wasser */}
        <linearGradient id={`${id}-ground`} x1="0" y1={HORIZON} x2="0" y2={H} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3a3a1c" />
          <stop offset="0.25" stopColor="#1d2f17" />
          <stop offset="1" stopColor="#0c1a10" />
        </linearGradient>
        <linearGradient id={`${id}-cell`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a80c8" />
          <stop offset="0.45" stopColor="#1f4f92" />
          <stop offset="1" stopColor="#0c2754" />
        </linearGradient>
        <linearGradient id={`${id}-rowlight`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#FFD873" stopOpacity="0" />
          <stop offset="0.5" stopColor="#FFE7A3" stopOpacity="1" />
          <stop offset="1" stopColor="#FFD873" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-beam`} x1="0" y1={HORIZON} x2="0" y2={H} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFE7A3" stopOpacity="0.38" />
          <stop offset="0.5" stopColor="#FFD873" stopOpacity="0.16" />
          <stop offset="1" stopColor="#FFD873" stopOpacity="0.06" />
        </linearGradient>
        <linearGradient id={`${id}-haze`} x1="0" y1={HORIZON} x2="0" y2={HORIZON + 110} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#c98a3a" stopOpacity="0.75" />
          <stop offset="0.35" stopColor="#3a3a20" stopOpacity="0.5" />
          <stop offset="1" stopColor="#1d2f17" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${id}-glint`}>
          <stop offset="0" stopColor="#FFFBEA" stopOpacity="0.95" />
          <stop offset="0.35" stopColor="#FFE7A3" stopOpacity="0.45" />
          <stop offset="1" stopColor="#FFD873" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-flare`}>
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="0.18" stopColor="#FFF4CC" stopOpacity="0.85" />
          <stop offset="0.5" stopColor="#FFD873" stopOpacity="0.28" />
          <stop offset="1" stopColor="#F5A70F" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-streak`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#FFE7A3" stopOpacity="0" />
          <stop offset="0.5" stopColor="#FFFBEA" stopOpacity="0.9" />
          <stop offset="1" stopColor="#FFE7A3" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-streakv`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE7A3" stopOpacity="0" />
          <stop offset="0.5" stopColor="#FFFBEA" stopOpacity="0.9" />
          <stop offset="1" stopColor="#FFE7A3" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${id}-skyclip`}>
          <rect x="0" y="0" width={W} height={HORIZON} />
        </clipPath>
        <clipPath id={`${id}-rows`}>
          {ROW_BANDS.map((r) => (
            <rect key={r.i} x="-200" y={r.y0} width={W + 400} height={r.y1 - r.y0} />
          ))}
        </clipPath>
      </defs>

      {/* Himmel und Sonnenglühen (atmet sehr langsam) */}
      <rect width={W} height={HORIZON} fill={u('sky')} />
      <g className="cp-breathe-op">
        <rect width={W} height={H} fill={u('glow')} />
      </g>

      {/* Sonne mit Korona und weichen Lichtfächern – steigt hinter dem Horizont auf */}
      <g clipPath={u('skyclip')}>
        <g className="cp-sunrise">
          <g className="cp-shafts" style={{ transformOrigin: `${VP.x}px ${HORIZON + 10}px` }}>
            {[-62, -34, -8, 18, 44].map((a, k) => {
              const rad = ((a - 90) * Math.PI) / 180;
              const len = 300;
              const spread = 0.07;
              const x1 = VP.x + len * Math.cos(rad - spread);
              const y1 = HORIZON + 10 + len * Math.sin(rad - spread);
              const x2 = VP.x + len * Math.cos(rad + spread);
              const y2 = HORIZON + 10 + len * Math.sin(rad + spread);
              return <polygon key={k} points={`${VP.x},${HORIZON + 10} ${x1},${y1} ${x2},${y2}`} fill={u('shaft')} opacity={k % 2 ? 0.7 : 1} />;
            })}
          </g>
          <circle cx={VP.x} cy={HORIZON + 10} r="110" fill={u('corona')} className="cp-corona" />
          <circle cx={VP.x} cy={HORIZON + 10} r="56" fill={u('sun')} />
        </g>
      </g>

      {/* Hügel in zwei Tiefen */}
      <path
        d={`M0 ${HORIZON - 8} C 120 ${HORIZON - 36}, 250 ${HORIZON - 12}, 370 ${HORIZON - 24} S 590 ${HORIZON - 6}, 760 ${HORIZON - 16} S 930 ${HORIZON - 32}, 1000 ${HORIZON - 14} V ${HORIZON + 1} H 0 Z`}
        fill="#0c2a55"
        opacity="0.85"
      />
      <path d={`M0 ${HORIZON - 2} C 200 ${HORIZON - 14}, 420 ${HORIZON - 2}, 600 ${HORIZON - 8} S 880 ${HORIZON - 2}, 1000 ${HORIZON - 6} V ${HORIZON + 1} H 0 Z`} fill="#13243a" />
      <line x1="0" y1={HORIZON} x2={W} y2={HORIZON} stroke="#FFD873" strokeOpacity="0.5" strokeWidth="1" />

      {/* Wiese */}
      <rect x="0" y={HORIZON} width={W} height={H - HORIZON} fill={u('ground')} />

      {/* Modultische */}
      {ROW_BANDS.map((r) => (
        <g key={r.i}>
          {/* Gestell und Schlagschatten auf der Wiese */}
          <rect x="-200" y={r.y1} width={W + 400} height={Math.max(0.6, r.y2 - r.y1)} fill="#050c08" opacity="0.75" />
          {/* Modulfläche */}
          <rect x="-200" y={r.y0} width={W + 400} height={r.y1 - r.y0} fill={u('cell')} />
          {/* Mittelfuge (zwei Module übereinander) */}
          <line x1="-200" y1={(r.y0 + r.y1) / 2} x2={W + 200} y2={(r.y0 + r.y1) / 2} stroke="#0a1c3a" strokeOpacity="0.8" strokeWidth={0.4 + r.i * 0.18} />
          {/* Rahmenkante oben fängt das Morgenlicht */}
          <line x1="-200" y1={r.y0} x2={W + 200} y2={r.y0} stroke="#cfe0f5" strokeOpacity={0.2 + r.i * 0.05} strokeWidth={0.5 + r.i * 0.22} />
        </g>
      ))}
      <g clipPath={u('rows')}>
        {/* Modulkanten (Aluminiumrahmen) */}
        {RAYS.map((x, k) => (
          <line key={k} x1={rayX(x, HORIZON + 4)} y1={HORIZON + 4} x2={x} y2={BOTTOM} stroke="#0a1c3a" strokeOpacity="0.85" strokeWidth="1.3" />
        ))}
        {/* Wartungsgassen: Wiese zwischen den Tischen sichtbar */}
        {AISLES.map((x, k) => (
          <polygon key={k} points={`${VP.x},${VP.y} ${x - AISLE_W / 2},${BOTTOM} ${x + AISLE_W / 2},${BOTTOM}`} fill={u('ground')} />
        ))}
        {/* Spiegelung der Sonne: Lichtbahn zum Betrachter (atmet) */}
        <g className="cp-breathe-op">
          <polygon points={`${VP.x - 6},${HORIZON} ${VP.x - 175},${BOTTOM} ${VP.x + 135},${BOTTOM} ${VP.x + 6},${HORIZON}`} fill={u('beam')} />
        </g>
        {/* Signatur 2: das Licht rollt Tisch für Tisch nach vorn (~4 s) */}
        {ROW_BANDS.map((r) => (
          <rect
            key={r.i}
            x={VP.x - 380 - r.i * 60}
            y={r.y0}
            width={760 + r.i * 120}
            height={r.y1 - r.y0}
            fill={u('rowlight')}
            className="cp-rowlight"
            style={delay(ROLL_START + r.i * ROLL_STEP)}
          />
        ))}
        {/* Signatur 4: weicher Reflex gleitet die Lichtbahn entlang */}
        <g className="cp-glide">
          <ellipse cx="0" cy="0" rx="34" ry="9" fill={u('glint')} />
        </g>
      </g>

      {/* Dunst am Horizont verbirgt das Zusammenlaufen der Kanten */}
      <rect x="0" y={HORIZON} width={W} height="110" fill={u('haze')} />

      {/* Signatur 3: erster Strahl trifft die vorderste Reihe – Lichtblitz mit Glanzstreif */}
      <g transform={`translate(${FLARE.x} ${FLARE.y})`}>
        <g className="cp-flare" style={delay(FLARE_AT)}>
          <circle r="120" fill={u('flare')} />
          <rect x="-420" y="-3.5" width="840" height="7" rx="3.5" fill={u('streak')} />
          <rect x="-2.5" y="-80" width="5" height="160" rx="2.5" fill={u('streakv')} opacity="0.6" />
        </g>
      </g>
    </svg>
  );
}
