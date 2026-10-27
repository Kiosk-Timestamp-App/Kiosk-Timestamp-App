import { decodeScene } from './assets';
import { prepareQr, targetUrl } from './hooks';
import { AD_LINKS } from './links';

/** Erste Szene + Outro-QR vorbereiten; weitere Szenen dekodiert AdsDisplay jeweils während der vorigen */
export function preloadSpots(website: string | null) {
  return Promise.all([decodeScene('drohne'), prepareQr(targetUrl(website, AD_LINKS.outro))]);
}
export { decodeScene };
