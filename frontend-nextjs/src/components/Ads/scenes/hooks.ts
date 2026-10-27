import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import QRCode from 'qrcode';
import gsap from 'gsap';

export type Timeline = gsap.core.Timeline;

/* ------------------------------------------------------------------ QR-Codes */

const qrCache = new Map<string, string>();

/** Volle Ziel-URL auf der im Backend hinterlegten Website (ohne Website → null, QR entfällt) */
export function targetUrl(website: string | null | undefined, path: string) {
  if (!website) return null;
  try {
    const base = new URL(/^https?:\/\//i.test(website) ? website : `https://${website}`);
    return new URL(path, base.origin).toString();
  } catch {
    return null;
  }
}

/** Anzeige-Form der URL wie auf der TV-Seite: „oekovolt.com/service/wartung“ */
export const displayUrl = (url: string) => url.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '');

export function prepareQr(url: string | null) {
  if (!url || qrCache.has(url)) return Promise.resolve();
  return QRCode.toDataURL(url, { width: 480, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#03122b', light: '#ffffff' } })
    .then((d) => void qrCache.set(url, d))
    .catch(() => undefined);
}

export function useQrDataUrl(url: string | null) {
  const [, force] = useState(0);
  useEffect(() => {
    if (!url || qrCache.has(url)) return;
    let alive = true;
    prepareQr(url).then(() => alive && force((n) => n + 1));
    return () => {
      alive = false;
    };
  }, [url]);
  return url ? (qrCache.get(url) ?? null) : null;
}

/* ------------------------------------------------------------------ Zeitachse */

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export interface SceneTiming {
  /** Länge in Sekunden (Ende = Wechsel) */
  duration: number;
  /** Zeitpunkt, der in jedem Fall erreicht werden muss (Höhepunkt/Plakat bzw. Outro-QR) */
  mustReach: number;
  /** Standbilder für reduzierte Bewegung */
  stills: number[];
}

/**
 * GSAP-Zeitachse eines Spots. Läuft auf der Wanduhr (lagSmoothing 0 → auf schwachen TVs
 * werden Bilder übersprungen, nicht gedehnt); meldet das Ende über `onDone`.
 * Reduzierte Bewegung: drei Standbilder inkl. Schlussbild, gleiche Gesamtdauer.
 */
export function useSceneTimeline(scope: RefObject<HTMLElement | null>, build: (tl: Timeline, root: HTMLElement) => void, playing: boolean, timing: SceneTiming, onDone?: () => void) {
  const { duration: DURATION, mustReach: END_AT, stills: STILLS } = timing;
  const [tl, setTl] = useState<Timeline | null>(null);
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  useLayoutEffect(() => {
    const root = scope.current;
    if (!root) return;
    let timeline: Timeline | null = null;
    const ctx = gsap.context(() => {
      timeline = gsap.timeline({ paused: true, defaults: { ease: 'expo.out', duration: 0.9 }, onComplete: () => doneRef.current?.() });
      build(timeline, root);
      // Zeitachse exakt auf Spotlänge strecken (Ende = Wechsel)
      timeline.to({}, { duration: 0.01 }, DURATION - 0.01);
    }, root);
    setTl(timeline);
    return () => ctx.revert();
    // build ist je Spot konstant
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, DURATION]);

  useEffect(() => {
    if (!tl) return;
    if (!prefersReducedMotion()) {
      if (!playing) {
        tl.pause();
        return;
      }
      // erst nach dem ersten gemalten Bild starten (Aufbau/Dekodieren zählt nicht zur Spotzeit)
      let r2 = 0;
      let watchdog: ReturnType<typeof setTimeout> | undefined;
      const r1 = requestAnimationFrame(
        () =>
          (r2 = requestAnimationFrame(() => {
            tl.play();
            // Wanduhr-Wächter: hängt die Zeitachse (blockierter Hauptthread) hinterher,
            // springt sie rechtzeitig zum Höhepunkt – Nutzen-Satz bzw. QR erscheinen immer
            watchdog = setTimeout(() => {
              if (tl.time() < END_AT) tl.seek(END_AT, false);
            }, (END_AT + 0.6) * 1000);
          })),
      );
      return () => {
        cancelAnimationFrame(r1);
        cancelAnimationFrame(r2);
        clearTimeout(watchdog);
      };
    }
    if (!playing) return;
    // Playhead in 0,3 s zum Standbild führen (alle Zwischenzustände werden korrekt gerendert)
    const timers = STILLS.map((t, i) => setTimeout(() => gsap.to(tl, { time: t, duration: 0.3, ease: 'none', overwrite: true }), (i * DURATION * 1000) / STILLS.length));
    timers.push(setTimeout(() => doneRef.current?.(), DURATION * 1000));
    return () => timers.forEach(clearTimeout);
    // Timing ist je Szene konstant
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tl, playing]);
}

/** Bühne deckend in ihren Rahmen skalieren (einmal je Größenänderung, ohne Re-Render) */
export function useStageFit(ref: RefObject<HTMLElement | null>, w: number, h: number) {
  useLayoutEffect(() => {
    const el = ref.current;
    const box = el?.parentElement;
    if (!el || !box) return;
    const fit = () => {
      const s = Math.max(box.clientWidth / w, box.clientHeight / h);
      el.style.transform = `translate(-50%, -50%) scale(${s})`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    return () => ro.disconnect();
  }, [ref, w, h]);
}

/** Kamera: Punkt (px, py) mit Zoom s in die Bühnenmitte – begrenzt, damit nie ein Bühnenrand sichtbar wird */
export function camTo(px: number, py: number, s: number, w = 1200, h = 1600) {
  const x = Math.min(0, Math.max(w - w * s, w / 2 - px * s));
  const y = Math.min(0, Math.max(h - h * s, h / 2 - py * s));
  return { x, y, scale: s };
}

/** Spot: 12 s, Höhepunkt (Nutzen-Satz) muss erreicht werden */
export const SPOT_TIMING: SceneTiming = { duration: 12, mustReach: 7.2, stills: [1.9, 5.6, 11.2] };
/** Outro: 8 s, QR muss stehen */
export const OUTRO_TIMING: SceneTiming = { duration: 8, mustReach: 2.6, stills: [7.6] };
