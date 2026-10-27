import { ScanQrCode, Users } from 'lucide-react';
import { LiveClock, LogoMark, StageDecor } from '../design/primitives';
import { delay, tr, useNow } from '../design/hooks';
import { QrCode } from '../components/Company/QrCode';
import { qrTiming, useZeitQr, type ZeitQrError } from '../api/zeitQr';
import BrandLogoImg from '../assets/logo-oekovolt-dark.png';
const BrandLogo = BrandLogoImg.src;

type Words = Parameters<typeof tr>[1];

const TEXT = {
  live: { DE: 'Live', EN: 'Live', IT: 'Live', FR: 'En direct', SQ: 'Live' },
  present: { DE: 'anwesend', EN: 'present', IT: 'presenti', FR: 'présents', SQ: 'të pranishëm' },
  location: { DE: 'Zentrale Ostermiething · Empfang', EN: 'Ostermiething headquarters · Reception' },
  greeting: { DE: 'Guten Morgen', EN: 'Good morning', IT: 'Buongiorno', FR: 'Bonjour', SQ: 'Mirëmëngjes' },
  scanTitle: { DE: 'Mit der ÖKOVOLT-App scannen', EN: 'Scan with the ÖKOVOLT app', IT: "Scansiona con l'app ÖKOVOLT", FR: "Scannez avec l'app ÖKOVOLT", SQ: 'Skano me aplikacionin ÖKOVOLT' },
  qrAria: { DE: 'QR-Code zum Stempeln – wechselt alle 30 Sekunden', EN: 'QR code for clocking – changes every 30 seconds' },
  officeRule: { DE: 'Büro: Kommen nur per QR-Scan mit der ÖKOVOLT-App', EN: 'Office: clock in only by scanning with the ÖKOVOLT app' },
} satisfies Record<string, Words>;

const ERRORS: Record<ZeitQrError | 'stale', Words> = {
  not_configured: { DE: 'Zeiterfassung nicht verbunden – Anzeige-Schlüssel fehlt', EN: 'Time tracking not connected – display key missing' },
  unauthorized: { DE: 'Zeiterfassung lehnt diesen Bildschirm ab – Anzeige-Schlüssel prüfen', EN: 'Time tracking rejected this screen – check the display key' },
  unavailable: { DE: 'QR-Code derzeit nicht verfügbar – bitte PIN verwenden', EN: 'QR code currently unavailable – please use your PIN' },
  stale: { DE: 'QR-Code derzeit nicht verfügbar – bitte PIN verwenden', EN: 'QR code currently unavailable – please use your PIN' },
};

/** Countdown-Ring (wie ProgressRing am Empfang): grüner Bogen läuft bis zum nächsten Code ab */
function CountdownRing({ fraction }: { fraction: number }) {
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 size-full -rotate-90" aria-hidden>
      <circle cx="50" cy="50" r="48.6" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.4" />
      <circle
        cx="50"
        cy="50"
        r="48.6"
        fill="none"
        stroke="#8CBA58"
        strokeWidth="1.4"
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={`${Math.max(0.0001, fraction)} 1`}
        className="transition-[stroke-dasharray] duration-300 ease-linear"
        style={{ filter: 'drop-shadow(0 0 0.6px rgb(140 186 88 / 0.8))' }}
      />
    </svg>
  );
}

/**
 * Vollbild „Stempeln am Empfang“ (Arbeitstage 07:00–09:00): derselbe rotierende QR-Code wie der Empfangsbildschirm
 * der Zeiterfassung (kiosk-screen.tsx → RotatingQr) – Ring-Countdown, weiße Karte mit Bildmarke, Standort, Uhr, Anwesende.
 */
export default function StampQrScreen({ language }: { language: string | null }) {
  const L = (t: Words) => tr(language, t);
  const qr = useZeitQr();
  const now = useNow(250).getTime();
  const { fraction, secs, stale } = qrTiming(qr, now);
  const showQr = Boolean(qr.data) && !stale;
  const problem: ZeitQrError | 'stale' | null = !qr.data ? qr.error : stale ? 'stale' : null;
  const date = new Intl.DateTimeFormat(language === 'EN' ? 'en-GB' : 'de-AT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Vienna',
  }).format(now);

  return (
    <div className="ov-stage dark relative isolate flex h-screen w-screen flex-col overflow-hidden font-sans text-[calc(0.6vw+0.6vh)] text-white">
      <StageDecor arc={false} />

      {/* Kopf: Logo · Live + Anwesende */}
      <header className="ov-enter-down flex items-center justify-between gap-[1.5em] px-[2.4em] pt-[2em]">
        <img src={BrandLogo} alt="ÖKOVOLT Solartechnik" className="h-[3.2em] w-auto object-contain" />
        <div className="ov-glass flex items-center gap-[0.8em] rounded-full py-[0.6em] pl-[1.1em] pr-[1.4em]" aria-live="polite">
          <span className="inline-flex items-center gap-[0.5em] text-[0.8em] font-bold uppercase tracking-[0.16em] text-[#8cba58]">
            <span className="live-dot" aria-hidden />
            {L(TEXT.live)}
          </span>
          <span className="h-[1.1em] w-px bg-white/20" aria-hidden />
          <Users className="size-[1.2em] text-[#fbbf3a]" aria-hidden />
          <span className="num-display text-[1.4em]">{qr.data?.present ?? '–'}</span>
          <span className="text-[0.95em] text-white/70">{L(TEXT.present)}</span>
        </div>
      </header>

      <main className="grid flex-1 place-items-center px-[2.4em] pb-[2.4em] landscape:grid-cols-[1fr_auto] landscape:gap-[4em]">
        {/* Standort · Uhr · Datum */}
        <section className="ov-rise flex flex-col items-center text-center landscape:items-start landscape:text-left" style={delay(150)}>
          <p className="eyebrow text-[1.1em]">{qr.data?.location || L(TEXT.location)}</p>
          <p className="mt-[0.6em] font-[var(--font-display)] text-[1.6em] font-extrabold tracking-[-0.02em] text-white/85">{L(TEXT.greeting)}</p>
          <LiveClock className="mt-[0.2em] text-[clamp(6em,11vw,11em)] leading-[0.9]" secondsClassName="text-white/45" />
          <p className="mt-[0.5em] text-[1.5em] font-medium capitalize text-white/75">{date}</p>
        </section>

        {/* QR mit Countdown-Ring */}
        <section className="ov-rise flex flex-col items-center gap-[1.6em]" style={delay(300)} aria-live="polite">
          <div className="relative grid size-[min(80vw,46vh)] place-items-center landscape:size-[min(42vw,62vh)]">
            <CountdownRing fraction={showQr ? fraction : 0} />
            {/* Karte passt in den Ring (Diagonale < Innendurchmesser) */}
            <div className="relative grid size-[66%] place-items-center rounded-[7%] bg-white p-[5%] shadow-[0_40px_90px_-24px_rgba(0,0,0,0.7),0_0_0_0.5em_rgba(255,255,255,0.06)]">
              {showQr ? (
                <div key={qr.data!.token} className="ov-fade size-full">
                  <QrCode value={qr.data!.scan_url} label={L(TEXT.qrAria)} level="M" className="block size-full" />
                </div>
              ) : (
                <div className="size-full animate-pulse rounded-[6%] bg-neutral-100" />
              )}
              <span className="absolute left-1/2 top-1/2 grid size-[22%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[22%] bg-white shadow-md ring-4 ring-white">
                <span className="grid size-[86%] place-items-center rounded-[18%] bg-[#03122b]">
                  <LogoMark size={48} className="size-[78%]" />
                </span>
              </span>
            </div>
          </div>

          <div className="text-center">
            <p className="font-[var(--font-display)] text-[2.4em] font-extrabold tracking-[-0.02em]">{L(TEXT.scanTitle)}</p>
            <p className={`mt-[0.3em] text-[1.25em] ${problem ? 'text-[#ffd873]' : 'text-white/70'}`}>
              {problem
                ? L(ERRORS[problem])
                : tr(language, {
                    DE: `Neuer Code in ${secs} s – nur im Haus gültig`,
                    EN: `New code in ${secs} s – valid on site only`,
                    IT: `Nuovo codice tra ${secs} s – valido solo in sede`,
                    FR: `Nouveau code dans ${secs} s – valable sur place uniquement`,
                    SQ: `Kod i ri pas ${secs} s – i vlefshëm vetëm në objekt`,
                  })}
            </p>
            <p className="mx-auto mt-[1em] inline-flex items-center gap-[0.5em] rounded-full bg-white/[0.08] px-[1.1em] py-[0.45em] text-[1.1em] font-semibold text-[#aed083] ring-1 ring-white/12">
              <ScanQrCode className="size-[1.1em] shrink-0" aria-hidden /> {L(TEXT.officeRule)}
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
