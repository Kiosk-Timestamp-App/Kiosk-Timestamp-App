import { MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { delay, fmtNum, prefersReducedMotion } from '../../design/hooks';
import { CLAIM, FIGURE_DISPLAY, KEY_FIGURES, KEY_FIGURES_STAND } from './facts';
import { SunriseScene } from './SunriseScene';
import { Card, StandNote } from './ui';

/**
 * Zählt beim Kapiteleintritt weich hoch (easeOutExpo); Format über den gemeinsamen `fmtNum` (de-AT, CLDR),
 * damit alle Bildschirme Zahlen gleich schreiben.
 */
function FigureCount({ value, durationMs = 1800 }: { value: number; durationMs?: number }) {
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? value : 0));
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setShown(value * (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);
  return <span className="tabular">{fmtNum(Math.round(shown), 0)}</span>;
}

/** Leistung wahlweise als kWp (Website-Wortlaut) oder MWp (Fachnorm) – Umschaltung nach Kundenbestätigung in facts.ts */
function figureValue(f: (typeof KEY_FIGURES)[number]) {
  if (f.key === 'capacity' && FIGURE_DISPLAY.capacityUnit === 'MWp') return { value: f.value / 1000, unit: 'MWp' };
  return { value: f.value, unit: f.unit };
}

/** Kapitel 1: Claim über dem lebendigen Sonnenaufgang (Signatur-Animation), Kennzahlen im Vordergrund */
export function ChapterHero({ wide, showStandFigures }: { wide: boolean; showStandFigures: boolean }) {
  const figures = KEY_FIGURES.filter((f) => showStandFigures || !f.stand);
  return (
    <Card className="flex h-full min-h-0 flex-col">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[45%] bg-[linear-gradient(180deg,rgb(3_18_43/0.55),transparent)]" />

      {wide ? (
        /* Querformat: Text links, Szene rechts über die volle Höhe (links weich ausgeblendet) – Text liegt nie über dem Modulfeld */
        <div className="relative flex min-h-0 flex-1">
          <div className="pointer-events-none absolute inset-y-0 right-0 w-[64%] [mask-image:linear-gradient(90deg,transparent,black_28%)]">
            <SunriseScene className="absolute inset-0 size-full" />
          </div>
        <div className={`relative z-10 ${wide ? 'max-w-[56%] p-[2em_2.4em_1.4em]' : 'p-[2.4em_2.4em_0]'}`}>
          <div className="eyebrow ov-rise" style={delay(120)}>
            Ihr Partner vor Ort
          </div>
          <h2
            className={`ov-rise mt-[0.4em] font-[var(--font-display)] font-extrabold leading-[0.98] tracking-[-0.04em] text-white ${
              wide ? 'text-[4.2em]' : 'text-[5em]'
            }`}
            style={delay(200)}
          >
            {CLAIM.lead} <span className="cp-hl text-gradient-sun">{CLAIM.highlight}</span> {CLAIM.tail}
          </h2>
          <p className={`ov-rise mt-[0.65em] font-semibold text-white/90 ${wide ? 'text-[1.55em]' : 'text-[1.8em]'}`} style={delay(320)}>
            {CLAIM.sub}
          </p>
          <p className={`ov-rise mt-[0.7em] inline-flex items-center gap-[0.5em] font-medium text-white/80 ${wide ? 'text-[1.25em]' : 'text-[1.4em]'}`} style={delay(400)}>
            <MapPin className="size-[1.05em] shrink-0 text-[#AED083]" strokeWidth={2} />
            {CLAIM.tvSub}
          </p>
        </div>

        </div>
      ) : (
        <>
        <div className={`relative z-10 ${wide ? 'max-w-[56%] p-[2em_2.4em_1.4em]' : 'p-[2.4em_2.4em_0]'}`}>
          <div className="eyebrow ov-rise" style={delay(120)}>
            Ihr Partner vor Ort
          </div>
          <h2
            className={`ov-rise mt-[0.4em] font-[var(--font-display)] font-extrabold leading-[0.98] tracking-[-0.04em] text-white ${
              wide ? 'text-[4.2em]' : 'text-[5em]'
            }`}
            style={delay(200)}
          >
            {CLAIM.lead} <span className="cp-hl text-gradient-sun">{CLAIM.highlight}</span> {CLAIM.tail}
          </h2>
          <p className={`ov-rise mt-[0.65em] font-semibold text-white/90 ${wide ? 'text-[1.55em]' : 'text-[1.8em]'}`} style={delay(320)}>
            {CLAIM.sub}
          </p>
          <p className={`ov-rise mt-[0.7em] inline-flex items-center gap-[0.5em] font-medium text-white/80 ${wide ? 'text-[1.25em]' : 'text-[1.4em]'}`} style={delay(400)}>
            <MapPin className="size-[1.05em] shrink-0 text-[#AED083]" strokeWidth={2} />
            {CLAIM.tvSub}
          </p>
        </div>


          {/* Hochformat: Szene füllt den Raum zwischen Text und Kennzahlen; der Himmel reicht hinter den Text */}
          <div className="relative min-h-[8em] flex-1">
            <SunriseScene className="pointer-events-none absolute inset-x-0 bottom-0 h-[calc(100%+8em)] w-full" />
          </div>
        </>
      )}

      {/* Kennzahlen-Leiste unter der Szene – verdeckt das Modulfeld nicht */}
      <div className={`relative z-10 border-t border-white/10 bg-[#03122b]/92 ${wide ? 'p-[1em_2.4em_1em]' : 'p-[1.1em_2.4em_1.2em]'}`}>
        <div className="grid gap-[1em]" style={{ gridTemplateColumns: `repeat(${figures.length}, minmax(0, 1fr))` }}>
          {figures.map((f, i) => {
            const v = figureValue(f);
            return (
              <div
                key={f.key}
                className="ov-rise flex min-w-0 flex-col justify-start"
                style={delay(900 + i * 160)}
              >
                <div className="flex items-baseline gap-[0.2em] whitespace-nowrap">
                  <span className={`num-display leading-none ${f.stand ? 'ov-text-brand' : 'text-white'} ${wide ? 'text-[2.5em]' : 'text-[2.5em]'}`}>
                    <FigureCount value={v.value} />
                  </span>
                  {v.unit && <span className="text-[1.15em] font-bold text-white/70">{v.unit}</span>}
                </div>
                <div className="mt-[0.35em] text-[1.05em] font-medium leading-snug text-white/85">
                  {f.label}
                  {f.stand && <sup className="ml-[0.2em] text-[0.8em] font-bold text-[#FFD873]">*</sup>}
                </div>
              </div>
            );
          })}
        </div>
        {showStandFigures && (
          <StandNote className="ov-rise mt-[0.6em] text-white/70">
            <span className="font-bold text-[#FFD873]">*</span> {KEY_FIGURES_STAND}
          </StandNote>
        )}
      </div>
    </Card>
  );
}
