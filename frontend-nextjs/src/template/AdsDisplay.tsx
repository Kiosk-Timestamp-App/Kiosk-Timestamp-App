import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import ZoneScreenOne from "../components/Ads/zone1";
import ZoneScreenTwo from "../components/Ads/zone2";
import ZoneScreenThree from "../components/Ads/zone3";
import ZoneScreenFour from "../components/Ads/zone4";
import { AdFrame } from "../components/Ads/AdFrame";
import { ADS_CSS } from "../components/Ads/styles";
import { mediaUrl } from "../components/Ads/adMedia";
import { adDurationMs, SCENE_IDS, sceneMs, type SceneId } from "../components/Ads/timeline";
import { useScreenActivation } from "../components/Ads/useScreenActivation";
import { useLogoAndWebsite } from "../hooks/useLogoAndWebsite";

/** Werbe-Spots (GSAP + vorgerenderte Ebenen) als eigenes Paket */
const loadScenes = () => import("../components/Ads/scenes/Scenes");
const Scene = lazy(loadScenes);

export interface ZoneRow {
  duration: number;
  replay: string;
  type: "Image" | "Video";
  attach_file: string;
  file_name: string;
  /** optional: Überschrift, wird im Rahmen eingeblendet */
  title?: string;
}

export interface ZoneData {
  zone: string;
  rows: ZoneRow[];
}

export interface CompanyAd {
  docname: string;
  display_zone: string;
  from_date: string;
  to_date: string;
  from_time: string;
  to_time: string;
  total_duration: number;
  all_the_day: "Yes" | "No";
  background_color: string;
  zones_data: ZoneData[];
  is_permanent: boolean;
  /** optional: Kennzeichnung im Eyebrow (z. B. „Angebot“, „Partner“); Standard „Anzeige“ */
  title?: string;
}

export interface CompanyAdsApiResponse {
  message: CompanyAd[];
}

interface AdsProps {
  ads: CompanyAd[];
  language?: string | null;
  /** true: zuerst die Werbe-Spots, danach die Backend-Anzeigen (normaler Bildschirm-Wechsel) */
  scenes?: boolean;
  /** nur diesen einen Spot zeigen (ruhiges Konzept: ein Spot pro Runde) */
  only?: SceneId;
}

type Item = { kind: "scene"; id: SceneId; key: string; ms: number } | { kind: "ad"; ad: CompanyAd; key: string; ms: number };
type Slot = { item: Item; run: number };

const storedLanguage = () => {
  try {
    return localStorage.getItem("autoLanguage");
  } catch {
    return null;
  }
};

/**
 * Signatur-Übergang: ein Modulraster-Paneel fährt herein, bis es das Bild VOLL deckt (Animation 1),
 * erst dann wird getauscht; danach fährt es hinaus (Animation 2). Der Tausch hängt am Ende der
 * Abdeck-Animation, nicht an einem Timer → nie ein unverdecktes Bild beim Wechsel.
 */
const COVER_MS = 520;
const REVEAL_MS = 620;
/** Sicherheitsnetz, falls Web-Animationen fehlen oder hängen */
const WIPE_FAILSAFE_MS = 2600;

/** Bilder einer Anzeige vorab laden UND dekodieren (kein leerer Rahmen, kein Hänger beim Wechsel) */
const decodedAds = new Map<string, HTMLImageElement>();
const preloadAd = (ad: CompanyAd) =>
  ad.zones_data?.forEach((z) =>
    z.rows?.forEach((r) => {
      const src = mediaUrl(r.attach_file);
      if (r.type !== "Image" || decodedAds.has(src)) return;
      const img = new Image();
      img.decoding = "async";
      img.src = src;
      decodedAds.set(src, img);
      img.decode().catch(() => undefined);
    }),
  );
/** Vorlauf, mit dem der nächste Beitrag unsichtbar aufgebaut wird (Spots länger wegen GSAP-Aufbau) */
const PREMOUNT_SCENE_MS = 2600;
const PREMOUNT_AD_MS = 1200;

/**
 * Werbe-Bildschirm.
 * - Mit `scenes`: vier Spots à 14 s (Wechsel über das Timeline-Ende = Wanduhr), danach jede
 *   Backend-Anzeige für `total_duration` s. App.tsx taktet den Bildschirm mit derselben Gesamtdauer.
 * - Ohne `scenes` (permanente Anzeigen): Backend-Anzeigen rotieren endlos wie bisher.
 * Der ausgehende Beitrag bleibt dieselbe Instanz (kein Neuaufbau) und wird vom Übergang verdeckt.
 */
function Ads({ ads, language, scenes = false, only }: AdsProps) {
  const { ref, active, round } = useScreenActivation();
  const lang = language ?? storedLanguage();
  const website = useLogoAndWebsite().data?.website ?? null;

  const items: Item[] = [
    ...(scenes ? (only ? [only] : SCENE_IDS).map((id) => ({ kind: "scene" as const, id, key: `scene-${id}`, ms: sceneMs(id) })) : []),
    ...ads.map((ad, i) => ({ kind: "ad" as const, ad, key: `ad-${ad.docname}-${i}`, ms: adDurationMs(ad) })),
  ];
  const count = items.length;

  const [state, setState] = useState({ index: 0, run: 0, round });
  const [leaving, setLeaving] = useState<Slot | null>(null);
  // nächste Szene ~2,6 s vorher unsichtbar aufbauen (Bilder dekodiert, kein Hänger beim Wechsel)
  const [premount, setPremount] = useState(false);
  /** Übergangsphase: 'cover' = Paneel fährt herein (Alt sichtbar, Neu verborgen), 'reveal' = Paneel fährt hinaus */
  const [phase, setPhase] = useState<"cover" | "reveal">("cover");
  const wipeRef = useRef<HTMLDivElement>(null);
  if (state.round !== round) {
    setState({ index: 0, run: state.run + 1, round });
    setLeaving(null);
  }
  const index = count ? state.index % count : 0;
  const item = items[index];
  const loop = !scenes && (count > 1 || (item?.kind === "ad" && !!item.ad.is_permanent));
  const canAdvance = scenes ? index < count - 1 : loop;

  // Spots + QR-Codes vorbereiten, sobald die Komponente lebt (lange bevor der Bildschirm erscheint)
  useEffect(() => {
    if (!scenes) return;
    import("../components/Ads/scenes/preload").then((m) => m.preloadSpots(website)).catch(() => undefined);
  }, [scenes, website]);

  const itemRef = useRef(item);
  itemRef.current = item;
  const runRef = useRef(state.run);
  runRef.current = state.run;

  const advance = useCallback(
    (fromRun: number) => {
      if (fromRun !== runRef.current || !canAdvance) return;
      const cur = itemRef.current;
      if (cur) setLeaving({ item: cur, run: fromRun });
      setPhase("cover");
      setPremount(false);
      setState((s) => ({ ...s, index: (s.index + 1) % count, run: s.run + 1 }));
    },
    [canAdvance, count],
  );

  // Takt auf der Wanduhr: Ende jedes Beitrags = Bildschirmstart + Summe der Dauern
  // (identisch zu adsScreenDurationMs in App.tsx → kein Auseinanderlaufen, letzter Beitrag steht bis zum Wechsel)
  const itemMs = item?.ms ?? 0;
  const startRef = useRef(0);
  const startKey = `${round}-${active}`;
  const startKeyRef = useRef("");
  if (active && startKeyRef.current !== startKey) {
    startKeyRef.current = startKey;
    startRef.current = performance.now();
  }
  const endAt = scenes ? startRef.current + items.slice(0, index + 1).reduce((t, it) => t + it.ms, 0) : 0;
  useEffect(() => {
    if (!itemMs || !active || !canAdvance) return;
    const run = state.run;
    const wait = scenes ? Math.max(0, endAt - performance.now()) : itemMs;
    const t = setTimeout(() => advance(run), wait);
    return () => clearTimeout(t);
  }, [itemMs, active, canAdvance, state.run, advance, scenes, endAt]);

  const nextItem = canAdvance ? items[(index + 1) % Math.max(1, count)] : undefined;
  const nextKind = nextItem?.kind;
  useEffect(() => {
    if (!active || !nextKind || !itemMs) return;
    const lead = nextKind === "scene" ? PREMOUNT_SCENE_MS : PREMOUNT_AD_MS;
    const t = setTimeout(() => setPremount(true), Math.max(0, (scenes ? endAt - performance.now() : itemMs) - lead));
    return () => clearTimeout(t);
  }, [active, nextKind, itemMs, state.run, scenes, endAt]);

  // Nächstes Medium vorladen bzw. dekodieren
  useEffect(() => {
    const next = items[(index + 1) % Math.max(1, count)];
    if (next?.kind === "ad") preloadAd(next.ad);
    if (next?.kind === "scene") import("../components/Ads/scenes/preload").then((m) => m.decodeScene(next.id)).catch(() => undefined);
    // nur beim Wechsel des Beitrags
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, count]);

  // Übergang über Web-Animationen: Tausch erst, wenn das Paneel deckt
  const reduced = typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  useLayoutEffect(() => {
    if (!leaving) return;
    const el = wipeRef.current;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      // Endlage festschreiben, damit das Paneel beim Phasenwechsel keinen Frame zurückspringt
      if (el) el.style.transform = phase === "cover" ? "translate3d(0,0,0)" : "translate3d(-108%,0,0)";
      if (phase === "cover") setPhase("reveal");
      else setLeaving(null);
    };
    if (!el || reduced || typeof el.animate !== "function") {
      const t = setTimeout(finish, reduced ? 0 : 50);
      return () => clearTimeout(t);
    }
    const anim =
      phase === "cover"
        ? el.animate([{ transform: "translate3d(108%,0,0)" }, { transform: "translate3d(0,0,0)" }], { duration: COVER_MS, easing: "cubic-bezier(0.7,0,0.25,1)", fill: "forwards" })
        : el.animate([{ transform: "translate3d(0,0,0)" }, { transform: "translate3d(-108%,0,0)" }], { duration: REVEAL_MS, easing: "cubic-bezier(0.5,0,0.2,1)", delay: 60, fill: "both" });
    anim.finished.then(finish, () => undefined);
    const t = setTimeout(finish, WIPE_FAILSAFE_MS);
    return () => {
      clearTimeout(t);
      done = true;
      anim.cancel();
    };
  }, [leaving, phase, reduced]);

  const renderAd = (ad: CompanyAd) => {
    switch (ad.display_zone) {
      case "Zone 1":
        return <ZoneScreenOne ad={ad} language={lang} />;
      case "Zone 2":
        return <ZoneScreenTwo ad={ad} language={lang} />;
      case "Zone 3":
        return <ZoneScreenThree ad={ad} language={lang} />;
      case "Zone 4":
        return <ZoneScreenFour ad={ad} language={lang} />;
      default:
        return (
          <div className="grid h-full">
            <AdFrame ad={ad} zone={ad.zones_data?.[0]?.zone ?? "Zone 1"} language={lang} badge />
          </div>
        );
    }
  };

  const renderItem = (slot: Slot, playing: boolean) =>
    slot.item.kind === "scene" ? (
      <Suspense fallback={<div className="h-full rounded-[28px] bg-[#071736]" />}>
        <Scene id={slot.item.id} playing={playing} website={website} onDone={scenes ? undefined : () => advance(slot.run)} />
      </Suspense>
    ) : (
      renderAd(slot.item.ad)
    );

  const slots: { slot: Slot; role: "cur" | "out" | "next" }[] = [];
  const covering = !!leaving && leaving.run !== state.run && phase === "cover";
  if (item) slots.push({ slot: { item, run: state.run }, role: "cur" });
  if (covering && leaving) slots.push({ slot: leaving, role: "out" });
  if (premount && nextItem && nextItem.key !== item?.key) slots.push({ slot: { item: nextItem, run: state.run + 1 }, role: "next" });

  return (
    <div ref={ref} className={`relative h-full w-full overflow-hidden text-[1.5vmin] text-white ${active ? "" : "ov-ads-paused"}`}>
      <style>{ADS_CSS}</style>
      {slots.map(({ slot, role }) => (
        // Schlüssel = Lauf → der ausgehende Beitrag behält seine Instanz (kein Sprung zurück auf t = 0)
        <div
          key={`${slot.item.key}-${slot.run}`}
          className="absolute inset-0"
          style={{ zIndex: role === "out" ? 2 : role === "next" ? 0 : 1, visibility: role === "cur" && covering ? "hidden" : "visible", opacity: role === "next" ? 0.001 : 1 }}
          aria-hidden={role !== "cur"}
        >
          {renderItem(slot, role === "cur" && active && !covering)}
        </div>
      ))}
      {leaving && !reduced && (
        <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden rounded-[28px]" aria-hidden>
          <div ref={wipeRef} key={`wipe-${leaving.run}`} className="ov-ads-panel absolute inset-y-0 -left-[6%] -right-[6%]" style={{ transform: "translate3d(108%,0,0)" }} />
        </div>
      )}
    </div>
  );
}

export default Ads;
