/**
 * QR-Ziele der Werbe-Spots – zentral an EINER Stelle.
 * Pfade werden an die im Backend hinterlegte Website gehängt; volle URLs (https://…) gelten unverändert.
 * Hinweis: Auf der aktuellen Live-Domain fehlen einige /service-Seiten noch (bis zum Launch der neuen Website akzeptiert).
 */
export const AD_LINKS = {
  drohne: '/service/drohneninspektion',
  wartung: '/service/wartung',
  reinigung: '/service/reinigung',
  repowering: '/service/repowering',
  /** Outro: allgemeine Anfrage (wie auf der TV-Seite: „Angebot anfragen“) */
  outro: '/angebot',
} as const;
