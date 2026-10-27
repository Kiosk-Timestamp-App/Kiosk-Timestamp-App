/** Bewegung des Werbe-Bildschirms: nur transform/opacity (TV-tauglich). */
export const ADS_CSS = `
.ov-ad-layer { position: absolute; inset: 0; animation: ov-ad-in 900ms cubic-bezier(0.25,1,0.5,1) both; }
@keyframes ov-ad-in { from { opacity: 0; } }
.ov-ad-kb { will-change: transform; animation-timing-function: cubic-bezier(0.33,0,0.67,1); animation-fill-mode: both; }
@keyframes ov-ad-kb-0 { from { transform: scale(1.0) translate3d(0,0,0); } to { transform: scale(1.07) translate3d(-1.5%,-1%,0); } }
@keyframes ov-ad-kb-1 { from { transform: scale(1.07) translate3d(1.5%,0,0); } to { transform: scale(1.0) translate3d(0,0,0); } }
@keyframes ov-ad-kb-2 { from { transform: scale(1.0) translate3d(0,0,0); } to { transform: scale(1.07) translate3d(1.5%,1%,0); } }
@keyframes ov-ad-kb-3 { from { transform: scale(1.06) translate3d(0,1.2%,0); } to { transform: scale(1.0) translate3d(0,-0.5%,0); } }
.ov-ads-paused * { animation-play-state: paused !important; }
/* Signatur-Übergang: Modulraster-Paneel mit grüner Vorderkante (Bewegung per Web-Animation in AdsDisplay) */
.ov-ads-panel {
  background:
    linear-gradient(90deg, #8cba58 0, #aed083 0.6%, rgb(174 208 131 / 0) 3%),
    repeating-linear-gradient(90deg, rgb(159 193 242 / 0.16) 0 2px, transparent 2px 16.6%),
    repeating-linear-gradient(0deg, rgb(159 193 242 / 0.12) 0 2px, transparent 2px 9%),
    linear-gradient(180deg, #0d2552, #071736);
  will-change: transform;
}
@media (prefers-reduced-motion: reduce) {
  .ov-ad-kb { animation: none !important; }
}
`;
