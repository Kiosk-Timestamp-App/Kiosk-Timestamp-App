/**
 * Kurzer Satz zur Netzlage, ausschließlich aus den echten Import-/Export-Werten gebildet.
 * z. B. „Österreich importiert gerade 2.234 MW – vor allem aus Tschechien und Deutschland.“
 * Mit Artikeln je Sprache (FR „L'Autriche … de Tchéquie et d'Allemagne“, IT „L'Austria … dalla Germania“).
 */
import { tr } from '../../../design/hooks';
import { T, fmtMW, unitFor, type Lang } from './config';

export interface Partner {
  iso: string;
  name: string;
  mw: number;
}

export interface Headline {
  lead: string;
  value: string | null;
  tail: string;
  dir: 'import' | 'export' | 'balanced';
}

/* Genus der Ländernamen: m = maskulin, f = feminin, p = Plural */
type G = 'm' | 'f' | 'p';
const FR_G: Record<string, G> = { LU: 'm', DK: 'm', ME: 'm', XK: 'm', NL: 'p' };
const IT_G: Record<string, G> = { LU: 'm', BE: 'm', ME: 'm', XK: 'm', NL: 'p' };
const vowel = (s: string) => /^[aeiouhàâéèêëîïôöûüAEIOUHÀÂÉÈÊËÎÏÔÖÛÜ]/.test(s);

const fr = {
  def: (iso: string, n: string) => (FR_G[iso] === 'p' ? `les ${n}` : vowel(n) ? `l'${n}` : FR_G[iso] === 'm' ? `le ${n}` : `la ${n}`),
  from: (iso: string, n: string) => (FR_G[iso] === 'p' ? `des ${n}` : FR_G[iso] === 'm' ? (vowel(n) ? `de l'${n}` : `du ${n}`) : vowel(n) ? `d'${n}` : `de ${n}`),
  to: (iso: string, n: string) => `vers ${fr.def(iso, n)}`,
};
const it = {
  def: (iso: string, n: string) => (IT_G[iso] === 'p' ? `i ${n}` : vowel(n) ? `l'${n}` : IT_G[iso] === 'm' ? `il ${n}` : `la ${n}`),
  from: (iso: string, n: string) => (IT_G[iso] === 'p' ? `dai ${n}` : vowel(n) ? `dall'${n}` : IT_G[iso] === 'm' ? `dal ${n}` : `dalla ${n}`),
  to: (iso: string, n: string) => `verso ${it.def(iso, n)}`,
};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/* Deutsch: Länder mit Artikel */
const DE_FROM: Record<string, string> = { CH: 'der Schweiz', NL: 'den Niederlanden', SK: 'der Slowakei' };
const DE_TO: Record<string, string> = { CH: 'in die Schweiz', NL: 'in die Niederlande', SK: 'in die Slowakei' };
const EN_THE = new Set(['NL', 'CZ']);

export function buildHeadline(focusIso: string, country: string, net: number, partners: Partner[], language: Lang): Headline {
  const lang = language ?? 'DE';
  const subj = lang === 'FR' ? cap(fr.def(focusIso, country)) : lang === 'IT' ? cap(it.def(focusIso, country)) : country;
  if (Math.abs(net) < 50) return { lead: `${subj}${lang === 'FR' ? ' : ' : ': '}${tr(language, T.balanced)}.`, value: null, tail: '', dir: 'balanced' };
  const imp = net > 0;
  const top = partners
    .filter((p) => (imp ? p.mw > 0 : p.mw < 0))
    .sort((a, b) => Math.abs(b.mw) - Math.abs(a.mw))
    .slice(0, 2);
  const join = (names: string[], and: string) => (names.length > 1 ? `${names[0]} ${and} ${names[1]}` : names[0] ?? '');
  // gleiche Einheit wie die Fluss-Etiketten (MW, erst ab 10 GW in GW)
  const value = fmtMW(Math.abs(net), unitFor(Math.max(Math.abs(net), ...partners.map((p) => Math.abs(p.mw)))), language);
  const dir = imp ? 'import' : 'export';

  if (lang === 'EN') {
    const n = join(top.map((p) => (EN_THE.has(p.iso) ? `the ${p.name}` : p.name)), 'and');
    return { lead: `${subj} is ${imp ? 'importing' : 'exporting'} `, value, tail: ` right now${n ? ` – mainly ${imp ? 'from' : 'to'} ${n}` : ''}.`, dir };
  }
  if (lang === 'IT') {
    const n = join(top.map((p) => (imp ? it.from(p.iso, p.name) : it.to(p.iso, p.name))), 'e');
    return { lead: `${subj} sta ${imp ? 'importando' : 'esportando'} `, value, tail: `${n ? ` – soprattutto ${n}` : ''}.`, dir };
  }
  if (lang === 'FR') {
    const n = join(top.map((p) => (imp ? fr.from(p.iso, p.name) : fr.to(p.iso, p.name))), 'et');
    return { lead: `${subj} ${imp ? 'importe' : 'exporte'} actuellement `, value, tail: `${n ? ` – surtout ${n}` : ''}.`, dir };
  }
  if (lang === 'SQ') {
    const n = join(top.map((p) => p.name), 'dhe');
    return { lead: `${subj} po ${imp ? 'importon' : 'eksporton'} `, value, tail: `${n ? ` – kryesisht ${imp ? 'nga' : 'drejt'} ${n}` : ''}.`, dir };
  }
  // Deutsch (Standard): „aus“ + Dativ, „nach“ bzw. „in die“ + Akkusativ
  if (imp) {
    const n = join(top.map((p) => DE_FROM[p.iso] ?? p.name), 'und');
    return { lead: `${subj} importiert gerade `, value, tail: n ? ` – vor allem aus ${n}.` : '.', dir };
  }
  const parts = top.map((p) => DE_TO[p.iso] ?? `nach ${p.name}`);
  const n = parts.length > 1 ? `${parts[0]} und ${parts[1]}` : parts[0];
  return { lead: `${subj} exportiert gerade `, value, tail: n ? ` – vor allem ${n}.` : '.', dir };
}
