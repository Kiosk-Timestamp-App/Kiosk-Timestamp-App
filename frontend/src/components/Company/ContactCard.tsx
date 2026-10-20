import type { CSSProperties } from 'react';
import { CalendarCheck, CalendarOff, CircleCheck, ClipboardCheck, Clock, Mail, MapPin, Phone } from 'lucide-react';
import { delay } from '../../design/hooks';
import { COMPANY, CONTACT } from './facts';
import { QrCode } from './QrCode';
import { useQrTarget } from './useCompanyHooks';
import type { OpenStatus } from './viennaTime';
import { Card } from './ui';

/** Öffnungsstatus: Text + Symbol (nie nur Farbe) */
function StatusPill({ status }: { status: OpenStatus }) {
  if (status.open) {
    return (
      <span className="inline-flex items-center gap-[0.6em] rounded-full border border-[#8CBA58]/45 bg-[#669933]/20 px-[1em] py-[0.45em]">
        <span className="live-dot" />
        <span className="font-bold text-[#C8E2A6]">Jetzt geöffnet</span>
        <span className="text-white/80">· bis {status.until} Uhr</span>
      </span>
    );
  }
  const Icon = status.reason ? CalendarOff : Clock;
  const head = status.reason === 'holiday' ? 'Heute Feiertag' : status.reason === 'closed' ? 'Heute geschlossen' : 'Geschlossen';
  return (
    <span className="glass-pill inline-flex flex-wrap items-center gap-x-[0.6em] gap-y-[0.15em] rounded-[1.2em] px-[1em] py-[0.45em]">
      <Icon className="size-[1.1em] text-[#FFD873]" strokeWidth={2} />
      <span className="font-bold text-white">{head}</span>
      {status.next && <span className="text-white/80">· öffnet {status.next} Uhr</span>}
    </span>
  );
}

function QrTile({ url, label, hint, icon: Icon, d, wide }: { url: string; label: string; hint: string; icon: typeof CalendarCheck; d: number; wide: boolean }) {
  const size = wide ? 'size-[10.8em]' : 'size-[12em]';
  return (
    <div className={`ov-rise flex min-w-0 flex-col items-center text-center ${wide ? 'w-[11.6em]' : 'w-[12.8em]'}`} style={delay(d)}>
      <span className="rounded-[18px] bg-white p-[0.45em] shadow-[0_14px_36px_-12px_rgba(0,0,0,0.7)]">
        <QrCode value={url} label={`QR-Code: ${label}`} className={`block ${size}`} />
      </span>
      <span className="mt-[0.6em] text-[1.02em] font-bold leading-tight text-white">
        <Icon className="mr-[0.35em] inline size-[1.05em] -translate-y-[0.1em] align-middle text-[#AED083]" strokeWidth={2} />
        {label}
      </span>
      {!wide && <span className="mt-[0.2em] text-[0.92em] leading-snug text-white/65">{hint}</span>}
    </div>
  );
}

export function ContactCard({ wide, status, website }: { wide: boolean; status: OpenStatus; website: string | null }) {
  const termin = useQrTarget('termin', website);
  const angebot = useQrTarget('angebot', website);
  type Tile = { url: string; cta: (typeof CONTACT.ctas)[number]; icon: typeof CalendarCheck };
  const tiles: Tile[] = [];
  if (termin) tiles.push({ url: termin, cta: CONTACT.ctas[0], icon: CalendarCheck });
  if (angebot) tiles.push({ url: angebot, cta: CONTACT.ctas[1], icon: ClipboardCheck });

  const head = (
    <div>
      <div className="eyebrow">{CONTACT.eyebrow}</div>
      <h2 className={`mt-[0.3em] font-[var(--font-display)] font-extrabold leading-[1.05] tracking-[-0.03em] text-white ${wide ? 'text-[2em]' : 'text-[2.3em]'}`}>
        {CONTACT.title.lead} <span className="cp-hl text-gradient-sun">{CONTACT.title.highlight}</span>
      </h2>
    </div>
  );

  const phone = (
    <div className="flex items-center gap-[0.75em]">
      <span className="ov-tile-brand grid size-[2.9em] shrink-0 place-items-center rounded-[0.95em]">
        <Phone className="size-[1.45em] text-white" strokeWidth={1.9} />
      </span>
      <span className={`num-display whitespace-nowrap leading-none text-white ${wide ? 'text-[2.25em]' : 'text-[2.4em]'}`}>{COMPANY.phone}</span>
    </div>
  );

  const contactLines = (
    <div className="space-y-[0.55em]">
      <div className="flex items-center gap-[0.65em] text-[1.12em] text-white/90">
        <Mail className="size-[1.05em] shrink-0 text-[#AED083]" strokeWidth={1.9} />
        <span className="font-semibold">{COMPANY.email}</span>
      </div>
      <div className="flex items-start gap-[0.65em] text-[1.08em] leading-snug text-white/80">
        <MapPin className="mt-[0.15em] size-[1.1em] shrink-0 text-[#AED083]" strokeWidth={1.9} />
        <span>
          {COMPANY.street}, {COMPANY.city}
        </span>
      </div>
    </div>
  );

  /** Öffnungszeiten kompakt: heute gültiger Abschnitt fett + Markierung (nicht nur Farbe) */
  const hours = (
    <div className="text-[1.08em] leading-snug">
      <div className="flex flex-wrap items-baseline gap-x-[0.5em]">
        {COMPANY.hours.map((h, i) => {
          const today = status.todayIdx === i;
          return (
            <span key={h.label} className={`inline-flex items-baseline gap-[0.4em] ${today ? 'font-bold text-white' : 'text-white/80'}`}>
              {i > 0 && <span className="font-normal text-white/40">·</span>}
              {today && <span aria-hidden className="inline-block h-[0.85em] w-[0.22em] translate-y-[0.1em] rounded-full bg-[#8CBA58]" />}
              <span>{h.label}</span>
              <span className="tabular whitespace-nowrap">{h.time}</span>
              {today && <span className="sr-only">(heute)</span>}
            </span>
          );
        })}
      </div>
      <div className={`mt-[0.2em] ${status.todayIdx < 0 ? 'font-semibold text-white' : 'text-white/65'}`}>Sa, So und an Feiertagen geschlossen</div>
    </div>
  );

  const qrs =
    tiles.length > 0 ? (
      <div className="flex justify-center gap-[1em]">
        {tiles.map((t, i) => (
          <QrTile key={t.cta.key} url={t.url} label={t.cta.label} hint={t.cta.hint} icon={t.icon} d={500 + i * 120} wide={wide} />
        ))}
      </div>
    ) : null;

  const free = (
    <p className="flex items-start gap-[0.6em] text-[1.05em] leading-snug text-white/80">
      <CircleCheck className="mt-[0.1em] size-[1.15em] shrink-0 text-[#8CBA58]" strokeWidth={2} />
      <span>{CONTACT.free}</span>
    </p>
  );

  if (wide) {
    return (
      <Card className="flex h-full min-h-0 flex-col gap-[0.85em] p-[1.4em_1.7em]" style={{ '--rd': '220ms' } as CSSProperties}>
        {head}
        <div className="text-[0.98em]">
          <StatusPill status={status} />
        </div>
        {phone}
        {contactLines}
        {hours}
        <div className="mt-auto">{qrs}</div>
        <div className="border-t border-white/10 pt-[0.7em]">{free}</div>
      </Card>
    );
  }

  return (
    <Card className="shrink-0 p-[1.6em_2.2em_1.4em]" style={{ '--rd': '220ms' } as CSSProperties}>
      <div className={`grid items-start gap-x-[1.6em] ${qrs ? 'grid-cols-[1fr_auto]' : 'grid-cols-1'}`}>
        <div className="min-w-0">
          {head}
          <div className="mt-[0.8em]">
            <StatusPill status={status} />
          </div>
          <div className="mt-[1em]">{phone}</div>
          <div className="mt-[1em]">{contactLines}</div>
          <div className="mt-[0.9em]">{hours}</div>
        </div>
        {qrs}
      </div>
      <div className="mt-[1.1em] border-t border-white/10 pt-[0.9em]">{free}</div>
    </Card>
  );
}
