import { useId, useMemo, type CSSProperties } from 'react';
import { ArrowDownLeft, ArrowUpRight, CloudOff } from 'lucide-react';
import { tr } from '../../../design/hooks';
import { CI_MAX, CI_THRESHOLDS, FLAGS, T, ciColor, ciGradientCss, fmtMW, fmtStamp, localeOf, unitFor, zoneIso, type Lang, type ZoneConfig } from './config';
import { allCountries, centroid, countryByIso, countryName, project, sharedBorderPoint, type Pt } from './geo';
import { buildHeadline } from './headline';
import { baseEm, useSize } from './useSize';
import type { PowerBreakdown } from './useGridData';

/* Import kühles Blau, Export Markengrün – auch bei Deuteranopie klar getrennt; zusätzlich Pfeilrichtung + Wort */
const IMPORT_C = '#8DB8F0';
const EXPORT_C = '#AED083';

interface Flow {
  zone: string;
  iso: string;
  name: string;
  mw: number;
  dir: 'import' | 'export';
  d: string;
  head: string;
  /** Ankunftspunkt des Energiepakets (Import: im Land, Export: beim Nachbarn) */
  arrive: Pt;
  /** Start/Ende der Ader (für den Richtungsverlauf) */
  from: Pt;
  to: Pt;
  /** vorab berechnete Punkte entlang der Ader (für transform-Keyframes) */
  pts: Pt[];
  width: number;
  /** √(MW / größter Fluss) – steuert Dicke, Paketgröße und Tempo */
  ratio: number;
  chip: Pt;
  /** halbe Etikettbreite (am Inhalt bemessen) */
  hw: number;
  compact: boolean;
  /** Umlaufdauer: je mehr MW, desto schneller fließt die Energie */
  dur: number;
}

type Rect = [number, number, number, number]; // cx, cy, halbe Breite, halbe Höhe

interface Props {
  zone: ZoneConfig;
  power: PowerBreakdown | null;
  ci: number | null;
  loading: boolean;
  error: boolean;
  cachedAt: number | null;
  language: Lang;
}

/** Pfeil (quadratische Kurve) von s nach e mit Pfeilspitze; Krümmung quer zur Richtung u */
function arrow(s: Pt, e: Pt, u: Pt, width: number) {
  const len = Math.hypot(e[0] - s[0], e[1] - s[1]);
  const ctrl: Pt = [(s[0] + e[0]) / 2 - u[1] * len * 0.16, (s[1] + e[1]) / 2 + u[0] * len * 0.16];
  const tx = e[0] - ctrl[0];
  const ty = e[1] - ctrl[1];
  const tn = Math.hypot(tx, ty) || 1;
  const ax = tx / tn;
  const ay = ty / tn;
  const hs = width * 2.9;
  const tip: Pt = [e[0] + ax * hs * 0.6, e[1] + ay * hs * 0.6];
  // Punkte entlang der Kurve, zeitlich sanft beschleunigt/abgebremst (ease-in-out)
  const pts: Pt[] = Array.from({ length: 33 }, (_, i) => {
    const p = i / 32;
    const t = 0.5 - Math.cos(Math.PI * p) / 2;
    const mt = 1 - t;
    return [mt * mt * s[0] + 2 * mt * t * ctrl[0] + t * t * e[0], mt * mt * s[1] + 2 * mt * t * ctrl[1] + t * t * e[1]];
  });
  return {
    pts,
    d: `M${s[0]} ${s[1]}Q${ctrl[0]} ${ctrl[1]} ${e[0]} ${e[1]}`,
    head: `M${tip[0]} ${tip[1]}L${tip[0] - ax * hs - ay * hs * 0.62} ${tip[1] - ay * hs + ax * hs * 0.62}L${tip[0] - ax * hs + ay * hs * 0.62} ${tip[1] - ay * hs - ax * hs * 0.62}Z`,
    tip,
  };
}

const inRect = (p: Pt, r: Rect, pad = 0) => Math.abs(p[0] - r[0]) < r[2] + pad && Math.abs(p[1] - r[1]) < r[3] + pad;
const overlap = (a: Rect, b: Rect, pad = 0) => Math.abs(a[0] - b[0]) < a[2] + b[2] + pad && Math.abs(a[1] - b[1]) < a[3] + b[3] + pad;

/**
 * Karte auf der Navy-Bühne: Fokusland nach CO₂-Intensität eingefärbt, Nachbarn neutral (keine Daten),
 * Import/Export als „Lebensadern“: Licht-Pulse laufen über die Grenze, Tempo und Stärke = echte MW;
 * kommt ein Import-Puls an, breitet sich eine Welle im Land aus. Das Land atmet ruhig (nur Opazität).
 * Aufbau: Kopf (Satz zur Netzlage) · Karte · Legendenleiste – nichts liegt über der Karte.
 */
export function FlowMap({ zone, power, ci, loading, error, cachedAt, language }: Props) {
  const uid = useId().replace(/:/g, '');
  const L = (t: Parameters<typeof tr>[1]) => tr(language, t);
  const [ref, { w: W, h: H }] = useSize<HTMLDivElement>();

  const focus = countryByIso(zone.code)!;
  const focusName = countryName(focus, language);
  const focusColor = ci != null ? ciColor(ci) : '#9AA6BC'; // ohne Daten neutral, nie „grün“

  const view = useMemo(() => {
    if (!W || !H) return null;
    const em = baseEm();
    const [x0, y0, x1, y1] = focus.bbox;
    const pad = zone.pad ?? 0.3;
    const tw = (x1 - x0) * (1 + 2 * pad);
    const th = (y1 - y0) * (1 + 2 * pad);
    const ar = W / H;
    const w = tw / th > ar ? tw : th * ar;
    const h = w / ar;
    const vx = (x0 + x1) / 2 - w / 2;
    const vy = (y0 + y1) / 2 - h / 2;
    const k = W / w;
    const toPx = ([x, y]: Pt): Pt => [(x - vx) * k, (y - vy) * k];
    const inView = (b: [number, number, number, number]) => b[2] > vx - w * 0.5 && b[0] < vx + w * 1.5 && b[3] > vy - h * 0.5 && b[1] < vy + h * 1.5;
    return { vx, vy, w, h, k, toPx, inView, em, s: em / 16 };
  }, [W, H, focus, zone.pad]);

  /* Netto-Fluss je Nachbarzone (echte Werte) */
  const nets = useMemo(() => {
    if (!power) return [];
    const imp = power.powerImportBreakdown ?? {};
    const exp = power.powerExportBreakdown ?? {};
    return Array.from(new Set([...Object.keys(imp), ...Object.keys(exp)]))
      .map((z) => ({ z, net: (imp[z] ?? 0) - (exp[z] ?? 0) }))
      .filter((f) => Math.abs(f.net) >= 1);
  }, [power]);

  // Fokus-Etikett (Ausgangslage); wird unten so verschoben, dass es keine Pfeilspitze verdeckt
  const focusBase = useMemo<Rect | null>(() => {
    const p = view && focus.props.label_x != null && focus.props.label_y != null ? view.toPx(project(focus.props.label_x, focus.props.label_y)) : null;
    return view && p ? [p[0], p[1], ((focusName.length * 0.72 + 9.5) * view.em) / 2, 1.5 * view.em] : null;
  }, [view, focus, focusName]);

  const { flows, focusRect } = useMemo<{ flows: Flow[]; focusRect: Rect | null }>(() => {
    if (!view || !nets.length) return { flows: [], focusRect: focusBase };
    const { em, s } = view;
    const C = view.toPx(centroid(focus.mainRing));
    const maxMw = Math.max(1, ...nets.map((f) => Math.abs(f.net)));
    const m = Math.min(W, H);
    // lange, selbstbewusste Adern: aus dem Inneren des Nachbarn bis ins Landesinnere
    const Lout = Math.max(5 * em, Math.min(11 * em, m * 0.2));
    const Lin = Math.max(3.5 * em, Math.min(6.5 * em, m * 0.11));
    const compact = nets.length > 6; // viele Nachbarn (DE): kompakte Etiketten
    const hh = ((compact ? 3.3 : 4.1) * em) / 2;

    interface Draft {
      f: Flow;
      B: Pt;
      u: Pt;
    }
    const hw = (d: Draft) => d.f.hw;
    const out: Draft[] = [];
    for (const { z, net } of nets) {
      const iso = zoneIso(z);
      const ov = zone.overrides?.[z];
      const nb = countryByIso(iso);
      const B0 = ov?.at ? project(ov.at[1], ov.at[0]) : nb ? sharedBorderPoint(focus, nb) : null;
      if (!B0) continue;
      const B = view.toPx(B0);
      // Richtung: von der Grenze zum Nachbarn (Etikettpunkt), sonst vom Landesinneren weg
      const Lp = nb?.props.label_x != null && nb.props.label_y != null ? view.toPx(project(nb.props.label_x, nb.props.label_y)) : null;
      let u: Pt = Lp ? [Lp[0] - B[0], Lp[1] - B[1]] : [B[0] - C[0], B[1] - C[1]];
      const out0: Pt = [B[0] - C[0], B[1] - C[1]];
      // nie ins eigene Land zeigen
      if (u[0] * out0[0] + u[1] * out0[1] < 0) u = out0;
      const n = Math.hypot(u[0], u[1]) || 1;
      u = [u[0] / n, u[1] / n];
      const name = countryName(nb, language) + (ov?.suffix ? ` ${ov.suffix}` : '');
      const dir = net > 0 ? 'import' : 'export';
      // Etikett am Inhalt bemessen: Zeile 1 „Import · Land“ (bzw. nur Land), Zeile 2 Wert
      const line1 = compact ? name : `${tr(language, dir === 'import' ? T.import : T.export)} · ${name}`;
      const line2 = fmtMW(Math.abs(net), 'MW', language);
      const cw = ((Math.max(line1.length * (compact ? 0.6 : 0.58), line2.length * (compact ? 0.66 : 0.84) + 1.4) + (compact ? 3.4 : 4.4)) * em) / 2;
      const chipD = Math.min(cw / Math.max(Math.abs(u[0]), 0.01), hh / Math.max(Math.abs(u[1]), 0.01)) + 0.8 * em;
      const ratio = Math.sqrt(Math.abs(net) / maxMw);
      out.push({
        B,
        u,
        f: {
          zone: z,
          iso,
          name,
          mw: Math.abs(net),
          dir,
          d: '',
          head: '',
          arrive: B,
          from: B,
          to: B,
          pts: [],
          width: (3.5 + 9 * ratio) * s,
          ratio,
          compact,
          hw: cw,
          chip: [B[0] + u[0] * (Lout + chipD), B[1] + u[1] * (Lout + chipD)],
          dur: 5.6 - 3.2 * ratio,
        },
      });
    }

    const rectOf = (d: Draft): Rect => [d.f.chip[0], d.f.chip[1], hw(d), hh];
    // Etikett vollständig im Bild halten (nach innen schieben, Breite nie kappen)
    const clamp = (d: Draft) => {
      d.f.chip = [Math.max(hw(d) + 0.6 * em, Math.min(W - hw(d) - 0.6 * em, d.f.chip[0])), Math.max(hh + 0.6 * em, Math.min(H - hh - 0.6 * em, d.f.chip[1]))];
    };
    // Stützpunkte der Pfeile (Grenze bis außen) – Etiketten dürfen sie nicht verdecken
    const samples = out.flatMap((d) => [-0.6, -0.3, 0, 0.25, 0.5, 0.75, 0.95].map((t) => [d.B[0] + d.u[0] * Lout * t, d.B[1] + d.u[1] * Lout * t] as Pt));

    // Fokus-Etikett: erste Position (Mitte, dann darüber/darunter/seitlich), die keinen Pfeil im Land berührt
    // vorläufige Adern in voller Länge (gleiche Kurve wie später)
    const inner = out.flatMap((d) => {
      const o: Pt = [d.B[0] + d.u[0] * Lout, d.B[1] + d.u[1] * Lout];
      const n: Pt = [d.B[0] - d.u[0] * Lin, d.B[1] - d.u[1] * Lin];
      return (d.f.dir === 'import' ? arrow(o, n, d.u, d.f.width) : arrow(n, o, d.u, d.f.width)).pts;
    });
    let focusRect: Rect | null = focusBase;
    if (focusBase) {
      const offs: Pt[] = [[0, 0], [0, -2.4], [0, 2.4], [3, 0], [-3, 0], [0, -4.2], [0, 4.2], [4, 2.4], [-4, 2.4], [4, -2.4], [-4, -2.4], [6, 1.2], [-6, 1.2], [6, -1.2], [-6, -1.2], [0, 6], [0, -6]];
      const cand = offs.map(([dx, dy]) => [focusBase[0] + dx * em, focusBase[1] + dy * em, focusBase[2], focusBase[3]] as Rect);
      // Position mit den wenigsten berührten Aderpunkten (bei Gleichstand die nächstgelegene)
      const score = (r: Rect) => inner.filter((p) => inRect(p, r, 0.6 * em)).length;
      focusRect = cand.reduce((best, r) => (score(r) < score(best) ? r : best), cand[0]);
    }

    out.forEach(clamp);
    for (let round = 0; round < 4; round++) {
      // Etiketten gegenseitig auseinanderschieben
      for (let it = 0; it < 40; it++) {
        let moved = false;
        for (let i = 0; i < out.length; i++)
          for (let j = i + 1; j < out.length; j++) {
            const a = out[i].f.chip;
            const b = out[j].f.chip;
            const ox = hw(out[i]) + hw(out[j]) + 0.5 * em - Math.abs(a[0] - b[0]);
            const oy = 2 * hh + 0.5 * em - Math.abs(a[1] - b[1]);
            if (ox > 0 && oy > 0) {
              moved = true;
              if (ox < oy) {
                const dd = (a[0] < b[0] ? -1 : 1) * (ox / 2 + 1);
                a[0] += dd;
                b[0] -= dd;
              } else {
                const dd = (a[1] < b[1] ? -1 : 1) * (oy / 2 + 1);
                a[1] += dd;
                b[1] -= dd;
              }
            }
          }
        out.forEach(clamp);
        if (!moved) break;
      }
      // von Pfeilen und Fokus-Etikett weg – entlang der eigenen Richtung nach außen
      for (const d of out) {
        for (let k = 0; k < 24; k++) {
          const r = rectOf(d);
          const hit = samples.some((p) => inRect(p, r, 0.3 * em)) || (focusRect && overlap(r, focusRect, 0.4 * em));
          if (!hit) break;
          d.f.chip = [d.f.chip[0] + d.u[0] * 0.5 * em, d.f.chip[1] + d.u[1] * 0.5 * em];
          clamp(d);
        }
      }
    }

    // Pfeilenden kürzen, falls ein Etikett (oder das Fokus-Etikett) darauf liegt
    const rects = out.map(rectOf);
    for (const [di, d] of out.entries()) {
      // fremde Etiketten und das Fokus-Etikett dürfen nicht auf der Ader liegen; das eigene Etikett ist ihre Quelle/ihr Ziel
      const blocked = (p: Pt) => rects.some((r, ri) => ri !== di && inRect(p, r, 0.4 * em)) || (focusRect != null && inRect(p, focusRect, 0.5 * em));
      const own = rects[di];
      // ganze Kurve prüfen (nicht nur die Enden): die Seite kürzen, auf der ein Etikett liegt, bis die Ader frei ist
      let lo = Lout;
      let li = Lin;
      const build = () => {
        const outer: Pt = [d.B[0] + d.u[0] * lo, d.B[1] + d.u[1] * lo];
        const inner: Pt = [d.B[0] - d.u[0] * li, d.B[1] - d.u[1] * li];
        return d.f.dir === 'import' ? arrow(outer, inner, d.u, d.f.width) : arrow(inner, outer, d.u, d.f.width);
      };
      // äußeres Ende beginnt am Rand des eigenen Etiketts
      while (lo > Lout * 0.25 && inRect([d.B[0] + d.u[0] * lo, d.B[1] + d.u[1] * lo], own, 0.5 * em)) lo -= 0.25 * em;
      let a = build();
      for (let k = 0; k < 60; k++) {
        const hitAt = a.pts.findIndex((p) => blocked(p));
        if (hitAt < 0) break;
        // Pfad läuft Import: außen → innen, Export: innen → außen
        const nearStart = hitAt < a.pts.length / 2;
        const outerSide = d.f.dir === 'import' ? nearStart : !nearStart;
        if (outerSide && lo > Lout * 0.25) lo -= 0.3 * em;
        else if (!outerSide && li > Lin * 0.2) li -= 0.3 * em;
        else if (lo > Lout * 0.25) lo -= 0.3 * em;
        else break;
        a = build();
      }
      d.f.d = a.d;
      d.f.head = a.head;
      d.f.arrive = a.pts[a.pts.length - 1];
      d.f.pts = a.pts;
      d.f.from = a.pts[0];
      d.f.to = a.pts[a.pts.length - 1];
    }
    return { flows: out.map((d) => d.f), focusRect };
  }, [view, nets, focus, zone, W, H, language, focusBase]);
  const focusLabel: Pt | null = focusRect ? [focusRect[0], focusRect[1]] : null;

  /* Nachbarn ohne Fluss: Namensetiketten (im Bild gehalten; liegt der Etikettpunkt außerhalb, an der Grenze) */
  const labels = useMemo(() => {
    if (!view) return [];
    const { em } = view;
    const flowIso = new Set(flows.map((f) => f.iso));
    const C = view.toPx(centroid(focus.mainRing));
    return zone.neighbours
      .filter((iso) => !flowIso.has(iso))
      .map((iso) => {
        const c = countryByIso(iso);
        if (!c) return null;
        const name = countryName(c, language);
        const half = ((name.length * 0.6 + 2.6) * em) / 2;
        let p: Pt | null = c.props.label_x != null && c.props.label_y != null ? view.toPx(project(c.props.label_x, c.props.label_y)) : null;
        if (!p || p[0] < half || p[0] > W - half || p[1] < 1.4 * em || p[1] > H - 1.4 * em) {
          const B0 = sharedBorderPoint(focus, c);
          if (!B0) return null;
          const B = view.toPx(B0);
          // Richtung Nachbar (Etikettpunkt), nie ins eigene Land
          let v: Pt = p ? [p[0] - B[0], p[1] - B[1]] : [B[0] - C[0], B[1] - C[1]];
          if (v[0] * (B[0] - C[0]) + v[1] * (B[1] - C[1]) < 0) v = [B[0] - C[0], B[1] - C[1]];
          const n = Math.hypot(v[0], v[1]) || 1;
          p = [B[0] + (v[0] / n) * 3.5 * em, B[1] + (v[1] / n) * 3.5 * em];
        }
        const x = Math.max(half + 0.6 * em, Math.min(W - half - 0.6 * em, p[0]));
        const y = Math.max(1.4 * em, Math.min(H - 1.4 * em, p[1]));
        const r: Rect = [x, y, half, 1.1 * em];
        const hit = flows.some((f) => overlap(r, [f.chip[0], f.chip[1], (f.compact ? 9.5 : 15.5) * em * 0.5, 2 * em], 0.3 * em)) || (focusRect != null && overlap(r, focusRect));
        return hit ? null : { iso, name, p: [x, y] as Pt };
      })
      .filter((x): x is { iso: string; name: string; p: Pt } => !!x);
  }, [view, flows, zone, focus, W, H, language, focusRect]);

  /* Gradnetz (1° bzw. 2° bei großen Ländern) */
  const graticule = useMemo(() => {
    if (!view) return [];
    const step = view.w > 10 ? 2 : 1;
    const lines: string[] = [];
    for (let lng = Math.ceil(view.vx / step) * step; lng < view.vx + view.w; lng += step) lines.push(`M${(lng - view.vx) * view.k} 0V${H}`);
    for (let lat = 30; lat < 72; lat += step) {
      const y = (project(0, lat)[1] - view.vy) * view.k;
      if (y > 0 && y < H) lines.push(`M0 ${y}H${W}`);
    }
    return lines;
  }, [view, W, H]);

  /* Keyframes je Ader: 0–68 % Fahrt (transform), danach am Ziel (unsichtbar, siehe ov-pk-fade) */
  const packetCss = useMemo(
    () =>
      flows
        .map((f, i) => {
          const steps = f.pts.map((p, k) => `${((k / (f.pts.length - 1)) * 68).toFixed(2)}%{transform:translate(${p[0].toFixed(1)}px,${p[1].toFixed(1)}px)}`).join('');
          const e = f.pts[f.pts.length - 1];
          return `@keyframes ovpk-${uid}-${i}{${steps}100%{transform:translate(${e[0].toFixed(1)}px,${e[1].toFixed(1)}px)}}`;
        })
        .join(''),
    [flows, uid],
  );

  const net = power && typeof power.powerImportTotal === 'number' && typeof power.powerExportTotal === 'number' ? power.powerImportTotal - power.powerExportTotal : null;
  const headline = useMemo(() => {
    if (net == null) return null;
    const partners = nets.map(({ z, net: n }) => {
      const ov = zone.overrides?.[z];
      return { iso: zoneIso(z), name: countryName(countryByIso(zoneIso(z)), language) + (ov?.suffix ? ` ${ov.suffix}` : ''), mw: n };
    });
    return buildHeadline(zone.code, focusName, net, partners, language);
  }, [net, nets, zone, focusName, language]);
  const unit = unitFor(Math.max(0, ...flows.map((f) => f.mw)));
  const stamp = fmtStamp(power?.datetime, language);
  const live = !!power && !error && cachedAt == null;
  const ciMarker = ci != null ? (Math.min(ci, CI_MAX) / CI_MAX) * 100 : null;
  const s = view?.s ?? 1;
  const ciFmt = ci != null ? new Intl.NumberFormat(localeOf(language)).format(Math.round(ci)) : null;

  return (
    <div className="ov-glass relative flex h-full min-h-0 flex-col overflow-hidden rounded-[30px]">
      {/* Kopf: Satz zur Netzlage */}
      <div className="relative z-20 px-[4.5%] pt-[3.2%]">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <div className={live ? 'eyebrow !text-[1em]' : 'eyebrow-plain !text-[1em] text-white/65'}>{live ? `Live · ${L(T.flows)}` : L(T.flows)}</div>
          {stamp && (
            <div className="text-[1em] font-semibold text-white/65">
              {cachedAt != null ? L(T.lastGood) : L(T.asOf)} <span className="tabular text-white/90">{stamp}</span>
              {cachedAt != null ? <span> · {L(T.cached)}</span> : power?.isEstimated && <span> · {L(T.estimated)}</span>}
            </div>
          )}
        </div>
        {headline ? (
          <p className="mt-[0.45em] max-w-[34em] text-[1.65em] font-bold leading-[1.18] tracking-[-0.02em] text-white" style={{ fontFamily: 'var(--font-display)' }}>
            {headline.lead}
            {headline.value && (
              <span className="num-display whitespace-nowrap" style={{ color: headline.dir === 'import' ? IMPORT_C : EXPORT_C }}>
                {headline.value}
              </span>
            )}
            <span className="text-white/80">{headline.tail}</span>
          </p>
        ) : loading ? (
          <div className="ov-skeleton mt-[0.6em] h-[1.6em] w-[70%] rounded-xl" />
        ) : (
          // die einzige Fehlermeldung des Bildschirms – im Kopf, die Karte bleibt beschriftet
          <div className="mt-[0.5em] flex items-center gap-[0.8em]">
            <CloudOff className="size-[2.2em] shrink-0 text-[#ff9c92]" strokeWidth={1.8} />
            <div>
              <div className="text-[1.45em] font-bold leading-tight text-white" style={{ fontFamily: 'var(--font-display)' }}>
                {L(T.errorTitle)}
              </div>
              <div className="text-[1em] text-white/65">{L(T.errorSub)}</div>
            </div>
          </div>
        )}
      </div>

      {/* Karte */}
      <div ref={ref} className="relative min-h-0 flex-1">
        {view && (
          <svg width={W} height={H} className="absolute inset-0" aria-hidden>
            <defs>
              <linearGradient id={`fg-${uid}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor={focusColor} stopOpacity="0.62" />
                <stop offset="1" stopColor={focusColor} stopOpacity="0.26" />
              </linearGradient>
              <pattern id={`dots-${uid}`} width={(9 * s) / view.k} height={(9 * s) / view.k} patternUnits="userSpaceOnUse">
                <circle cx={(4.5 * s) / view.k} cy={(4.5 * s) / view.k} r={(0.9 * s) / view.k} fill="rgb(255 255 255 / 0.22)" />
              </pattern>
              <radialGradient id={`vig-${uid}`} cx="50%" cy="50%" r="70%">
                <stop offset="0.55" stopColor="#03122b" stopOpacity="0" />
                <stop offset="1" stopColor="#03122b" stopOpacity="0.7" />
              </radialGradient>
            </defs>

            <path d={graticule.join('')} stroke="rgb(255 255 255 / 0.05)" strokeWidth={s} fill="none" strokeDasharray={`${2 * s} ${6 * s}`} />

            <g transform={`scale(${view.k}) translate(${-view.vx} ${-view.vy})`}>
              {allCountries()
                .filter((c) => c !== focus && view.inView(c.bbox))
                .map((c) => (
                  <path
                    key={c.iso + c.props.name}
                    d={c.path}
                    fill={zone.neighbours.includes(c.iso) ? 'rgb(150 175 220 / 0.09)' : 'rgb(150 175 220 / 0.045)'}
                    stroke="rgb(255 255 255 / 0.2)"
                    strokeWidth={1.1 * s}
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              {/* Fokusland: vorgerenderter Schein (ohne Blur-Filter), atmet nur über Opazität */}
              <g className="ov-map-breathe">
                <path d={focus.path} fill="none" stroke={focusColor} strokeOpacity="0.12" strokeWidth={22 * s} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                <path d={focus.path} fill="none" stroke={focusColor} strokeOpacity="0.2" strokeWidth={11 * s} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              </g>
              <path d={focus.path} fill={`url(#fg-${uid})`} />
              <path d={focus.path} fill={`url(#dots-${uid})`} />
              <path
                d={focus.path}
                fill="none"
                stroke={focusColor}
                strokeWidth={2.6 * s}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                pathLength={1}
                strokeDasharray={1}
                className="ov-map-draw"
              />
            </g>

            <rect width={W} height={H} fill={`url(#vig-${uid})`} />

            {/* Lebensadern: Verlauf von blass (Quelle) zu leuchtend (Ziel) zeigt die Richtung; Dicke = MW */}
            {flows.map((f) => {
              const c = f.dir === 'import' ? IMPORT_C : EXPORT_C;
              const gid = `ad-${uid}-${f.zone}`;
              return (
                <g key={f.zone}>
                  <defs>
                    <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1={f.from[0]} y1={f.from[1]} x2={f.to[0]} y2={f.to[1]}>
                      <stop offset="0" stopColor={c} stopOpacity="0.12" />
                      <stop offset="0.55" stopColor={c} stopOpacity="0.55" />
                      <stop offset="1" stopColor={c} stopOpacity="0.95" />
                    </linearGradient>
                  </defs>
                  <path d={f.d} stroke={c} strokeOpacity="0.1" strokeWidth={f.width * 2.6 + 8 * s} strokeLinecap="round" fill="none" />
                  <path d={f.d} stroke={`url(#${gid})`} strokeWidth={f.width} strokeLinecap="round" fill="none" />
                  <path d={f.d} stroke="#fff" strokeOpacity="0.35" strokeWidth={Math.max(1.4 * s, f.width * 0.22)} strokeLinecap="round" fill="none" />
                  <path d={f.head} fill={c} stroke="#03122b" strokeOpacity="0.45" strokeWidth={s} strokeLinejoin="round" />
                </g>
              );
            })}
          </svg>
        )}

        {/* Energiepakete: leuchtender Kern mit weicher Spur, bewegt nur per transform entlang vorab berechneter Punkte;
            bei Ankunft (Import: im Land, Export: beim Nachbarn) blüht ein Lichtschein auf (transform + opacity) */}
        {view && flows.length > 0 && (
          <div aria-hidden className="ov-packets pointer-events-none absolute inset-0">
            <style>{packetCss}</style>
            {flows.map((f, i) => {
              const c = f.dir === 'import' ? IMPORT_C : EXPORT_C;
              const size = (1.1 + 1.3 * f.ratio) * view.em;
              const delay = 1.4 + i * 0.55;
              return (
                <div key={f.zone}>
                  {[0, 1, 2, 3, 4, 5].map((k) => {
                    const sz = size * (k === 0 ? 1 : 0.82 - k * 0.1);
                    const dl = (delay + k * f.dur * 0.028).toFixed(2);
                    return (
                      <span
                        key={k}
                        className="ov-packet absolute left-0 top-0 rounded-full"
                        style={{
                          width: sz,
                          height: sz,
                          marginLeft: -sz / 2,
                          marginTop: -sz / 2,
                          background: k === 0 ? `radial-gradient(circle, #fff 0 22%, ${c} 48%, ${c}00 72%)` : `radial-gradient(circle, ${c} 0 30%, ${c}00 70%)`,
                          animation: `ovpk-${uid}-${i} ${f.dur.toFixed(2)}s linear ${dl}s infinite both, ov-pk-fade-${k === 0 ? 'a' : 'b'} ${f.dur.toFixed(2)}s linear ${dl}s infinite both`,
                        }}
                      />
                    );
                  })}
                  <span
                    className="ov-bloom absolute rounded-full"
                    style={
                      {
                        left: f.arrive[0],
                        top: f.arrive[1],
                        width: size * 4.2,
                        height: size * 4.2,
                        marginLeft: -size * 2.1,
                        marginTop: -size * 2.1,
                        background: `radial-gradient(circle, #ffffffcc 0 8%, ${c}aa 24%, ${c}33 48%, ${c}00 70%)`,
                        '--dur': `${f.dur.toFixed(2)}s`,
                        '--delay': `${delay.toFixed(2)}s`,
                      } as CSSProperties
                    }
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Nachbar-Etiketten ohne Fluss */}
        {labels.map((l, i) => (
          <div key={l.iso} className="ov-map-chip absolute" style={{ left: l.p[0], top: l.p[1], '--d': `${700 + i * 60}ms` } as CSSProperties}>
            <span className="flex items-center gap-[0.45em] whitespace-nowrap rounded-full bg-[#03122b]/55 py-[0.2em] pl-[0.25em] pr-[0.7em] text-[1.05em] font-semibold text-white/80">
              {FLAGS[l.iso] && <img src={FLAGS[l.iso]} alt="" className="size-[1.4em] rounded-full object-cover opacity-90" />}
              {l.name}
            </span>
          </div>
        ))}

        {/* Fokus-Etikett */}
        {focusLabel && power && (
          <div className="ov-map-chip absolute z-10" style={{ left: focusLabel[0], top: focusLabel[1], '--d': '500ms' } as CSSProperties}>
            <div className="flex items-center gap-[0.55em] whitespace-nowrap rounded-full border border-white/25 bg-[#03122b]/85 py-[0.35em] pl-[0.35em] pr-[0.95em] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)]">
              <img src={FLAGS[zone.code]} alt="" className="size-[2em] rounded-full object-cover ring-2 ring-white/30" />
              <span className="text-[1.25em] font-extrabold tracking-[-0.02em] text-white" style={{ fontFamily: 'var(--font-display)' }}>
                {focusName}
              </span>
              {ciFmt && (
                <span className="num-display ml-[0.15em] rounded-full px-[0.6em] py-[0.15em] text-[1em] text-[#04142e]" style={{ background: focusColor }}>
                  {ciFmt} g/kWh
                </span>
              )}
            </div>
          </div>
        )}

        {/* Fluss-Etiketten */}
        {flows.map((f, i) => {
          const c = f.dir === 'import' ? IMPORT_C : EXPORT_C;
          const Icon = f.dir === 'import' ? ArrowDownLeft : ArrowUpRight;
          return (
            <div key={f.zone} className="ov-map-chip absolute z-10" style={{ left: f.chip[0], top: f.chip[1], '--d': `${800 + i * 90}ms` } as CSSProperties}>
              <div
                className="flex w-max items-center gap-[0.6em] whitespace-nowrap rounded-[1em] border bg-[#061a3a]/92 py-[0.45em] pl-[0.45em] pr-[0.9em] shadow-[0_12px_28px_-12px_rgba(0,0,0,0.9)]"
                style={{ borderColor: `${c}88` }}
              >
                {FLAGS[f.iso] ? (
                  <img src={FLAGS[f.iso]} alt="" className={`${f.compact ? 'size-[1.7em]' : 'size-[2.2em]'} rounded-full object-cover ring-1 ring-white/25`} />
                ) : (
                  <span className="size-[1.9em] rounded-full bg-white/10" />
                )}
                {f.compact ? (
                  <div className="leading-none">
                    <div className="flex items-center gap-[0.25em]">
                      <Icon className="size-[1em]" style={{ color: c }} strokeWidth={2.8} aria-label={L(f.dir === 'import' ? T.import : T.export)} />
                      <span className="num-display text-[1.15em] text-white">{fmtMW(f.mw, unit, language)}</span>
                    </div>
                    <div className="mt-[0.2em] text-[1em] font-semibold text-white/75">{f.name}</div>
                  </div>
                ) : (
                  <div className="leading-tight">
                    <div className="flex items-center gap-[0.3em] text-[1em] font-semibold text-white/75">
                      <Icon className="size-[1.15em]" style={{ color: c }} strokeWidth={2.6} />
                      {L(f.dir === 'import' ? T.import : T.export)} · {f.name}
                    </div>
                    <div className="num-display text-[1.45em] text-white">{fmtMW(f.mw, unit, language)}</div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

      </div>

      {/* Legendenleiste */}
      <div className="relative z-20 flex flex-wrap items-center gap-x-[2em] gap-y-[0.6em] border-t border-white/10 bg-[#03122b]/35 px-[4.5%] py-[0.9em]">
        <div className="min-w-[16em] flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="eyebrow-plain !text-[1em] text-white/70">{L(T.co2)}</span>
            <span className="text-[1em] text-white/65">
              g CO<sub>2</sub>eq/kWh
            </span>
          </div>
          <div className="relative mt-[0.55em] h-[0.6em] rounded-full" style={{ background: ciGradientCss() }}>
            {[CI_THRESHOLDS.low, CI_THRESHOLDS.high].map((v) => (
              <span key={v} className="absolute inset-y-0 w-[2px] bg-[#061a3a]" style={{ left: `${(v / CI_MAX) * 100}%` }} />
            ))}
            {ciMarker != null && (
              <span
                className="absolute top-1/2 size-[1.15em] -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow-[0_0_12px_rgba(255,255,255,0.6)] transition-[left] duration-[1800ms]"
                style={{ left: `${ciMarker}%`, background: focusColor }}
              />
            )}
          </div>
          <div className="relative mt-[0.4em] h-[1.3em] text-[1em] font-semibold text-white/65">
            {[0, 200, 400, 600, 800].map((v) => (
              <span key={v} className="tabular absolute -translate-x-1/2 first:translate-x-0 last:-translate-x-full" style={{ left: `${(v / CI_MAX) * 100}%` }}>
                {v === CI_MAX ? `${v}+` : v}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-[1.2em] gap-y-[0.4em] text-[1em] font-semibold text-white/85">
          <span className="inline-flex items-center gap-[0.4em]">
            <ArrowDownLeft className="size-[1.2em]" style={{ color: IMPORT_C }} strokeWidth={2.6} /> {L(T.import)}
          </span>
          <span className="inline-flex items-center gap-[0.4em]">
            <ArrowUpRight className="size-[1.2em]" style={{ color: EXPORT_C }} strokeWidth={2.6} /> {L(T.export)}
          </span>
          <span className="inline-flex items-center gap-[0.4em] text-white/70">
            <span className="inline-block size-[0.95em] rounded-[3px] border border-white/25 bg-[rgb(150_175_220/0.12)]" /> {L(T.noData)}
          </span>
        </div>
      </div>
    </div>
  );
}
