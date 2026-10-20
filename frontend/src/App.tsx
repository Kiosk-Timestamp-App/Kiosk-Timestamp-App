import { useState, useEffect, useCallback, lazy, Suspense, useRef } from 'react';
import { ThemeProvider, useTheme } from './context/ThemeProvider';
import { MultiDisplayMap } from './template/MultiDisplayMap';
import { useOptimalDisplayMode } from './hooks/useResponsive';
import type { CompanyAd, CompanyAdsApiResponse } from './template/AdsDisplay';
import { adsScreenDurationMs, promoSceneOf, SCENE_IDS, type SceneId } from './components/Ads/timeline';
import KioskDisplay from './template/KioskDisplay';
import Header from './components/KioskDisplayComponents/Header';
import Footer from './components/KioskDisplayComponents/Footer';
import { apiBaseUrl } from './api/apiBaseUrl';
import { useAutoLanguage } from "./hooks/useLanguageFromApi";
import { LicenseWarning } from './components/License/LicenseWarning';
import { useLicenseCheck } from './hooks/useLicenseCheck';
import KioskMultiDisplay from './template/KioskMultiDisplay';
import { intervalMsOf } from './components/KioskMultiDisplay/systems';
import EnergyInsights from './template/EnergyInsights';
import CompanyInfo, { COMPANY_CYCLE_MS } from './template/CompanyInfo';
import { useSystemConfigurations } from './hooks/useSystemConfiguration';
import { StageDecor } from './design/primitives';
import BrandLogo from './assets/logo-oekovolt-dark.png';
import { delay } from './design/hooks';
const Ads = lazy(() => import('./template/AdsDisplay'));
const preloadAds = () => import('./template/AdsDisplay');

type Screen = 'map' | 'ads' | 'kiosk' | 'insights' | 'company' | 'multiSystem';

/** Energie heute & Prognose: eine Minute · Unternehmensinfo: ein voller Kapitel-Durchlauf */
const INSIGHTS_DURATION = 60 * 1000;
const COMPANY_DURATION = COMPANY_CYCLE_MS;
/** Kiosk-Hauptbildschirm: einheitlicher Standard (Initialwert und Fallback), falls nicht konfiguriert */
const KIOSK_DEFAULT_MIN = 3.5;
/**
 * Unternehmensinfo (5 Kapitel, 90 s) in der Rotation? Kundenvorgabe 20.10.2026: Eigenwerbung nur ganz wenig →
 * aus. Kontakt bleibt über den QR-Code in der News-Leiste erreichbar. `true` = wieder einblenden.
 */
const SHOW_COMPANY_SCREEN = false;
/** Runde für den Spot-Wechsel überdauert einen Neustart (sonst liefe nach jedem Reload wieder Spot 1) */
const PROMO_CYCLE_KEY = 'ov-promo-cycle';
const readPromoCycle = () => {
  try {
    return Number(localStorage.getItem(PROMO_CYCLE_KEY)) || 0;
  } catch {
    return 0;
  }
};
/**
 * Vorschau per Link, zum Mitschauen ohne Warten:
 *   ?screen=map|kiosk|insights|ads|company   Start-Bildschirm
 *   ?spot=drohne|wartung|reinigung|repowering|outro   Spot auf dem Werbe-Bildschirm
 *   ?hold=1   Bildschirm bleibt stehen (keine Rotation)
 * Ohne Parameter läuft der Kiosk ganz normal.
 */
const PREVIEW = (() => {
  const p = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search);
  const screens: Screen[] = ['map', 'kiosk', 'insights', 'ads', 'company'];
  const screen = screens.find((x) => x === p.get('screen')) ?? null;
  const spot = (SCENE_IDS as readonly string[]).includes(p.get('spot') ?? '') ? (p.get('spot') as SceneId) : null;
  return { screen, spot, hold: p.get('hold') === '1' };
})();
/** Vorlauf der Überblendung am Ende der Werbung (ms) */
const SCREEN_OVERLAP_MS = 900;

const areAdsEqual = (a: CompanyAd[], b: CompanyAd[]) => {
  if (a.length !== b.length) return false;
  return a.every((ad, i) => {
    const aKey = `${ad.docname}-${ad.display_zone}-${ad.from_date}-${ad.to_date}-${ad.total_duration}`;
    const bKey = `${b[i].docname}-${b[i].display_zone}-${b[i].from_date}-${b[i].to_date}-${b[i].total_duration}`;
    return aKey === bKey;
  });
};

/**
 * Start-Bühne: Sonnenbahn zeichnet sich, Bildmarke baut sich auf (Rahmen → Fläche → Blitz),
 * Wortmarke und Leitsatz steigen auf, eine Lichtlinie läuft bis zum Start der Anzeige.
 */
function SplashScreen({ label }: { label?: string }) {
  return (
    <div className="ov-stage flex h-screen w-screen items-center justify-center overflow-hidden text-[calc(0.6vw+0.6vh)]">
      <StageDecor />
      <div className="flex flex-col items-center">
        {/* Offizielles Logo groß (Grafik), weich aufgedeckt; dahinter ein ruhiges Grün-Glühen */}
        <div className="relative grid place-items-center">
          <span
            aria-hidden
            className="absolute h-[28em] w-[44em] max-w-[96vw] rounded-full bg-[radial-gradient(closest-side,rgb(140_186_88/0.22),transparent)]"
            style={{ animation: 'ov-fade 1.6s var(--ease-out-quart) 300ms both' }}
          />
          <img src={BrandLogo} alt="ÖKOVOLT Solartechnik" className="ov-logo-reveal relative w-[min(72vw,58vh)] object-contain" />
        </div>
        <span className="ov-rise eyebrow mt-[2.4em] !text-[2.2em] !tracking-[0.16em]" style={delay(900)}>
          {label ?? 'Power of green energy'}
        </span>
        {/* Ladeanzeige ohne vorgetäuschten Fortschritt (unbestimmt, solange geladen wird) */}
        <span className="ov-fade relative mt-[2em] h-[2px] w-[16em] overflow-hidden rounded-full bg-white/10" style={delay(1000)}>
          <span
            className="absolute inset-y-0 left-0 w-[40%] rounded-full bg-[linear-gradient(90deg,transparent,#aed083_60%,#ffd873)]"
            style={{ animation: 'ov-indeterminate 1.8s cubic-bezier(0.45,0,0.55,1) 1000ms infinite' }}
          />
        </span>
      </div>
    </div>
  );
}

/**
 * Fortschrittslinie bis zum nächsten Bildschirm: feine Bahn, darauf ein Lichtband mit leuchtender
 * Spitze, das per translateX hineinläuft (reine Transform-Animation).
 */
function ScreenProgress({ durationMs, runKey }: { durationMs: number; runKey: string }) {
  return (
    <div aria-hidden className="ov-motion-only pointer-events-none absolute inset-x-[1.2%] -top-[calc(0.25vw+0.25vh)] z-20 h-[2px] -translate-y-1/2">
      <div className="absolute inset-0 rounded-full bg-white/[0.07]" />
      <div className="absolute inset-0 overflow-hidden rounded-full">
        <div
          key={runKey}
          className="absolute inset-0 bg-[linear-gradient(90deg,rgb(102_153_51/0)_0%,rgb(102_153_51/0.6)_45%,#aed083_88%,#ffd873_100%)]"
          style={{ animation: `ov-progress-slide ${durationMs}ms linear both` }}
        />
      </div>
      {/* Spitze läuft synchron mit, aber ungeschnitten (Leuchten über die Bahn hinaus) */}
      <div key={`${runKey}-tip`} className="absolute inset-0" style={{ animation: `ov-progress-slide ${durationMs}ms linear both` }}>
        <span className="absolute right-0 top-1/2 size-[6px] -translate-y-1/2 translate-x-1/2 rounded-full bg-[#fff2c4] shadow-[0_0_10px_3px_rgb(255_216_115/0.55)]" />
      </div>
    </div>
  );
}

/** Backend-Werbung (company_ads) anzeigen? Auf `true` setzen, um Kunden-Werbebilder wieder nach den Spots zu zeigen. */
const SHOW_BACKEND_ADS = false;

function AppContent() {
  const [loading, setLoading] = useState(true);
  const [ads, setAds] = useState<CompanyAd[]>([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [currentScreen, setCurrentScreen] = useState<Screen>(PREVIEW.screen ?? 'map');
  const [hasPermanentAds, setHasPermanentAds] = useState(false);
  const [kioskDuration, setKioskDuration] = useState(KIOSK_DEFAULT_MIN * 60 * 1000); // KioskDisplay (aus der Konfiguration)
  const mapDisplayDuration = 1 * 60 * 1000; // Karte: fest 1 Minute
  const { theme, toggleTheme } = useTheme();
  const { screenWidth, screenHeight, aspectRatio } = useOptimalDisplayMode();
  const { languageCode } = useAutoLanguage();
  const { licenseData, loading: licenseLoading } = useLicenseCheck();
  const showMultiSystem = true;
  const { configurations } = useSystemConfigurations();
  const [promoCycle, setPromoCycle] = useState(readPromoCycle);
  const promoScene = PREVIEW.spot ?? promoSceneOf(promoCycle);
  const [currentSystemConfig, setCurrentSystemConfig] = useState<{ company_name: string; place: string } | null>(null);
  const hasSystems = showMultiSystem && !!configurations && configurations.length > 0;

  // Splash nur beim ersten Laden der Anzeigen beenden (nicht bei jedem 10-s-Abruf)
  const firstAdsLoadRef = useRef(true);
  const fetchAds = useCallback(async () => {
    try {
      // Kundenvorgabe (19.10.2026): keine Backend-Werbung mehr – der Werbe-Bildschirm zeigt nur die ÖKOVOLT-Spots + Outro.
      if (!SHOW_BACKEND_ADS) {
        setHasPermanentAds(false);
        setAds([]);
        return;
      }
      const response = await fetch(
        `${apiBaseUrl}kiosk_client_app.system_integration.doctype.company_ads.company_ads.get_active_company_ads_data_if_permanent_is_not_exist`
      );
      const json: CompanyAdsApiResponse = await response.json();

      if (Array.isArray(json.message)) {
        const allAds = json.message;
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        const validPermanentAds = allAds.filter((ad) => {
          if (!ad.is_permanent) return false;
          if (ad.from_date && ad.to_date && (todayStr < ad.from_date || todayStr > ad.to_date)) return false;
          if (ad.all_the_day?.toLowerCase() === 'yes') return true;

          const fromTime = ad.from_time?.split(':');
          const toTime = ad.to_time?.split(':');
          if (!fromTime || !toTime || fromTime.length < 2 || toTime.length < 2) return false;

          const currentMinutes = now.getHours() * 60 + now.getMinutes();
          const fromMinutes = parseInt(fromTime[0]) * 60 + parseInt(fromTime[1]);
          const toMinutes = parseInt(toTime[0]) * 60 + parseInt(toTime[1]);
          return currentMinutes >= fromMinutes && currentMinutes <= toMinutes;
        });

        const usePermanentAds = validPermanentAds.length > 0;
        const newAds = usePermanentAds ? validPermanentAds : allAds;

        setHasPermanentAds(usePermanentAds);
        setAds((prev) => {
          if (!areAdsEqual(prev, newAds)) {
            setCurrentAdIndex(0);
            return newAds;
          }
          return prev;
        });
      } else {
        console.error('Invalid ads response:', json);
        setAds([]);
      }
    } catch (error) {
      console.error('Error fetching ads:', error);
      setAds([]);
    } finally {
      if (firstAdsLoadRef.current) {
        firstAdsLoadRef.current = false;
        setTimeout(() => setLoading(false), 3000);
      }
    }
  }, []);

  const fetchKioskConfig = useCallback(async () => {
    try {
      const response = await fetch(
        `${apiBaseUrl}kiosk_client_app.system_integration.doctype.okosys_settings.okosys_settings.get_kiosk_ads_props`
      );
      const json = await response.json();
      const minutes = json?.message?.kiosk_duration_minutes || KIOSK_DEFAULT_MIN;
      setKioskDuration(minutes * 60 * 1000);
    } catch (err) {
      console.error('Error fetching kiosk config:', err);
    }
  }, []);

  useEffect(() => {
    fetchAds();
    fetchKioskConfig();
    preloadAds();
    const interval = setInterval(fetchAds, 10000);
    return () => clearInterval(interval);
  }, [fetchAds, fetchKioskConfig]);

  // Dauer des aktuellen Bildschirms (steuert Wechsel und Fortschrittslinie)
  const screenDuration = (() => {
    if (currentScreen === 'map') return mapDisplayDuration;
    if (currentScreen === 'kiosk') return kioskDuration;
    if (currentScreen === 'insights') return INSIGHTS_DURATION;
    if (currentScreen === 'company') return COMPANY_DURATION;
    // Werbung: immer die drei Spots, danach (zusätzlich) alle Backend-Anzeigen
    if (currentScreen === 'ads') return adsScreenDurationMs(ads, promoScene);
    if (hasSystems) return configurations!.reduce((total, config) => total + intervalMsOf(config), 0);
    return 60 * 1000;
  })();

  useEffect(() => {
    if (loading || PREVIEW.hold) return;

    // Reihenfolge: Karte → Kiosk → Insights → ein Spot → (Unternehmen, falls eingeschaltet) → Multi-Anlagen.
    const timer = setTimeout(() => {
      if (currentScreen === 'map') {
        setCurrentScreen('kiosk');
      } else if (currentScreen === 'kiosk') {
        // nächster Spot der Reihe – jetzt umschalten, solange der Werbe-Bildschirm unsichtbar ist
        // (beim Verlassen der Werbung würde der neue Spot sonst in der Überblendung aufblitzen)
        setPromoCycle((c) => {
          const n = c + 1;
          try {
            localStorage.setItem(PROMO_CYCLE_KEY, String(n));
          } catch {
            /* ohne Speicher beginnt die Reihe nach einem Neustart wieder vorne */
          }
          return n;
        });
        setCurrentScreen('insights');
      } else if (currentScreen === 'insights') {
        setCurrentScreen('ads');
        setCurrentAdIndex(0);
      } else if (currentScreen === 'ads') {
        if (SHOW_COMPANY_SCREEN) setCurrentScreen('company');
        else setCurrentScreen(hasSystems ? 'multiSystem' : 'map');
      } else if (currentScreen === 'company') {
        setCurrentScreen(hasSystems ? 'multiSystem' : 'map');
      } else {
        setCurrentScreen('map');
      }
      // Werbung: Überblendung startet kurz vor dem Ende des letzten Spots – so entsteht nie ein leerer Frame
    }, currentScreen === 'ads' ? Math.max(1000, screenDuration - SCREEN_OVERLAP_MS) : screenDuration);

    return () => clearTimeout(timer);
  }, [currentScreen, currentAdIndex, ads.length, screenDuration, loading, hasSystems]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Bildschirmwechsel ohne leeren Frame: der zuletzt gezeigte Bildschirm wird als „leaving“ markiert
  // und blendet erst unter dem neuen aus (CSS ov-screen-out); nie gezeigte Bildschirme bleiben still.
  const shownScreen: Screen = hasPermanentAds ? 'ads' : currentScreen;
  // im selben Render setzen (abgeleiteter Zustand) – sonst gäbe es einen Frame ohne „leaving“
  const [screens, setScreens] = useState<{ shown: Screen; leaving: Screen | null }>({ shown: shownScreen, leaving: null });
  if (screens.shown !== shownScreen) setScreens({ shown: shownScreen, leaving: screens.shown });
  const leaving = screens.leaving;
  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => setScreens((st) => ({ ...st, leaving: null })), 1200);
    return () => clearTimeout(t);
  }, [leaving, screens.shown]);

  // Splash liegt über der App und blendet aus, sobald die App steht (kein harter Schnitt)
  const [splashDone, setSplashDone] = useState(false);
  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => setSplashDone(true), 1100);
    return () => clearTimeout(t);
  }, [loading]);

  if (!licenseLoading && licenseData?.isOfflineTooLong) {
    return <LicenseWarning theme={theme} language={languageCode} />;
  }

  if (licenseLoading && !licenseData) return <SplashScreen />;

  const activeScreen: Screen = hasPermanentAds ? 'ads' : currentScreen;
  const headerConfig = activeScreen === 'multiSystem' ? currentSystemConfig : null;

  const screenCls = (screen: Screen) =>
    `ov-screen absolute inset-0 overflow-hidden ${activeScreen === screen ? 'z-10' : 'pointer-events-none z-0'}`;

  return (
    <div className="ov-stage dark h-screen w-screen overflow-hidden font-sans text-white">
      <StageDecor arc={false} calm={activeScreen === 'ads'} />
      <div className="flex h-full w-full flex-col gap-[calc(0.5vw+0.5vh)] p-[calc(0.8vw+0.8vh)]">
        <Header theme={theme} toggleTheme={toggleTheme} language={languageCode} currentSystemConfig={headerConfig} screen={activeScreen} />

        <main className="relative min-h-0 flex-1">
          {/* Fortschrittslinie bis zum nächsten Bildschirm */}
          {/* Company hat eine eigene Kapitel-Fortschrittsanzeige → keine zweite Linie */}
          {!hasPermanentAds && activeScreen !== 'company' && <ScreenProgress durationMs={screenDuration} runKey={`${currentScreen}-${currentAdIndex}`} />}

          {/* Lichtschwenk bei jedem Bildschirmwechsel */}
          {!hasPermanentAds && (
            <div key={activeScreen} aria-hidden className="pointer-events-none absolute inset-0 z-30 overflow-hidden rounded-3xl">
              <span className="ov-sweep" />
            </div>
          )}

          {hasPermanentAds ? (
            <div className="h-full w-full">
              {ads.length > 0 && (
                <Suspense fallback={<SplashScreen />}>
                  <Ads ads={ads} language={languageCode} />
                </Suspense>
              )}
            </div>
          ) : (
            <>
              <div className={screenCls('map')} data-active={activeScreen === 'map'} data-leaving={leaving === 'map' || undefined}>
                <MultiDisplayMap
                  isFullscreen={false}
                  screenWidth={screenWidth}
                  screenHeight={screenHeight}
                  aspectRatio={aspectRatio}
                  language={languageCode}
                />
              </div>
              <div className={screenCls('kiosk')} data-active={activeScreen === 'kiosk'} data-leaving={leaving === 'kiosk' || undefined}>
                <KioskDisplay screenWidth={screenWidth} screenHeight={screenHeight} aspectRatio={aspectRatio} language={languageCode} />
              </div>
              <div className={screenCls('insights')} data-active={activeScreen === 'insights'} data-leaving={leaving === 'insights' || undefined}>
                <EnergyInsights language={languageCode} />
              </div>
              {(SHOW_COMPANY_SCREEN || PREVIEW.screen === 'company') && (
                <div className={screenCls('company')} data-active={activeScreen === 'company'} data-leaving={leaving === 'company' || undefined}>
                  <CompanyInfo language={languageCode} />
                </div>
              )}
              <div className={screenCls('ads')} data-active={activeScreen === 'ads'} data-leaving={leaving === 'ads' || undefined}>
                {/* Werbe-Spots laufen immer; Backend-Anzeigen folgen im selben Bildschirm */}
                <Suspense fallback={null}>
                  <Ads ads={ads} scenes only={promoScene} language={languageCode} />
                </Suspense>
              </div>
              {showMultiSystem && configurations && (
                <div className={screenCls('multiSystem')} data-active={activeScreen === 'multiSystem'} data-leaving={leaving === 'multiSystem' || undefined}>
                  <KioskMultiDisplay
                    language={languageCode}
                    screenWidth={screenWidth}
                    screenHeight={screenHeight}
                    aspectRatio={aspectRatio}
                    configurations={configurations}
                    onSystemChange={setCurrentSystemConfig}
                    isFullscreen={true}
                  />
                </div>
              )}
            </>
          )}
        </main>

        <Footer theme={theme} language={languageCode} paused={activeScreen === 'ads'} />
      </div>
      {!splashDone && (
        <div className={`fixed inset-0 z-[100] ${loading ? '' : 'ov-splash-out'}`}>
          <SplashScreen />
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </>
  );
}

export default App;
