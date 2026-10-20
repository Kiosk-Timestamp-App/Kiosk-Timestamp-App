import React from 'react';
import { Headset, PauseCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import BrandLogo from '../../assets/logo-oekovolt-dark.png';
import { LiveClock, LogoMark, StageDecor } from '../../design/primitives';
import { delay, tr } from '../../design/hooks';
import { COMPANY } from '../Company/facts';

interface LicenseWarningProps {
  theme: 'light' | 'dark';
  language: string | null;
}

const LICENSE_CSS = `
@keyframes ov-lic-breathe { 0%, 100% { transform: scale(1); opacity: .35; } 50% { transform: scale(1.18); opacity: 0; } }
@keyframes ov-lic-spin { to { transform: rotate(360deg); } }
.ov-lic-breathe { animation: ov-lic-breathe 3.2s ease-in-out infinite; }
.ov-lic-spin { animation: ov-lic-spin 6s linear infinite; }
@media (prefers-reduced-motion: reduce) { .ov-lic-breathe, .ov-lic-spin { animation: none !important; } }
`;

/**
 * Vollbild-Hinweis, wenn der Kiosk zu lange offline war und die Lizenz nicht bestätigt werden konnte.
 * Öffentlich sichtbar → neutrale, markenschonende Botschaft („Anzeige vorübergehend pausiert“),
 * der technische Grund steht klein darunter. Keine erfundene Schwelle, kein Countdown ohne echte Zeitbasis:
 * die Prüfung läuft im Minutentakt (hooks/useLicenseCheck.ts) und die Anzeige startet von selbst wieder.
 */
export const LicenseWarning: React.FC<LicenseWarningProps> = ({ language }) => {
  const L = (t: Parameters<typeof tr>[1]) => tr(language, t);

  const steps = [
    {
      icon: Wifi,
      title: L({ DE: 'Internetverbindung herstellen', EN: 'Restore the internet connection', IT: 'Ripristinare la connessione internet', FR: 'Rétablir la connexion internet', SQ: 'Rivendosni lidhjen me internetin' }),
      text: L({ DE: 'Netzwerkkabel bzw. WLAN des Bildschirms prüfen.', EN: "Check the screen's network cable or Wi-Fi.", IT: 'Controllare cavo di rete o Wi-Fi dello schermo.', FR: 'Vérifier le câble réseau ou le Wi-Fi de l’écran.', SQ: 'Kontrolloni kabllin e rrjetit ose Wi-Fi të ekranit.' }),
    },
    {
      icon: RefreshCw,
      title: L({ DE: 'Läuft automatisch weiter', EN: 'Resumes automatically', IT: 'Riprende automaticamente', FR: 'Reprend automatiquement', SQ: 'Vazhdon automatikisht' }),
      text: L({
        DE: 'Sobald der Bildschirm online ist, wird die Lizenz automatisch bestätigt – kein Eingriff nötig.',
        EN: 'As soon as the screen is online, the licence is confirmed automatically – no action needed.',
        IT: 'Appena lo schermo è online, la licenza viene confermata automaticamente – nessun intervento necessario.',
        FR: 'Dès que l’écran est en ligne, la licence est confirmée automatiquement – aucune action requise.',
        SQ: 'Sapo ekrani të jetë online, licenca konfirmohet automatikisht – pa ndërhyrje.',
      }),
    },
    {
      icon: Headset,
      title: L({ DE: 'Hinweis bleibt bestehen?', EN: 'Notice persists?', IT: 'L’avviso persiste?', FR: 'Le message persiste ?', SQ: 'Njoftimi vazhdon?' }),
      text: `${COMPANY.phone} · ${COMPANY.email}`,
    },
  ];

  return (
    <div className="ov-stage dark h-screen w-screen overflow-hidden font-sans text-white">
      <style>{LICENSE_CSS}</style>
      <StageDecor arc={false} />
      <div className="flex h-full w-full flex-col gap-[calc(0.5vw+0.5vh)] p-[calc(0.8vw+0.8vh)]">
        {/* Eigene Kopfzeile: die normale meldet „Anlage online“ – hier wäre das widersprüchlich */}
        <header className="flex items-center justify-between gap-[2vw] px-[0.4vw] pb-[0.6vh] text-[calc(0.55vw+0.35vh)]">
          <img src={BrandLogo} alt="ÖKOVOLT Solartechnik" className="h-[calc(2.4vh+1.3vw)] w-auto object-contain" />
          <div className="flex items-center gap-[1.6em]">
            <span className="glass-pill inline-flex items-center gap-[0.6em] rounded-full px-[1.1em] py-[0.55em] text-[1.4em]">
              <WifiOff className="size-[1.1em] text-[#ffd873]" strokeWidth={2.2} aria-hidden />
              <span className="font-semibold text-white/90">{L({ DE: 'Keine Verbindung', EN: 'No connection', IT: 'Nessuna connessione', FR: 'Pas de connexion', SQ: 'Pa lidhje' })}</span>
            </span>
            <LiveClock className="text-[3.2em] text-white" />
          </div>
        </header>

        <main className="grid min-h-0 flex-1 place-items-center portrait:text-[2.1vmin] landscape:text-[1.65vmin]">
          <div className="grid w-full max-w-[min(92vw,130vmin)] items-center gap-[3.2em] portrait:grid-cols-1 landscape:grid-cols-[1.05fr_1fr]">
            {/* Botschaft */}
            <section className="flex flex-col items-center text-center landscape:items-start landscape:text-left" aria-labelledby="lic-title">
              <div className="ov-rise relative mb-[2.2em] grid place-items-center" style={delay(0)}>
                <span className="ov-lic-breathe absolute size-[9em] rounded-[32px] border border-[#ffd873]/50" />
                <span className="grid size-[9em] place-items-center rounded-[32px] border border-white/12 bg-white/[0.05] shadow-[0_30px_80px_-30px_rgb(245_167_15/0.45)]">
                  <LogoMark size={88} animated />
                </span>
                <span className="absolute -bottom-[0.9em] -right-[0.9em] grid size-[3.6em] place-items-center rounded-full bg-[#1f539a] text-white shadow-[0_0_0_0.35em_#061633,0_10px_30px_-6px_rgb(31_83_154/0.8)]">
                  <PauseCircle className="size-[60%]" strokeWidth={2.2} aria-hidden />
                </span>
              </div>

              <span className="ov-rise eyebrow" style={{ ...delay(150), fontSize: '1em' }}>
                {L({ DE: 'Hinweis', EN: 'Notice', IT: 'Avviso', FR: 'Information', SQ: 'Njoftim' })}
              </span>
              <h1 id="lic-title" className="ov-rise mt-[0.4em] text-[4em] font-extrabold leading-[1.04] tracking-[-0.03em] [text-wrap:balance]" style={{ ...delay(250), fontFamily: 'var(--font-display)' }}>
                {L({ DE: 'Anzeige vorübergehend', EN: 'Display temporarily', IT: 'Visualizzazione temporaneamente', FR: 'Affichage temporairement', SQ: 'Shfaqja përkohësisht' })}{' '}
                <span className="text-gradient-sun">{L({ DE: 'pausiert', EN: 'paused', IT: 'in pausa', FR: 'en pause', SQ: 'në pauzë' })}</span>
              </h1>
              <p className="ov-rise mt-[0.8em] max-w-[30em] text-[1.35em] leading-relaxed text-white/80 [text-wrap:pretty]" style={delay(350)}>
                {L({
                  DE: 'Dieser Bildschirm war zu lange ohne Internetverbindung. Sobald die Verbindung steht, geht es von selbst weiter.',
                  EN: 'This screen has been without an internet connection for too long. It resumes on its own once the connection is back.',
                  IT: 'Questo schermo è rimasto troppo a lungo senza connessione internet. Riprende da solo appena la connessione torna.',
                  FR: 'Cet écran est resté trop longtemps sans connexion internet. Il reprend tout seul dès que la connexion revient.',
                  SQ: 'Ky ekran ka qenë shumë gjatë pa lidhje interneti. Vazhdon vetë sapo lidhja të rikthehet.',
                })}
              </p>
              <div className="ov-rise mt-[1.8em] inline-flex items-center gap-[0.8em] rounded-full border border-white/12 bg-white/[0.05] py-[0.6em] pl-[0.8em] pr-[1.3em]" style={delay(450)} role="status">
                <RefreshCw className="ov-lic-spin size-[1.4em] text-[#9dc1f2]" strokeWidth={2.2} aria-hidden />
                <span className="text-[1.1em] text-white/85">
                  {L({ DE: 'Automatische Prüfung jede Minute', EN: 'Automatic check every minute', IT: 'Verifica automatica ogni minuto', FR: 'Vérification automatique chaque minute', SQ: 'Kontroll automatik çdo minutë' })}
                </span>
              </div>
              <p className="ov-rise mt-[1.2em] text-[0.95em] text-white/55" style={delay(500)}>
                {L({
                  DE: 'Technischer Grund: Lizenzbestätigung ausstehend (Offline-Zeitraum überschritten).',
                  EN: 'Technical reason: licence confirmation pending (offline period exceeded).',
                  IT: 'Motivo tecnico: conferma della licenza in sospeso (periodo offline superato).',
                  FR: 'Raison technique : confirmation de licence en attente (période hors ligne dépassée).',
                  SQ: 'Arsye teknike: konfirmimi i licencës në pritje (periudha offline u tejkalua).',
                })}
              </p>
            </section>

            {/* Schritte */}
            <section className="ov-glass ov-rise rounded-[32px] p-[2.2em]" style={delay(400)} aria-labelledby="lic-steps">
              <span id="lic-steps" className="eyebrow" style={{ fontSize: '0.9em' }}>
                {L({ DE: 'So geht es weiter', EN: 'What happens next', IT: 'Come procedere', FR: 'Et ensuite', SQ: 'Çfarë ndodh më tej' })}
              </span>
              <ol className="mt-[1.4em] flex flex-col gap-[1.1em]">
                {steps.map(({ icon: Icon, title, text }, i) => (
                  <li key={i} className="ov-rise flex items-center gap-[1.2em] rounded-[22px] border border-white/10 bg-white/[0.04] p-[1.1em]" style={delay(550 + i * 120)}>
                    <span className="ov-tile-brand relative grid size-[3.6em] shrink-0 place-items-center rounded-[16px]">
                      <Icon className="size-[48%] text-white" strokeWidth={2.2} aria-hidden />
                      <span className="num-display absolute -left-[0.5em] -top-[0.5em] grid size-[1.7em] place-items-center rounded-full bg-[#061633] text-[0.8em] text-[#aed083] ring-1 ring-white/15">
                        {i + 1}
                      </span>
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[1.35em] font-bold leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
                        {title}
                      </span>
                      <span className={`mt-[0.25em] block text-[1.1em] ${i === 2 ? 'num-display font-bold text-white' : 'text-white/75'}`}>{text}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};
