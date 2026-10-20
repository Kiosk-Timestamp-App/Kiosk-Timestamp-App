import React from 'react';
import { useLogoAndWebsite } from '../../hooks/useLogoAndWebsite';
import { useLocalizedTime } from '../../hooks/useLocalizedTime';
import BrandLogo from '../../assets/logo-oekovolt-dark.png';
import { LiveClock, LivePill } from '../../design/primitives';
import { delay, tr } from '../../design/hooks';
import { useOwnLive } from '../../design/status';
import { fmtClock } from '../../design/daylight';

interface HeaderSectionProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  currentSystemConfig?: {
    company_name: string;
    place: string;
  } | null;
  language: string | null;
  /** aktiver App-Bildschirm → passende Eyebrow; „Live“ nur auf dem Kiosk und nur bei frischen Daten */
  screen?: string;
}

type Words = { DE: string; EN?: string; IT?: string; FR?: string; SQ?: string };

const SCREEN_EYEBROW: Record<string, Words> = {
  map: { DE: 'Energie auf der Karte', EN: 'Energy on the map', IT: 'Energia sulla mappa', FR: "L'énergie sur la carte", SQ: 'Energjia në hartë' },
  insights: { DE: 'Energie verstehen', EN: 'Understanding energy', IT: "Capire l'energia", FR: "Comprendre l'énergie", SQ: 'Të kuptosh energjinë' },
  company: { DE: 'Über ÖKOVOLT', EN: 'About ÖKOVOLT', IT: 'Chi è ÖKOVOLT', FR: 'À propos d’ÖKOVOLT', SQ: 'Rreth ÖKOVOLT' },
  ads: { DE: 'Angebote & Service', EN: 'Offers & service', IT: 'Offerte e servizi', FR: 'Offres & service', SQ: 'Oferta & shërbime' },
  multiSystem: { DE: 'Referenzanlagen im Überblick', EN: 'Reference systems', IT: 'Impianti di riferimento', FR: 'Installations de référence', SQ: 'Sisteme referuese' },
};

/**
 * Kopfzeile der Navy-Bühne: Logo | Eyebrow (je Bildschirm) + Claim · rechts Status und Uhr.
 * „Live“ erscheint nur auf dem Kiosk-Bildschirm und nur, wenn die Daten der eigenen Anlage frisch sind;
 * sonst „Stand HH:MM“ bzw. „Verbindung unterbrochen“ (Punkt + Text, nie nur Farbe).
 */
const Header: React.FC<HeaderSectionProps> = ({ language, screen = 'kiosk' }) => {
  const { data } = useLogoAndWebsite();
  const { formattedDate } = useLocalizedTime(language);
  const live = useOwnLive();
  const logo = data?.kiosk_logo || BrandLogo;
  const L = (t: Words) => tr(language, t);
  const onKiosk = screen === 'kiosk';
  const time = live.at ? fmtClock(new Date(live.at)) : '';

  let eyebrow: string;
  let eyebrowCls = 'eyebrow text-[0.8em]';
  if (!onKiosk) eyebrow = L(SCREEN_EYEBROW[screen] ?? { DE: 'ÖKOVOLT Solartechnik' });
  else if (live.kind === 'live') {
    eyebrow = L({ DE: 'Live aus der Solaranlage', EN: 'Live from the solar system', IT: "In diretta dall'impianto", FR: "En direct de l'installation", SQ: 'Live nga sistemi diellor' });
    eyebrowCls += ' ov-live';
  } else if (live.kind === 'stale') {
    eyebrow = `${L({ DE: 'Solaranlage · Stand', EN: 'Solar system · as of', IT: 'Impianto · aggiornato', FR: 'Installation · état à', SQ: 'Sistemi · gjendja' })} ${time}`;
    eyebrowCls += ' text-[#ffd873]';
  } else if (live.kind === 'offline') {
    eyebrow = L({ DE: 'Verbindung zur Anlage unterbrochen', EN: 'Connection to system interrupted', IT: "Connessione all'impianto interrotta", FR: "Connexion à l'installation interrompue", SQ: 'Lidhja me sistemin u ndërpre' });
    eyebrowCls += ' text-[#ffd873]';
  } else eyebrow = L({ DE: 'Solaranlage', EN: 'Solar system', IT: 'Impianto solare', FR: 'Installation solaire', SQ: 'Sistemi diellor' });

  return (
    <header className={`ov-scale ${screen === 'ads' ? 'ov-calm' : ''} flex items-center justify-between gap-[2vw] px-[0.4vw] pb-[0.6vh] text-[calc(0.55vw+0.35vh)] portrait:text-[calc(0.78vw+0.45vh)]`}>
      <div className="flex min-w-0 items-center gap-[1.4vw]">
        <img
          src={logo}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = BrandLogo;
          }}
          className="ov-enter-down h-[calc(2.4vh+1.3vw)] w-auto max-w-[16vw] object-contain"
          alt="Logo"
        />
        <span className="ov-fade h-[calc(3vh+1.6vw)] w-px bg-white/15" style={delay(120)} />
        <div className="ov-enter-down min-w-0" style={delay(160)}>
          <div key={eyebrow} className={`${eyebrowCls} ov-fade`}>
            {eyebrow}
          </div>
          {/* leading 1.2 + pb: Unterlängen (g, y) werden von truncate nicht abgeschnitten */}
          <h1 className="mt-[0.15em] truncate pb-[0.08em] text-[2.15em] leading-[1.2] text-white">
            Power of <span className="text-gradient-sun">green energy</span>
          </h1>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-[1.4vw]">
        {onKiosk && live.kind === 'live' && (
          <>
            <LivePill className="ov-enter-down text-[0.95em] portrait:hidden">
              {L({ DE: 'Anlage online', EN: 'System online', IT: 'Impianto online', FR: 'Système en ligne', SQ: 'Sistemi online' })}
            </LivePill>
            <span className="ov-fade h-[calc(3vh+1.6vw)] w-px bg-gradient-to-b from-transparent via-white/20 to-transparent portrait:hidden" style={delay(160)} />
          </>
        )}
        <div className="ov-enter-down flex flex-col items-end" style={delay(120)}>
          <LiveClock className="text-[3.4em] text-white" />
          <span className="mt-[0.35em] text-[0.95em] font-medium text-white/70">{formattedDate}</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
