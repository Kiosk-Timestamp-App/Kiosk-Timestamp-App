import { useEffect, useMemo, useRef, useState } from 'react';
import { ReplayContext, tr, useNow, useScreenActive } from '../design/hooks';
import { ChapterHero } from '../components/Company/ChapterHero';
import { ChapterEnergy } from '../components/Company/ChapterEnergy';
import { ChapterOperator } from '../components/Company/ChapterOperator';
import { ChapterProcess } from '../components/Company/ChapterProcess';
import { ChapterService } from '../components/Company/ChapterService';
import { ContactCard } from '../components/Company/ContactCard';
import { FUNDING, KEY_FIGURES_REVIEW_BY } from '../components/Company/facts';
import type { FundingCallState } from '../components/Company/Funding';
import { useCompanyWebsite, useStageBox } from '../components/Company/useCompanyHooks';
import { isStillValid, openStatus } from '../components/Company/viennaTime';
import '../components/Company/company.css';

/**
 * Kapitel mit eigener Dauer nach Textmenge (≈ 3 Wörter/s plus Zeit für die Grafik):
 * kurze Kapitel 12–14 s, dichte Kapitel (Energie, Ablauf, Service) 20–22 s.
 */
const CHAPTERS = [
  { key: 'about', ms: 12000, label: { DE: 'Über uns', EN: 'About us' } },
  { key: 'operator', ms: 14000, label: { DE: 'Betreiber', EN: 'Operator' } },
  { key: 'energy', ms: 22000, label: { DE: 'Energie', EN: 'Energy' } },
  { key: 'process', ms: 20000, label: { DE: 'Ablauf', EN: 'Process' } },
  { key: 'service', ms: 22000, label: { DE: 'Service', EN: 'Service' } },
] as const;

/** Gesamtdauer eines Umlaufs (90 s) – als Bildschirmdauer in App.tsx verwenden */
export const COMPANY_CYCLE_MS = CHAPTERS.reduce((sum, c) => sum + c.ms, 0);

/** Startkapitel – optional per URL-Parameter `?chapter=2` (Vorschau/Abnahme), sonst Kapitel 1 */
const startChapter = () => {
  const n = Number(new URLSearchParams(window.location.search).get('chapter'));
  return Number.isInteger(n) && n >= 1 && n <= CHAPTERS.length ? n - 1 : 0;
};

/**
 * „ÖKOVOLT – Ihr Partner vor Ort“: Unternehmen und nächste Schritte für Kundinnen und Kunden.
 * Fünf Kapitel rotieren (Über uns · Betreiber · Energie nutzen · Ablauf & Förderung · Service), die Kontaktkarte mit Live-Öffnungsstatus
 * und QR-Codes („Termin buchen“, „Ersteinschätzung anfordern“) bleibt dauerhaft sichtbar.
 * Alle Inhalte wörtlich von der Website, zeitgebundene Angaben mit Stand und automatischem Ablauf.
 */
export default function CompanyInfo({ language }: { language: string | null }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const active = useScreenActive(rootRef);
  const { wide, fontPx } = useStageBox(rootRef);
  const now = useNow(30000);

  const [chapter, setChapter] = useState(startChapter);
  const [prevChapter, setPrevChapter] = useState<number | null>(null);
  const [visits, setVisits] = useState<number[]>(() => CHAPTERS.map((_, i) => (i === startChapter() ? 1 : 0)));

  // Bei jedem Bildschirm-Eintritt wieder mit Kapitel 1 beginnen (State-Anpassung während des Renderns)
  const [wasActive, setWasActive] = useState(active);
  if (active !== wasActive) {
    setWasActive(active);
    if (active) {
      setPrevChapter(chapter === 0 ? null : chapter);
      setChapter(0);
      setVisits((v) => v.map((n, i) => (i === 0 ? n + 1 : n)));
    }
  }

  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => {
      const next = (chapter + 1) % CHAPTERS.length;
      setPrevChapter(chapter);
      setChapter(next);
      setVisits((v) => v.map((n, i) => (i === next ? n + 1 : n)));
    }, CHAPTERS[chapter].ms);
    return () => clearTimeout(t);
  }, [chapter, active, visits]);

  const status = useMemo(() => openStatus(now), [now]);
  const fundingItems = useMemo(() => FUNDING.items.filter((it) => isStillValid(now, it.until)), [now]);
  // 3. EAG-Fördercall: „Nächster …“ vor Beginn, „läuft: Anträge bis …“ während der Laufzeit, danach ausgeblendet
  const fundingCall: FundingCallState =
    fundingItems.length === 0 || !isStillValid(now, FUNDING.call.until) ? null : isStillValid(now, FUNDING.call.from) ? 'upcoming' : 'running';
  const showStandFigures = isStillValid(now, KEY_FIGURES_REVIEW_BY);
  const website = useCompanyWebsite();

  const stateOf = (i: number) => (i === chapter ? 'active' : i === prevChapter ? 'before' : 'after');

  const nav = (
    <nav className="flex shrink-0 items-stretch gap-[0.8em]" aria-label="Kapitel">
      {CHAPTERS.map((c, i) => {
        const on = i === chapter;
        return (
          <div key={c.key} className="min-w-0 flex-1">
            <div className="flex items-baseline gap-[0.6em]" style={{ fontSize: 'max(16px, 1em)' }}>
              <span className={`num-display text-[1.05em] ${on ? 'text-[#AED083]' : 'text-[#B4BFD0]'}`}>0{i + 1}</span>
              <span className={`eyebrow-plain truncate ${on ? 'text-white' : 'text-[#D3DAE6]'}`} style={{ fontSize: '1em' }}>{tr(language, c.label)}</span>
            </div>
            <div className="mt-[0.5em] h-[4px] overflow-hidden rounded-full bg-white/10">
              {on && (
                <span
                  key={`${i}-${visits[i]}`}
                  className="cp-progress block h-full rounded-full bg-[linear-gradient(90deg,#669933,#AED083_60%,#FFD873)]"
                  style={{ animationDuration: `${c.ms}ms` }}
                />
              )}
              {!on && i < chapter && <span className="block h-full w-full rounded-full bg-white/30" />}
            </div>
          </div>
        );
      })}
    </nav>
  );

  const stage = (
    <div className="relative min-h-0 flex-1">
      {CHAPTERS.map((c, i) => (
        <div key={c.key} className="cp-chapter" data-state={stateOf(i)} aria-hidden={i !== chapter}>
          {visits[i] > 0 && (
            <ReplayContext.Provider value={visits[i]}>
              <div key={visits[i]} className="h-full">
                {i === 0 && <ChapterHero wide={wide} showStandFigures={showStandFigures} />}
                {i === 1 && <ChapterOperator wide={wide} />}
                {i === 2 && <ChapterEnergy wide={wide} />}
                {i === 3 && <ChapterProcess wide={wide} fundingItems={fundingItems} fundingCall={fundingCall} website={website} />}
                {i === 4 && <ChapterService wide={wide} />}
              </div>
            </ReplayContext.Provider>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div
      ref={rootRef}
      className="cp-root h-full w-full overflow-hidden font-sans text-white"
      data-paused={!active}
      style={{ fontSize: `${fontPx}px` }}
    >
      {wide ? (
        <div className="flex h-full flex-col gap-[0.9em]">
          {nav}
          <div className="grid min-h-0 flex-1 grid-cols-[1fr_29em] gap-[1em]">
            {stage}
            <ContactCard wide status={status} website={website} />
          </div>
        </div>
      ) : (
        <div className="flex h-full flex-col gap-[1em]">
          {nav}
          {stage}
          <ContactCard wide={false} status={status} website={website} />
        </div>
      )}
    </div>
  );
}
