import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import KioskDisplay from './KioskDisplay';
import { SystemBand } from '../components/KioskMultiDisplay/SystemBand';
import { useScreenActivation } from '../components/KioskMultiDisplay/useScreenActivation';
import { baseUrlOf, intervalMsOf, type SystemConfiguration } from '../components/KioskMultiDisplay/systems';
import { MULTI_CSS } from '../components/KioskMultiDisplay/styles';
import { LogoMark } from '../design/primitives';
import { tr } from '../design/hooks';

interface KioskMultiDisplayProps {
  isFullscreen: boolean;
  screenWidth: number;
  screenHeight: number;
  aspectRatio: number;
  configurations: SystemConfiguration[];
  onSystemChange?: (config: { company_name: string; place: string }) => void;
  language: string | null;
}

/** Nächste Anlage wird so lange vorher unsichtbar geladen, damit sie beim Wechsel schon Daten zeigt */
const PRELOAD_MS = 6000;
/** Dauer, bis die ausblendende Anlage entfernt wird */
const LEAVE_MS = 1100;
/** Dauer der Wechsel-Effekte (Einflug, Lichtstreif, Titelkarte) */
const FX_MS = 2600;

type Role = 'cur' | 'out' | 'pre';

/**
 * Multi-Anlagen-Ansicht: zeigt nacheinander den vollständigen Kiosk-Hauptbildschirm
 * jeder konfigurierten Anlage (über deren API-Basis), mit Anlagen-Band und
 * filmischem Wechsel (alte Anlage gleitet hinaus, neue – bereits vorgeladen – herein).
 */
export const KioskMultiDisplay: React.FC<KioskMultiDisplayProps> = (props) => {
  const { ref, active, round } = useScreenActivation();
  return (
    <div ref={ref} className="h-full text-[1.5vmin] text-white">
      <style>{MULTI_CSS}</style>
      {props.configurations.length > 0 ? <Rotation key={round} {...props} active={active} /> : <InvalidConfig language={props.language} />}
    </div>
  );
};

function Rotation({
  configurations,
  onSystemChange,
  language,
  screenWidth,
  screenHeight,
  aspectRatio,
  active,
}: KioskMultiDisplayProps & { active: boolean }) {
  const count = configurations.length;
  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState<number | null>(null);
  const [preload, setPreload] = useState(false);
  const [fx, setFx] = useState(false);
  const [startedAt, setStartedAt] = useState(() => Date.now());

  // Liste kann sich per Polling ändern → Index immer gültig halten
  const cur = index % count;
  const config = configurations[cur];
  const ms = intervalMsOf(config);
  const next = (cur + 1) % count;

  // Wechsel-Takt (nur solange der Bildschirm sichtbar ist)
  useEffect(() => {
    if (!active || count <= 1) return;
    const tPre = setTimeout(() => setPreload(true), Math.max(0, ms - PRELOAD_MS));
    const tNext = setTimeout(() => {
      setLeaving(cur);
      setFx(true);
      setIndex((cur + 1) % count);
      setPreload(false);
      setStartedAt(Date.now());
    }, ms);
    return () => {
      clearTimeout(tPre);
      clearTimeout(tNext);
    };
  }, [active, count, cur, ms]);

  useEffect(() => {
    if (leaving === null) return;
    const t = setTimeout(() => setLeaving(null), LEAVE_MS);
    return () => clearTimeout(t);
  }, [leaving]);

  useEffect(() => {
    if (!fx) return;
    const t = setTimeout(() => setFx(false), FX_MS);
    return () => clearTimeout(t);
  }, [fx, cur]);

  // App.tsx informieren (Kopfzeile zeigt Firma & Ort)
  const { company_name, place } = config;
  useEffect(() => {
    onSystemChange?.({ company_name, place });
  }, [company_name, place, onSystemChange]);

  // Ebenen in fester Reihenfolge (nach Index) → React verschiebt keine DOM-Knoten, Diagramme bleiben erhalten
  const roles = new Map<number, Role>();
  if (leaving !== null && leaving !== cur && leaving < count) roles.set(leaving, 'out');
  if (preload && count > 1 && !roles.has(next)) roles.set(next, 'pre');
  roles.set(cur, 'cur');
  const layers = [...roles.entries()].sort((a, b) => a[0] - b[0]);
  const switching = fx;

  // Band/Name erst umschalten, wenn die neue Anlage deckend eingeblendet ist (Eintritt 420 ms + Einblendung)
  const [bandCur, setBandCur] = useState(cur);
  useEffect(() => {
    if (bandCur === cur) return;
    const t = setTimeout(() => setBandCur(cur), switching ? 950 : 0);
    return () => clearTimeout(t);
  }, [cur, bandCur, switching]);
  const bandIndex = bandCur < count ? bandCur : cur;

  return (
    <div className="relative flex h-full flex-col gap-[1.1vmin]">
      <SystemBand configurations={configurations} current={bandIndex} startedAt={startedAt} active={active} language={language} hideName={switching} />

      <div className="relative min-h-0 flex-1">
        {layers.map(([i, role]) => {
          const c = configurations[i];
          const cls = role === 'pre' ? 'ov-ms-pre' : role === 'out' ? 'ov-ms-out' : switching ? 'ov-ms-enter' : '';
          return (
            <div
              key={`${i}-${c.name}`}
              className={`ov-ms-layer ${cls}`}
              style={{ zIndex: role === 'cur' ? 2 : role === 'out' ? 1 : 0 }}
              aria-hidden={role !== 'cur'}
            >
              <KioskDisplay screenWidth={screenWidth} screenHeight={screenHeight} aspectRatio={aspectRatio} language={language} apiBase={baseUrlOf(c)} />
            </div>
          );
        })}

        {switching && (
          <>
            <div key={`sweep-${cur}`} className="ov-ms-sweep" aria-hidden />
          </>
        )}
      </div>

      {/* Titelkarte beim Wechsel: liegt über dem Anlagen-Band, verdeckt keine Inhalte der Anlage */}
      {switching && (
            <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center" aria-hidden>
              <div key={`card-${cur}`} className="ov-ms-card flex max-w-[92%] items-center gap-[1em] rounded-[28px] border border-white/15 bg-[#06172f] px-[1.8em] py-[0.7em] shadow-[0_30px_80px_-20px_rgb(0_0_0/0.6)]">
                <LogoMark size={48} className="shrink-0" />
                <div className="min-w-0">
                  <div className="eyebrow text-[0.75em]">
                    {tr(language, { DE: 'Anlage', EN: 'System', IT: 'Impianto', FR: 'Installation', SQ: 'Sistemi' })} {String(cur + 1).padStart(2, '0')}
                  </div>
                  <div className={`mt-[0.15em] line-clamp-2 font-extrabold leading-[1.1] tracking-[-0.02em] ${config.company_name.length > 30 ? 'text-[1.5em]' : 'text-[1.9em]'}`} style={{ fontFamily: 'var(--font-display)' }}>
                    {config.company_name}
                  </div>
                </div>
              </div>
            </div>
      )}
    </div>
  );
}

function InvalidConfig({ language }: { language: string | null }) {
  return (
    <div className="grid h-full place-items-center">
      <div className="ov-glass flex max-w-[34em] flex-col items-center gap-[1em] rounded-[32px] px-[3em] py-[2.6em] text-center">
        <span className="grid size-[4em] place-items-center rounded-[20px] bg-[#f0574b]/15 text-[#ff9c92] ring-1 ring-[#f0574b]/40">
          <AlertTriangle className="size-[55%]" strokeWidth={2.2} aria-hidden />
        </span>
        <span className="eyebrow text-[0.8em]" style={{ color: '#ff9c92' }}>
          {tr(language, { DE: 'Konfiguration', EN: 'Configuration', IT: 'Configurazione', FR: 'Configuration', SQ: 'Konfigurimi' })}
        </span>
        <h3 className="text-[2em] font-extrabold leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
          {tr(language, { DE: 'Keine gültige Anlage', EN: 'No valid system', IT: 'Nessun impianto valido', FR: 'Aucune installation valide', SQ: 'Nuk ka sistem të vlefshëm' })}
        </h3>
        <p className="text-[1.05em] text-white/65">
          {tr(language, {
            DE: 'Bitte die Anlagen in den Kiosk-Einstellungen prüfen.',
            EN: 'Please check the systems in the kiosk settings.',
            IT: 'Controllare gli impianti nelle impostazioni del kiosk.',
            FR: 'Veuillez vérifier les installations dans les paramètres du kiosque.',
            SQ: 'Ju lutem kontrolloni sistemet në cilësimet e kioskut.',
          })}
        </p>
      </div>
    </div>
  );
}

export default KioskMultiDisplay;
