import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CompanyAd, ZoneRow } from '../../template/AdsDisplay';
import { LogoMark } from '../../design/primitives';
import { tr } from '../../design/hooks';
import { mediaUrl, usePlaylist, useZoneRows } from './adMedia';

type Status = 'loading' | 'ok' | 'error';

/** Markenfläche, wenn ein Medium fehlt oder nicht geladen werden kann */
function MediaFallback({ language }: { language: string | null }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(70%_60%_at_50%_40%,rgb(0_52_115/0.55),transparent_75%),linear-gradient(165deg,#0a1f45,#020b1c)]">
      <div className="flex flex-col items-center gap-[1em] text-center">
        <LogoMark size={64} />
        <span className="eyebrow text-[0.8em]">ÖKOVOLT</span>
        <span className="text-[1.6em] font-semibold text-white/60">{tr(language, { DE: 'Power of green energy', EN: 'Power of green energy' })}</span>
      </div>
    </div>
  );
}

/** Ein Medium (Bild mit Ken-Burns über unscharfem Hintergrund, oder Video) */
function MediaLayer({ item, variant, ms, background, language, onFail }: { item: ZoneRow; variant: number; ms: number; background: string; language: string | null; onFail?: (file: string) => void }) {
  const [status, setStatus] = useState<Status>('loading');
  // Vollflächig (cover), wenn das Seitenverhältnis nah genug am Rahmen ist – sonst ganz zeigen (contain) über unscharfer Fläche
  const [fit, setFit] = useState<'cover' | 'contain'>('contain');
  const src = mediaUrl(item.attach_file);
  const onImg = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const box = img.parentElement?.getBoundingClientRect();
    if (box && img.naturalWidth && box.width && box.height) {
      // Vollflächig nur, wenn kaum beschnitten wird (≤ ~14 %) und das Bild dafür genug Auflösung hat
      const diff = Math.abs(Math.log(img.naturalWidth / img.naturalHeight / (box.width / box.height)));
      const scale = Math.max(box.width / img.naturalWidth, box.height / img.naturalHeight) * (window.devicePixelRatio || 1);
      setFit(diff < 0.15 && scale <= 1.6 ? 'cover' : 'contain');
    }
    setStatus('ok');
  };
  const alt = item.title || item.file_name || '';

  return (
    <div
      className="ov-ad-layer overflow-hidden"
      style={{
        backgroundColor: background,
        backgroundImage: 'radial-gradient(85% 60% at 50% 38%, rgb(255 255 255 / 0.08), transparent 72%), radial-gradient(60% 50% at 100% 0%, rgb(0 52 115 / 0.45), transparent 70%)',
      }}
    >
      {item.type === 'Video' ? (
        <video
          src={src}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onCanPlay={() => setStatus('ok')}
          onError={() => {
            setStatus('error');
            onFail?.(item.attach_file);
          }}
          className="absolute inset-0 size-full object-contain"
        />
      ) : (
        <>
          {/* unscharfer, abgedunkelter Hintergrund (statisch) füllt Ränder bei abweichendem Seitenverhältnis */}
          {fit === 'contain' && (
            <div aria-hidden className="absolute inset-0 bg-[radial-gradient(70%_55%_at_50%_45%,rgb(255_214_150/0.14),transparent_70%),linear-gradient(180deg,#0b2350,#061533)]" />
          )}
          <div
            className={`ov-ad-kb absolute ${fit === 'cover' ? 'inset-0' : 'inset-x-[6%] bottom-[22%] top-[9%]'}`}
            style={{ animationName: `ov-ad-kb-${variant % 4}`, animationDuration: `${ms + 1600}ms` }}
          >
            <img
              src={src}
              alt={alt}
              onLoad={onImg}
              onError={() => {
                setStatus('error');
                onFail?.(item.attach_file);
              }}
              className={`size-full ${fit === 'cover' ? 'object-cover' : 'object-contain drop-shadow-[0_30px_50px_rgb(0_0_0/0.55)]'}`}
            />
          </div>
        </>
      )}
      {status === 'loading' && <span className="ov-skeleton absolute inset-0 rounded-none opacity-60" aria-hidden />}
      {status === 'error' && <MediaFallback language={language} />}
    </div>
  );
}

/**
 * Glasrahmen für eine Anzeigen-Zone: Wiedergabeliste mit Überblendung, Ken-Burns,
 * Fortschritt je Medium, optionale Beschriftung (`title` aus den Daten) und „Anzeige“-Kennzeichnung.
 */
export function AdFrame({
  ad,
  zone,
  language,
  badge = false,
  delayMs = 0,
  className = '',
  onEmpty,
}: {
  ad: CompanyAd;
  zone: string;
  language: string | null;
  badge?: boolean;
  delayMs?: number;
  className?: string;
  /** alle Medien dieser Zone fehlerhaft → Elternlayout kann die Zone ausblenden */
  onEmpty?: (zone: string) => void;
}) {
  const allRows = useZoneRows(ad, zone);
  // fehlerhafte Medien überspringen (keine Fehlermeldung, keine tote Fläche)
  const [failed, setFailed] = useState<string[]>([]);
  const rows = useMemo(() => allRows.filter((r) => !failed.includes(r.attach_file)), [allRows, failed]);
  const onFail = useCallback((f: string) => setFailed((x) => (x.includes(f) ? x : [...x, f])), []);
  useEffect(() => {
    if (allRows.length > 0 && rows.length === 0) onEmpty?.(zone);
  }, [allRows.length, rows.length, onEmpty, zone]);
  const stopAfter = ad.total_duration ? Math.max(1000, (ad.total_duration - 1) * 1000) : undefined;
  const { index, item, cycle, ms } = usePlaylist(rows, stopAfter);
  // Videos laufen bei Wiederholung weiter, Bilder blenden pro Durchlauf neu über
  const k = item ? (item.type === 'Video' ? `v${index}-${item.attach_file}` : `i${cycle}-${item.attach_file}`) : 'none';
  const variant = cycle + zone.length + (zone.charCodeAt(zone.length - 1) || 0);

  const [layers, setLayers] = useState<{ k: string; item?: ZoneRow; variant: number; ms: number }[]>(() => [{ k, item, variant, ms }]);
  useEffect(() => {
    setLayers((ls) => (ls[ls.length - 1]?.k === k ? ls : [...ls.slice(-1), { k, item, variant, ms }]));
    const t = setTimeout(() => setLayers((ls) => (ls.length > 1 ? ls.slice(-1) : ls)), 1100);
    return () => clearTimeout(t);
  }, [k, item, variant, ms]);

  const background = ad.background_color || '#06172f';
  const title = item?.title;
  const eyebrow = ad.title || tr(language, { DE: 'Anzeige', EN: 'Advertisement', IT: 'Pubblicità', FR: 'Publicité', SQ: 'Reklamë' });

  return (
    <div
      className={`ov-ad-frame-in relative min-h-0 overflow-hidden rounded-[28px] border border-white/10 bg-[#06172f] shadow-[0_30px_80px_-30px_rgb(0_0_0/0.8)] ${className}`}
      style={{ ['--d' as string]: `${delayMs}ms` }}
    >
      {rows.length === 0 ? (
        <MediaFallback language={language} />
      ) : (
        layers.map((l) => (l.item ? <MediaLayer key={l.k} item={l.item} variant={l.variant} ms={l.ms} background={background} language={language} onFail={onFail} /> : null))
      )}

      {/* Edle Navy-Verläufe: unten für Text, links leichte Vignette */}
      {rows.length > 0 && (
        <>
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-[#04102a]/95 via-[#04102a]/45 to-transparent" />
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_40%,transparent_55%,rgb(4_16_42/0.55))]" />
        </>
      )}
      <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[28px] shadow-[inset_0_1px_0_rgb(255_255_255/0.14)]" />

      {/* Beschriftung im Stil der TV-Seite: Eyebrow mit Linie, große Headline */}
      {rows.length > 0 && badge && !title && (
        <div className="absolute inset-x-0 bottom-0 z-10 flex items-center gap-[0.8em] px-[2.6em] pb-[2.6em] text-[1.6em] font-semibold text-[#aed083]">
          <LogoMark size={34} />
          <span className="h-[0.14em] w-[2.2em] rounded-full bg-[#8cba58]" />
          {eyebrow}
        </div>
      )}
      {rows.length > 0 && title && (
        <div className="absolute inset-x-0 bottom-0 z-10 px-[2.6em] pb-[3.2em]">
          <div key={`cap-${k}`} className="ov-rise">
            <div className="flex items-center gap-[0.8em] text-[1.6em] font-semibold text-[#aed083]">
              <LogoMark size={34} />
              <span className="h-[0.14em] w-[2.2em] rounded-full bg-[#8cba58]" />
              {eyebrow}
            </div>
            {title && (
              <div className="mt-[0.35em] max-w-[22em] text-[3.6em] font-extrabold leading-[1.05] tracking-[-0.03em] text-white drop-shadow-[0_4px_24px_rgb(0_0_0/0.5)]" style={{ fontFamily: 'var(--font-display)' }}>
                {title}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
