import { useCallback, useState } from 'react';

/**
 * Beobachtet den umgebenden App-Bildschirm (`.ov-screen[data-active]`).
 * - `active`: ob der Bildschirm gerade sichtbar ist (ohne umgebenden Bildschirm immer true)
 * - `round`: zählt jedes erneute Aktivwerden hoch – als `key` genutzt startet Inhalt
 *   (Rotation, Wiedergabelisten, Fortschrittsbalken) bei jedem Auftritt von vorn.
 */
export function useScreenActivation() {
  const [state, setState] = useState({ active: true, round: 0 });

  const ref = useCallback((el: HTMLElement | null) => {
    const screen = el?.closest<HTMLElement>('.ov-screen');
    if (!screen) return;
    let last = screen.dataset.active !== 'false';
    setState((s) => (s.active === last ? s : { ...s, active: last }));
    const mo = new MutationObserver(() => {
      const now = screen.dataset.active !== 'false';
      if (now === last) return;
      last = now;
      setState((s) => ({ active: now, round: now ? s.round + 1 : s.round }));
    });
    mo.observe(screen, { attributes: true, attributeFilter: ['data-active'] });
    return () => mo.disconnect();
  }, []);

  return { ref, ...state };
}
