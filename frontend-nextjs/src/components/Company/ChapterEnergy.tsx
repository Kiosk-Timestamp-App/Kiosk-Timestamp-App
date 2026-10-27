import type { CSSProperties } from 'react';
import { BatteryCharging, Building2, PlugZap, Sun, TrendingUp, Users } from 'lucide-react';
import { delay } from '../../design/hooks';
import { ENERGY } from './facts';
import { Card } from './ui';

const ICONS = { store: BatteryCharging, charge: PlugZap, share: Users, market: TrendingUp } as const;
const TONES = ['#8CBA58', '#5B94E0', '#AED083', '#FFD873'];
const XS = [12.5, 37.5, 62.5, 87.5];

/** Systemdiagramm: Sonne → Betrieb → vier Nutzungen (Linien in %-Koordinaten, Knoten als HTML) */
function FlowDiagram({ wide }: { wide: boolean }) {
  const hubY = wide ? 46 : 46;
  const branch = (x: number) => `M50 ${hubY + 8} V${hubY + 18} C50 ${hubY + 30}, ${x} ${hubY + 22}, ${x} ${hubY + 36} V100`;
  return (
    <div className="relative min-h-0 flex-1">
      <svg className="absolute inset-0 size-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" fill="none" aria-hidden>
        <defs>
          <linearGradient id="cp-sunline" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFD873" />
            <stop offset="1" stopColor="#AED083" />
          </linearGradient>
        </defs>
        {/* Sonne → Gebäude */}
        <path d={`M50 14 V${hubY - 8}`} stroke="url(#cp-sunline)" strokeOpacity="0.35" strokeWidth="2" vectorEffect="non-scaling-stroke" pathLength={1} className="cp-draw" style={delay(300)} />
        <path d={`M50 14 V${hubY - 8}`} stroke="#FFE7A3" strokeWidth="4" strokeLinecap="round" vectorEffect="non-scaling-stroke" pathLength={7} className="cp-flow" />
        {XS.map((x, i) => (
          <g key={x}>
            <path d={branch(x)} stroke={TONES[i]} strokeOpacity="0.32" strokeWidth="2" vectorEffect="non-scaling-stroke" pathLength={1} className="cp-draw" style={delay(700 + i * 140)} />
            <path
              d={branch(x)}
              stroke={TONES[i]}
              strokeWidth="4"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              pathLength={21}
              className="cp-flow"
              style={{ animationDelay: `${-i * 0.45}s` } as CSSProperties}
            />
          </g>
        ))}
      </svg>

      {/* Sonne */}
      <div className="absolute left-1/2 top-[14%] -translate-x-1/2 -translate-y-1/2">
        <div className="cp-pop relative" style={delay(150)}>
          <span className="cp-ring absolute inset-0 rounded-full border border-[#FFD873]/60" />
          <span className="relative grid size-[4.2em] place-items-center rounded-full border border-[#FFD873]/40 bg-[radial-gradient(circle_at_35%_30%,rgb(255_216_115/0.35),rgb(245_167_15/0.12)_60%,rgb(3_18_43/0.6))]">
            <Sun className="size-[2em] text-[#FFD873]" strokeWidth={1.7} />
          </span>
        </div>
      </div>
      <span className="ov-rise absolute left-[calc(50%+3em)] top-[14%] -translate-y-1/2 whitespace-nowrap" style={delay(260)}>
        <span className="block text-[1em] font-semibold text-[#FFE7A3]">{ENERGY.source}</span>
      </span>

      {/* Betrieb */}
      <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ top: `${hubY}%` }}>
        <span className="cp-pop ov-tile-brand relative grid size-[5em] place-items-center rounded-[1.4em]" style={delay(420)}>
          <Building2 className="size-[2.3em] text-white" strokeWidth={1.7} />
        </span>
      </div>
      <span className="ov-rise absolute left-[calc(50%+3.6em)] -translate-y-1/2 whitespace-nowrap" style={{ top: `${hubY}%`, ...delay(520) }}>
        <span className="block max-w-[11em] whitespace-normal font-[var(--font-display)] text-[1.15em] font-extrabold leading-tight text-white">{ENERGY.hub}</span>
      </span>

      {/* „Was übrig bleibt“ – an der Verzweigung */}
      <span className="ov-rise eyebrow-plain absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#0a1f45] px-[0.8em] py-[0.2em] text-[#C9D1DE]" style={{ top: `${hubY + 19}%`, ...delay(900) }}>
        {ENERGY.rest}
      </span>

      {/* Endknoten */}
      {ENERGY.uses.map((u, i) => {
        const Icon = ICONS[u.key];
        return (
          <div key={u.key} className="absolute bottom-0 -translate-x-1/2 translate-y-1/2" style={{ left: `${XS[i]}%` }}>
            <span
              className="cp-pop grid size-[3.6em] place-items-center rounded-full border-2 bg-[#0a1f45]"
              style={{ borderColor: TONES[i], ...delay(1100 + i * 160) }}
            >
              <Icon className="size-[1.7em]" style={{ color: TONES[i] }} strokeWidth={1.8} />
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function ChapterEnergy({ wide }: { wide: boolean }) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-[1em]">
      <Card className={`flex min-h-0 flex-1 flex-col ${wide ? 'p-[1.6em_2.2em_1.4em]' : 'p-[2em_2.2em_1.6em]'}`}>
        <div className="eyebrow">{ENERGY.eyebrow}</div>
        <h2 className={`mt-[0.35em] font-[var(--font-display)] font-extrabold leading-[1.04] tracking-[-0.035em] text-white ${wide ? 'text-[2.6em]' : 'text-[3em]'}`}>
          {ENERGY.title.lead} <span className="cp-hl text-gradient-sun">{ENERGY.title.highlight}</span>
        </h2>

        <div className={`mx-auto flex w-full min-h-0 flex-1 flex-col ${wide ? 'mb-[1.9em] mt-[0.4em]' : 'mb-[3em] mt-[0.6em]'}`}>
          <div className={`flex min-h-0 flex-1 flex-col ${wide ? 'text-[1em]' : 'text-[1.28em]'}`}>
            <FlowDiagram wide={wide} />
          </div>
        </div>

        <ul className="grid grid-cols-4 gap-[1.1em]">
          {ENERGY.uses.map((u, i) => (
            <li key={u.key} className="ov-rise min-w-0 text-center" style={delay(1300 + i * 160)}>
              <div className={`font-[var(--font-display)] font-extrabold text-white ${wide ? 'text-[1.45em]' : 'text-[1.6em]'}`}>{u.title}</div>
              <div className="mt-[0.1em] text-[0.95em] font-semibold" style={{ color: TONES[i] }}>
                {u.sub}
              </div>
              <p className={`mt-[0.35em] leading-[1.38] text-white/80 ${wide ? 'text-[1.12em]' : 'text-[1.15em]'}`}>{u.text}</p>
              <span className="mx-auto mt-[0.6em] block h-[3px] w-[2.4em] rounded-full" style={{ background: TONES[i] }} />
            </li>
          ))}
        </ul>
      </Card>

    </div>
  );
}
