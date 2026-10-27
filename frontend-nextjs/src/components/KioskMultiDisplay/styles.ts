/**
 * Übergänge der Multi-Anlagen-Ansicht. Nur transform/opacity (TV-tauglich),
 * Kurven: easeOutExpo für Eintritte, easeOutQuart für Wechsel.
 */
export const MULTI_CSS = `
.ov-ms-layer { position: absolute; inset: 0; }
.ov-ms-pre { visibility: hidden; pointer-events: none; }
.ov-ms-enter { animation: ov-ms-in 1400ms cubic-bezier(0.16,1,0.3,1) 420ms both; }
.ov-ms-out { pointer-events: none; animation: ov-ms-out 520ms cubic-bezier(0.5,0,0.75,0) both; }
@keyframes ov-ms-in {
  from { opacity: 0; transform: translate3d(4%,0,0) scale(0.97); }
}
@keyframes ov-ms-out {
  to { opacity: 0; transform: translate3d(-3%,0,0) scale(0.97); }
}
.ov-ms-sweep { position: absolute; inset: 0; z-index: 5; overflow: hidden; pointer-events: none; border-radius: 28px; }
.ov-ms-sweep::before {
  content: ""; position: absolute; top: -10%; bottom: -10%; left: 0; width: 28%;
  background: linear-gradient(90deg, transparent, rgb(174 208 131 / 0.10) 35%, rgb(255 231 163 / 0.22) 50%, rgb(174 208 131 / 0.10) 65%, transparent);
  transform: translate3d(-120%,0,0) skewX(-12deg);
  animation: ov-ms-sweep 1500ms cubic-bezier(0.25,1,0.5,1) 150ms both;
}
@keyframes ov-ms-sweep {
  0% { transform: translate3d(-120%,0,0) skewX(-12deg); opacity: 0; }
  15% { opacity: 1; }
  100% { transform: translate3d(420%,0,0) skewX(-12deg); opacity: 0; }
}
.ov-ms-card { animation: ov-ms-card 2400ms cubic-bezier(0.16,1,0.3,1) both; }
@keyframes ov-ms-card {
  0% { opacity: 0; transform: translate3d(0,18px,0) scale(0.94); }
  18% { opacity: 1; transform: none; }
  72% { opacity: 1; transform: none; }
  100% { opacity: 0; transform: translate3d(0,-10px,0) scale(0.98); }
}
@media (prefers-reduced-motion: reduce) {
  .ov-ms-enter { animation: ov-fade 400ms ease-out both; }
  .ov-ms-out { animation: ov-ms-fade-out 300ms ease-out both; }
  .ov-ms-sweep { display: none; }
  .ov-ms-card { animation: ov-ms-fade-card 2400ms linear both; }
  @keyframes ov-ms-fade-out { to { opacity: 0; } }
  @keyframes ov-ms-fade-card { 0%, 100% { opacity: 0; } 10%, 85% { opacity: 1; } }
}
`;
