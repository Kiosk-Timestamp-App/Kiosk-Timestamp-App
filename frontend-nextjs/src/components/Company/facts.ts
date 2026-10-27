/**
 * Alle Inhalte des Bildschirms „ÖKOVOLT – Ihr Partner vor Ort“ – wörtlich von der Unternehmens-Website
 * (https://oekovolt-fe-at.vercel.app/, abgerufen 19.10.2026). Zeitgebundene Angaben tragen ihr „Stand“-Datum
 * und ein Ablaufdatum (`until`, Europe/Vienna), nach dem sie automatisch ausgeblendet werden.
 *
 * Typografie: NB = geschütztes Leerzeichen (kein Umbruch in Betrag+Einheit, Normnummern),
 */

export const SITE = 'https://oekovolt-fe-at.vercel.app';

const NB = ' ';
/** Normname ohne Umbruch – aktuelle offizielle Bezeichnung wie auf /service/wartung („OVE E 8101“) */
const OVE = `OVE${NB}E${NB}8101`;

export const COMPANY = {
  name: 'Ökovolt Solartechnik GmbH',
  street: 'Gewerbegebiet 10',
  city: '5121 Ostermiething',
  phone: `+43${NB}6278${NB}71030`,
  phoneHref: 'tel:+43627871030',
  email: 'office@oekovolt.at',
  /** Quelle: /kontakt – Gedankenstriche ohne Leerzeichen wie auf der Website (08.10.–22.10.) */
  hours: [
    { label: 'Mo–Do', time: '08:00–16:00' },
    { label: 'Fr', time: '08:00–13:00' },
  ],
  /** Quelle: /kontakt */
  holidayNote: 'An gesetzlichen Feiertagen in Österreich sowie am 24. und 31. Dezember geschlossen.',
};

/** Quelle: / (Claim, Überschrift „Betreiber aus Überzeugung – Errichter mit System.“), /ueber-uns, /tv */
export const CLAIM = {
  lead: 'Wir bauen, was wir',
  highlight: 'selbst betreiben',
  tail: 'würden.',
  sub: 'Betreiber aus Überzeugung – Errichter mit System.',
  /** Quelle: /tv */
  tvSub: 'Photovoltaik aus Ostermiething für ganz Österreich. Seit 2012.',
};

/**
 * Kennzahlen – Quelle: / „Angaben Ökovolt Österreich · Stand 09/2026“.
 * `reviewBy`: spätestens dann müssen die Zahlen neu bestätigt werden – danach werden die Kacheln mit Stand ausgeblendet.
 *
 * OFFEN (Kundenentscheidung): 510.000 kWp ist fachlich ungewöhnlich (Ø 102 kWp/Anlage, „2021 rund 30 MWp“).
 * `capacityUnit`: vom Kunden bestätigt (19.10.2026) – Anzeige als „510 MWp“ (fachlich übliche Schreibweise).
 */
/** Website: „Angaben Ökovolt Österreich“ – Markenschreibweise ÖKOVOLT (Koordinator-Entscheidung QA5) */
export const KEY_FIGURES_STAND = 'Angaben ÖKOVOLT Österreich · Stand 09/2026';
export const KEY_FIGURES_REVIEW_BY = '2027-03-31T23:59:59';
export const FIGURE_DISPLAY: { capacityUnit: 'kWp' | 'MWp' } = { capacityUnit: 'MWp' };
export const KEY_FIGURES = [
  { key: 'plants', value: 5000, unit: '', label: 'PV-Anlagen errichtet', stand: true },
  { key: 'capacity', value: 510000, unit: 'kWp', label: 'installierte Leistung', stand: true },
  { key: 'states', value: 9, unit: '', label: 'Bundesländer im Einsatzgebiet', stand: false },
] as const;

/** Quelle: / – Abschnitt „In vier Schritten“ */
export const PROCESS = {
  eyebrow: 'In vier Schritten',
  title: { lead: 'Vom Lastgang zum', highlight: 'laufenden Kraftwerk' },
  steps: [
    { n: '01', title: 'Analyse', text: 'Lastgang, Flächen, Netzanschluss und Förderungen: Wir rechnen, was sich für Ihren Betrieb wirklich lohnt.' },
    { n: '02', title: 'Planung & Netzantrag', text: 'Auslegung, Statik, Netzzugang beim Netzbetreiber, Förderansuchen und Bewilligungen.' },
    { n: '03', title: 'Bau & Inbetriebnahme', text: `Montage durch den eigenen Fachbetrieb, Erstprüfung nach ${OVE}, Parkregler und Monitoring.` },
    { n: '04', title: 'Betrieb & Wartung', text: 'Fernüberwachung, Wartungsvertrag, Prüfungen und Optimierung über die gesamte Laufzeit.' },
  ],
};

/**
 * Quelle: / – Abschnitt „Energie nutzen“ (Diagramm-Beschriftungen, Untertitel) und Menü/TV-Seite.
 * Für Laien ohne Abkürzungen: „Teilen“ mit Website-Text aus Menü („Netzentgelt teilen und sparen“) und /tv
 * („Überschüsse bleiben in der Energiegemeinschaft vor Ort.“); „Vermarkten“ = Website-Satz ohne die
 * Fachkürzel PPA/OeMAG (auf der Website nicht erklärt).
 */
export const ENERGY = {
  eyebrow: 'Energie nutzen',
  title: { lead: 'Jede Kilowattstunde an der', highlight: 'richtigen Stelle.' },
  source: 'Solarstrom vom eigenen Dach',
  hub: 'zuerst Eigenverbrauch im Betrieb',
  rest: 'Was übrig bleibt',
  uses: [
    { key: 'store', title: 'Speichern', sub: 'Gewerbespeicher', text: 'Lastspitzen kappen, Leistungspreis senken, Überschüsse verschieben und Notstrom bereitstellen.' },
    { key: 'charge', title: 'Laden', sub: 'Ladeinfrastruktur', text: 'E-Flotte, Kundenparkplatz und Lkw mit Solarstrom laden – mit Lastmanagement am Netzanschluss.' },
    { key: 'share', title: 'Teilen', sub: 'Energiegemeinschaften', text: 'Netzentgelt teilen und sparen. Überschüsse bleiben in der Energiegemeinschaft vor Ort.' },
    { key: 'market', title: 'Vermarkten', sub: 'Reststromvermarktung', text: 'Überschuss über Direktvermarktung erlösen.' },
  ],
} as const;

/** Quelle: / – „Service über den Lebenszyklus“; /service/wartung */
export const SERVICE = {
  eyebrow: 'Service über den Lebenszyklus',
  title: { lead: 'Damit die Anlage', highlight: `25${NB}Jahre und länger`, tail: 'liefert.' },
  intro: 'Wartung, Prüfung und Absicherung – für Anlagen, die wir gebaut haben, und für Bestandsanlagen anderer Errichter.',
  start: 'Inbetriebnahme',
  end: `25${NB}Jahre${NB}+`,
  groups: [
    {
      key: 'check',
      title: 'Prüfen',
      items: [
        { title: 'E-Check & Anlagenprüfung', text: `Nach ${OVE} und EN${NB}62446` },
        { title: 'Drohnen-Thermografie', text: 'Hotspots georeferenziert finden' },
      ],
    },
    {
      key: 'care',
      title: 'Pflegen',
      items: [
        { title: 'Wartung & Wartungsvertrag', text: 'Für eigene und fremd errichtete Anlagen' },
        { title: 'PV-Reinigung', text: 'Wenn der Ertragsvergleich es rechtfertigt' },
      ],
    },
    {
      key: 'secure',
      title: 'Absichern',
      items: [
        { title: 'PV-Versicherung', text: 'Beratung – wir vermitteln Kontakte' },
        { title: 'Notstrom & Blackout', text: 'Ersatzstrom für kritische Verbraucher' },
      ],
    },
  ],
  more: [
    { title: 'Repowering', text: 'Bestandsanlagen modernisieren' },
    { title: 'Energieberatung', text: 'Lastganganalyse & Energieaudit' },
  ],
} as const;

/**
 * Förderhinweis 2026 – Quelle: / (FAQ Förderung, Banner) und /foerdercheck. „Stand: September 2026“.
 * Der EAG-Investitionszuschuss wird nur im Zeitfenster eines Fördercalls beantragt (/foerdercheck) –
 * er verschwindet daher mit Ende des 3. Fördercalls 2026. Ohne sichtbare Zeile entfällt die Karte.
 */
export const FUNDING = {
  eyebrow: 'Förderung 2026',
  stand: 'Stand: September 2026',
  more: 'Details & Fristen: Förder-Check',
  disclaimer: 'Orientierung ohne Gewähr. Keine Rechts- oder Steuerberatung.',
  items: [
    {
      key: 'eag',
      title: 'EAG-Investitionszuschuss',
      value: `bis zu 150${NB}€/kWp`,
      text: `je nach Kategorie · maximal 30${NB}% der förderfähigen Kosten.`,
      until: '2026-10-22T23:59:59',
    },
    {
      key: 'ifb',
      title: 'Investitionsfreibetrag für Betriebe',
      value: `22${NB}%`,
      text: `für Anschaffungen bis 31.${NB}Dezember${NB}2026 für ökologische Investitionen wie PV.`,
      until: '2026-12-31T23:59:59',
    },
  ],
  /** 3. EAG-Fördercall: vor Beginn „Nächster …“ (/foerdercheck), während der Laufzeit Banner-Wortlaut (/) */
  call: {
    from: '2026-10-08T00:00:00',
    until: '2026-10-22T23:59:59',
    upcoming: 'Nächster EAG-Call 08.10.–22.10.2026',
    running: { lead: 'EAG-Fördercall läuft:', text: 'Anträge bis 22.10.2026, 23:59 Uhr einreichen' },
  },
};

/** Quelle: /kontakt */
export const CONTACT = {
  eyebrow: 'Kontakt',
  title: { lead: 'Lieber direkt', highlight: 'sprechen?' },
  free: 'Das Erstgespräch und eine erste Einschätzung zu Anlagengröße, Netzanschluss und Förderung kosten Sie nichts.',
  ctas: [
    { key: 'termin', label: 'Termin buchen', hint: 'Freie Zeiten direkt online wählen' },
    { key: 'angebot', label: 'Ersteinschätzung anfordern', hint: 'Zum Angebots-Konfigurator' },
  ],
} as const;

/** Quelle: /tv – Szene „Betreiber aus Überzeugung“ */
export const OPERATOR = {
  eyebrow: 'Betreiber aus Überzeugung',
  title: { lead: 'Wer selbst Betreiber ist,', highlight: 'plant anders.' },
  body: 'Die Gründer betreiben seit 2012 eigene Solarparks.',
  timelineTitle: 'Eigene Solarparks in Betrieb',
  years: ['2012', '2014', '2016', '2018', '2020', '2022', '2024', 'heute'],
  knowTitle: 'Was wir aus dem Betrieb kennen',
  know: ['Ertrag', 'Wartung', 'Wechselrichtertausch', 'Netzbetreiber', 'Vermarktung'],
  own: 'Eigene Montageteams, eigener Lkw, eigene Traktoren',
};
