import type { CompanyAd } from '../../template/AdsDisplay';

/** Spot: Hook 0–2 s · Beweis 2–7 s · Höhepunkt + Nutzen-Satz ab 7 s · Plakat-Standbild bis 12 s */
export const SPOT_MS = 12_000;
/** Gemeinsames ÖKOVOLT-Outro nach dem letzten Spot (Logo, Claim, QR) */
export const OUTRO_MS = 8_000;
/** Reihenfolge – läuft IMMER vor den Firmen-Anzeigen aus dem Backend */
export const SCENE_IDS = ['drohne', 'wartung', 'reinigung', 'repowering', 'outro'] as const;
export type SceneId = (typeof SCENE_IDS)[number];
export const sceneMs = (id: SceneId) => (id === 'outro' ? OUTRO_MS : SPOT_MS);
export const SCENES_TOTAL_MS = SCENE_IDS.reduce((t, id) => t + sceneMs(id), 0);

/** Anzeigedauer einer Backend-Anzeige (`total_duration` oder 5 s) */
export const adDurationMs = (ad: CompanyAd) => Math.max(1, ad.total_duration || 5) * 1000;

/**
 * Ruhiges Konzept (Kundenvorgabe 20.10.2026: Eigenwerbung nur ganz wenig):
 * pro Runde genau EIN Spot (12 s), reihum – nach vier Runden waren alle Spots einmal zu sehen.
 * Kein Outro (Marke steht dauerhaft in der Kopfzeile, QR zur Website in der News-Leiste).
 */
export const PROMO_ROTATION = ['drohne', 'wartung', 'reinigung', 'repowering'] as const satisfies readonly SceneId[];
export const promoSceneOf = (cycle: number): SceneId => PROMO_ROTATION[((cycle % PROMO_ROTATION.length) + PROMO_ROTATION.length) % PROMO_ROTATION.length];

/** Gesamtdauer des Werbe-Bildschirms: Spot(s) + alle Backend-Anzeigen (Wanduhr). `only` = nur dieser eine Spot */
export const adsScreenDurationMs = (ads: CompanyAd[], only?: SceneId) =>
  (only ? sceneMs(only) : SCENES_TOTAL_MS) + ads.reduce((t, ad) => t + adDurationMs(ad), 0);
