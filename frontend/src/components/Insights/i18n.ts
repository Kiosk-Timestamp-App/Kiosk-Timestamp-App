/**
 * Texte des Bildschirms „Energie heute & Prognose“ in allen Kiosk-Sprachen (DE ist Standard).
 * Platzhalter `{x}` werden über `t(key, { x })` ersetzt. Zeitangaben je Sprache über `I18n.hour/span`.
 */
import { createContext, useContext } from 'react';
import { tr } from '../../design/hooks';
import { hh, viennaMidnight } from './time';

type Words = { DE: string; EN: string; IT: string; FR: string; SQ: string };

const D = {
  // Allgemein
  today: { DE: 'Heute', EN: 'Today', IT: 'Oggi', FR: "Aujourd'hui", SQ: 'Sot' },
  tomorrow: { DE: 'Morgen', EN: 'Tomorrow', IT: 'Domani', FR: 'Demain', SQ: 'Nesër' },
  now: { DE: 'Jetzt', EN: 'Now', IT: 'Ora', FR: 'Maintenant', SQ: 'Tani' },
  nowShort: { DE: 'jetzt', EN: 'now', IT: 'ora', FR: 'maintenant', SQ: 'tani' },
  stand: { DE: 'Stand {t}', EN: 'As of {t}', IT: 'Aggiornato {t}', FR: 'Mis à jour {t}', SQ: 'Përditësuar {t}' },
  cached: { DE: 'Zwischengespeichert, Stand {t}', EN: 'Cached, as of {t}', IT: 'Dati in cache, {t}', FR: 'En cache, mis à jour {t}', SQ: 'Nga memoria, {t}' },
  viaServer: { DE: 'aWATTar über Anlagen-Server', EN: 'aWATTar via system server', IT: 'aWATTar tramite server impianto', FR: "aWATTar via le serveur de l'installation", SQ: 'aWATTar përmes serverit' },
  forecastNote: { DE: 'Prognose, Richtwert', EN: 'Forecast, guide value', IT: 'Previsione, valore indicativo', FR: 'Prévision, valeur indicative', SQ: 'Parashikim, vlerë orientuese' },

  // Hero
  spotPrice: { DE: 'Börsenstrompreis', EN: 'Spot power price', IT: 'Prezzo borsa elettrica', FR: "Prix spot de l'électricité", SQ: 'Çmimi i bursës' },
  austria: { DE: 'Österreich', EN: 'Austria', IT: 'Austria', FR: 'Autriche', SQ: 'Austri' },
  dayAheadNet: { DE: 'Day-Ahead · netto', EN: 'Day-ahead · net', IT: 'Day-ahead · netto', FR: 'Day-ahead · net', SQ: 'Day-ahead · neto' },
  pricesDown: {
    DE: 'Börsenpreise sind derzeit nicht erreichbar. Neuer Versuch in Kürze.',
    EN: 'Spot prices are currently unavailable. Retrying shortly.',
    IT: 'Prezzi di borsa non disponibili. Nuovo tentativo a breve.',
    FR: 'Prix spot indisponibles pour le moment. Nouvel essai sous peu.',
    SQ: 'Çmimet e bursës nuk janë të disponueshme. Provojmë së shpejti.',
  },
  vLow: { DE: 'Günstig für heute', EN: 'Low for today', IT: 'Conveniente oggi', FR: "Bas pour aujourd'hui", SQ: 'I lirë për sot' },
  vMid: { DE: 'Mittel für heute', EN: 'Average for today', IT: 'Medio oggi', FR: "Moyen pour aujourd'hui", SQ: 'Mesatar për sot' },
  vHigh: { DE: 'Teuer für heute', EN: 'High for today', IT: 'Caro oggi', FR: "Élevé pour aujourd'hui", SQ: 'I shtrenjtë për sot' },
  vsAvg: { DE: '{p} % ggü. Ø heute', EN: '{p} % vs. today’s avg.', IT: '{p} % rispetto alla media', FR: '{p} % vs moyenne du jour', SQ: '{p} % ndaj mesatares' },
  vsAvgCt: { DE: '{p} ct ggü. Ø heute', EN: '{p} ct vs. today’s avg.', IT: '{p} ct rispetto alla media', FR: '{p} ct vs moyenne du jour', SQ: '{p} ct ndaj mesatares' },
  dayLow: { DE: 'Tagestief', EN: 'Day low', IT: 'Minimo', FR: 'Minimum', SQ: 'Minimumi' },
  dayAvg: { DE: 'Ø heute', EN: 'Avg. today', IT: 'Media oggi', FR: 'Moy. du jour', SQ: 'Mesatarja' },
  dayHigh: { DE: 'Tageshoch', EN: 'Day high', IT: 'Massimo', FR: 'Maximum', SQ: 'Maksimumi' },
  low: { DE: 'günstig', EN: 'low', IT: 'basso', FR: 'bas', SQ: 'i lirë' },
  mid: { DE: 'mittel', EN: 'average', IT: 'medio', FR: 'moyen', SQ: 'mesatar' },
  high: { DE: 'teuer', EN: 'high', IT: 'alto', FR: 'élevé', SQ: 'i shtrenjtë' },
  avgDay: { DE: 'Ø heute', EN: 'Avg. today', IT: 'Media oggi', FR: 'Moy. du jour', SQ: 'Mesatarja' },
  heroFine: { DE: 'Netto, ohne Netzentgelte, Abgaben & USt.', EN: 'Net, excl. grid fees, levies & VAT', IT: 'Netto, senza oneri di rete, tasse e IVA', FR: 'Net, hors frais de réseau, taxes et TVA', SQ: 'Neto, pa tarifa rrjeti, taksa dhe TVSH' },


  cheapest3: { DE: 'Günstigste 3 h heute', EN: 'Cheapest 3 h today', IT: '3 h più economiche oggi', FR: '3 h les moins chères aujourd’hui', SQ: '3 orët më të lira sot' },
  over: { DE: 'vorbei', EN: 'passed', IT: 'passata', FR: 'passé', SQ: 'kaloi' },

  // Jetzt-Empfehlung
  nowAdvice: { DE: 'Jetzt · Empfehlung', EN: 'Now · Recommendation', IT: 'Ora · Consiglio', FR: 'Maintenant · Conseil', SQ: 'Tani · Këshillë' },
  ruleBased: { DE: 'regelbasiert', EN: 'rule-based', IT: 'basato su regole', FR: 'basé sur des règles', SQ: 'sipas rregullave' },
  validFor: { DE: 'gilt für {s}', EN: 'valid for {s}', IT: 'valido per {s}', FR: 'valable pour {s}', SQ: 'vlen për {s}' },
  aGolden: { DE: 'Goldene Stunde: jetzt laden und verbrauchen', EN: 'Golden hour: charge and consume now', IT: 'Ora d’oro: ricaricare e consumare ora', FR: 'Heure dorée\u00A0: recharger et consommer maintenant', SQ: 'Ora e artë: karikoni dhe konsumoni tani' },
  aGoldenSub: {
    DE: 'Viel Sonne und Börsenpreis unter dem Tagesmittel. Ideal für E-Auto, Wärmepumpe und Speicher.',
    EN: 'Strong sun and spot price below the daily average. Ideal for EV, heat pump and battery.',
    IT: 'Molto sole e prezzo sotto la media giornaliera. Ideale per auto elettrica, pompa di calore e accumulo.',
    FR: 'Beaucoup de soleil et prix sous la moyenne du jour. Idéal pour VE, pompe à chaleur et batterie.',
    SQ: 'Shumë diell dhe çmim nën mesataren ditore. Ideale për makinë elektrike, pompë nxehtësie dhe bateri.',
  },
  aSun: { DE: 'Viel Sonne: Solarstrom jetzt direkt nutzen', EN: 'Strong sun: use your solar power now', IT: 'Molto sole: usare subito l’energia solare', FR: 'Beaucoup de soleil\u00A0: utilisez votre solaire maintenant', SQ: 'Shumë diell: përdorni energjinë diellore tani' },
  aSunSub: {
    DE: 'Die Anlage liefert laut Prognose über 60 % ihrer Tagesspitze. Große Verbraucher jetzt einschalten.',
    EN: 'The forecast puts output above 60 % of today’s peak. Switch on large loads now.',
    IT: 'La previsione indica oltre il 60 % del picco odierno. Accendere ora i grandi carichi.',
    FR: 'La prévision dépasse 60 % du pic du jour. Lancez maintenant les gros consommateurs.',
    SQ: 'Parashikimi tregon mbi 60 % të pikut ditor. Ndizni tani pajisjet e mëdha.',
  },
  aLow: { DE: 'Jetzt günstig: guter Zeitpunkt zum Laden', EN: 'Low price now: a good time to charge', IT: 'Ora conveniente: buon momento per ricaricare', FR: 'Prix bas\u00A0: bon moment pour recharger', SQ: 'Tani e lirë: kohë e mirë për karikim' },
  aLowSub: {
    DE: 'Börsenpreis im unteren Drittel des Tages. Relevant bei dynamischem Stromtarif.',
    EN: 'Spot price in the lowest third of the day. Relevant with a dynamic tariff.',
    IT: 'Prezzo nel terzo più basso della giornata. Rilevante con tariffa dinamica.',
    FR: 'Prix dans le tiers inférieur de la journée. Utile avec un tarif dynamique.',
    SQ: 'Çmimi në të tretën më të ulët të ditës. E rëndësishme me tarifë dinamike.',
  },
  aHigh: { DE: 'Teuerste Stunden: Verbrauch verschieben', EN: 'Most expensive hours: shift consumption', IT: 'Ore più care: rimandare i consumi', FR: 'Heures les plus chères\u00A0: décaler la consommation', SQ: 'Orët më të shtrenjta: shtyni konsumin' },
  aMid: { DE: 'Mittleres Preisniveau', EN: 'Average price level', IT: 'Livello di prezzo medio', FR: 'Niveau de prix moyen', SQ: 'Nivel mesatar çmimi' },
  aNextCheap: { DE: 'Nächstes günstiges Fenster: {s} (Ø {c} ct/kWh).', EN: 'Next low-price window: {s} (avg. {c} ct/kWh).', IT: 'Prossima finestra conveniente: {s} (media {c} ct/kWh).', FR: 'Prochain créneau bon marché\u00A0: {s} (moy. {c} ct/kWh).', SQ: 'Dritarja e ardhshme e lirë: {s} (mes. {c} ct/kWh).' },
  aNextLowest: { DE: 'Günstigste verbleibende Stunden: {s} (Ø {c} ct/kWh).', EN: 'Lowest remaining hours: {s} (avg. {c} ct/kWh).', IT: 'Ore residue più economiche: {s} (media {c} ct/kWh).', FR: 'Heures restantes les moins chères\u00A0: {s} (moy. {c} ct/kWh).', SQ: 'Orët e mbetura më të lira: {s} (mes. {c} ct/kWh).' },
  aNextGolden: { DE: 'Nächste Goldene Stunden: {s}.', EN: 'Next golden hours: {s}.', IT: 'Prossime ore d’oro: {s}.', FR: 'Prochaines heures dorées\u00A0: {s}.', SQ: 'Orët e ardhshme të arta: {s}.' },
  aTariff: {
    DE: 'Bei Fixpreistarif zählt vor allem der Eigenverbrauch.',
    EN: 'With a fixed tariff, self-consumption matters most.',
    IT: 'Con tariffa fissa conta soprattutto l’autoconsumo.',
    FR: 'Avec un tarif fixe, l’autoconsommation compte avant tout.',
    SQ: 'Me tarifë fikse ka më shumë rëndësi vetëkonsumi.',
  },

  // Prognose
  forecastEyebrow: { DE: 'Prognose · Ihre Anlage', EN: 'Forecast · Your system', IT: 'Previsione · Il suo impianto', FR: 'Prévision · Votre installation', SQ: 'Parashikim · Sistemi juaj' },
  sun: { DE: 'Sonne', EN: 'Sun', IT: 'Sole', FR: 'Soleil', SQ: 'Diell' },
  price: { DE: 'Strompreis', EN: 'power price', IT: 'prezzo', FR: 'prix', SQ: 'çmim' },
  wholeDay: { DE: 'ganzer Tag', EN: 'whole day', IT: 'intera giornata', FR: 'journée entière', SQ: 'gjithë dita' },
  remaining: { DE: 'davon noch ≈ {k} kWh', EN: '≈ {k} kWh still to come', IT: 'ancora ≈ {k} kWh', FR: 'encore ≈ {k} kWh', SQ: 'edhe ≈ {k} kWh' },
  sunDone: { DE: 'Solarertrag für heute beendet', EN: 'Solar production over for today', IT: 'Produzione solare terminata per oggi', FR: 'Production solaire terminée pour aujourd’hui', SQ: 'Prodhimi diellor përfundoi për sot' },
  pvDown: { DE: 'Die PV-Prognose ist derzeit nicht erreichbar.', EN: 'The PV forecast is currently unavailable.', IT: 'La previsione FV non è disponibile.', FR: 'La prévision PV est indisponible.', SQ: 'Parashikimi FV nuk është i disponueshëm.' },
  lgPv: { DE: 'PV-Prognose', EN: 'PV forecast', IT: 'Previsione FV', FR: 'Prévision PV', SQ: 'Parashikim FV' },
  lgGolden: { DE: 'Goldene Stunden', EN: 'Golden hours', IT: 'Ore d’oro', FR: 'Heures dorées', SQ: 'Orët e arta' },
  lgPrice: { DE: 'Börsenpreis', EN: 'Spot price', IT: 'Prezzo di borsa', FR: 'Prix spot', SQ: 'Çmimi i bursës' },
  tomorrowFrom13: { DE: 'Preise für morgen ab ca. 13 Uhr', EN: 'Tomorrow’s prices from approx. 1 pm', IT: 'Prezzi di domani dalle 13 circa', FR: 'Prix de demain vers 13 h', SQ: 'Çmimet e nesërme rreth orës 13' },
  tomorrowDelayed: { DE: 'Preise für morgen verzögert – werden nachgeladen', EN: 'Tomorrow’s prices delayed – retrying', IT: 'Prezzi di domani in ritardo – nuovo tentativo', FR: 'Prix de demain retardés – nouvel essai', SQ: 'Çmimet e nesërme vonohen – po riprovojmë' },
  todayLc: { DE: 'heute', EN: 'today', IT: 'oggi', FR: 'aujourd’hui', SQ: 'sot' },
  tomorrowLc: { DE: 'morgen', EN: 'tomorrow', IT: 'domani', FR: 'demain', SQ: 'nesër' },
  activeSince: { DE: 'seit {h}', EN: 'since {h}', IT: 'dalle {h}', FR: 'depuis {h}', SQ: 'që nga {h}' },
  past: { DE: 'vorbei', EN: 'past', IT: 'passato', FR: 'passé', SQ: 'kaluar' },
  orient: { DE: 'Richtwert für {tilt}° Süd · {kwp}', EN: 'Guide value for {tilt}° south · {kwp}', IT: 'Valore indicativo per {tilt}° sud · {kwp}', FR: 'Valeur indicative pour {tilt}° sud · {kwp}', SQ: 'Vlerë orientuese për {tilt}° jug · {kwp}' },
  sunWaits: { DE: 'Sonnenaufgang {t}', EN: 'Sunrise {t}', IT: 'Alba {t}', FR: 'Lever {t}', SQ: 'Lindja {t}' },
  unavailable: { DE: 'nicht verfügbar', EN: 'unavailable', IT: 'non disponibile', FR: 'indisponible', SQ: 'i padisponueshëm' },
  noPrices: { DE: 'Preisdaten nicht verfügbar', EN: 'Price data unavailable', IT: 'Prezzi non disponibili', FR: 'Prix indisponibles', SQ: 'Çmimet mungojnë' },

  // Goldene Stunden
  goldenEyebrow: { DE: 'Empfehlung · Goldene Stunden', EN: 'Advice · Golden hours', IT: 'Consiglio · Ore d’oro', FR: 'Conseil · Heures dorées', SQ: 'Këshillë · Orët e arta' },
  activeNow: { DE: 'Jetzt aktiv', EN: 'Active now', IT: 'Attiva ora', FR: 'En cours', SQ: 'Aktive tani' },
  and: { DE: 'und', EN: 'and', IT: 'e', FR: 'et', SQ: 'dhe' },
  idealFor: { DE: 'Viel Sonne, Preis unter Tagesmittel. Ideal für:', EN: 'Strong sun, price below average. Ideal for:', IT: 'Molto sole, prezzo sotto la media. Ideale per:', FR: 'Beaucoup de soleil, prix sous la moyenne. Idéal pour\u00A0:', SQ: 'Shumë diell, çmim nën mesatare. Ideale për:' },
  useEv: { DE: 'E-Auto laden', EN: 'Charge EV', IT: 'Ricarica auto', FR: 'Recharger le VE', SQ: 'Karikim makine' },
  useHp: { DE: 'Wärmepumpe', EN: 'Heat pump', IT: 'Pompa di calore', FR: 'Pompe à chaleur', SQ: 'Pompë nxehtësie' },
  useBat: { DE: 'Speicher', EN: 'Battery', IT: 'Accumulo', FR: 'Batterie', SQ: 'Bateri' },
  splitNoTomorrow: {
    DE: 'Heute keine Goldenen Stunden mehr. Für morgen fehlen noch die Preise. Unser Rat:',
    EN: 'No more golden hours today. Tomorrow’s prices are not out yet. Our advice:',
    IT: 'Oggi niente più ore d’oro. I prezzi di domani non ci sono ancora. Il nostro consiglio:',
    FR: "Plus d'heures dorées aujourd'hui. Les prix de demain ne sont pas encore publiés. Notre conseil :",
    SQ: 'Sot nuk ka më orë të arta. Çmimet e nesërme ende mungojnë. Këshilla jonë:',
  },
  splitToday: { DE: 'Sonnenspitze und Preistief fallen heute nicht zusammen. Unser Rat:', EN: 'Sun peak and price low don’t coincide today. Our advice:', IT: 'Oggi picco solare e prezzo minimo non coincidono. Il nostro consiglio:', FR: "Pic solaire et prix bas ne coïncident pas aujourd'hui. Notre conseil :", SQ: 'Sot piku diellor dhe çmimi i ulët nuk përputhen. Këshilla jonë:' },
  splitTomorrow: { DE: 'Sonnenspitze und Preistief fallen morgen nicht zusammen. Unser Rat:', EN: 'Sun peak and price low don’t coincide tomorrow. Our advice:', IT: 'Domani picco solare e prezzo minimo non coincidono. Il nostro consiglio:', FR: 'Pic solaire et prix bas ne coïncident pas demain. Notre conseil\u00A0:', SQ: 'Nesër piku diellor dhe çmimi i ulët nuk përputhen. Këshilla jonë:' },
  useSolar: { DE: 'Solarstrom selbst nutzen: E-Auto, Wärmepumpe, Speicher', EN: 'Use your own solar power: EV, heat pump, battery', IT: 'Usare l’energia solare: auto, pompa di calore, accumulo', FR: 'Utiliser votre solaire\u00A0: VE, pompe à chaleur, batterie', SQ: 'Përdorni energjinë diellore: makinë, pompë, bateri' },
  cheapGrid: { DE: 'Günstigster Netzbezug (Ø {c} ct/kWh, netto)', EN: 'Cheapest grid power (avg. {c} ct/kWh, net)', IT: 'Prelievo più economico (media {c} ct/kWh, netto)', FR: 'Électricité réseau la moins chère (moy. {c} ct/kWh, net)', SQ: 'Rryma më e lirë nga rrjeti (mes. {c} ct/kWh, neto)' },
  cheapRest: { DE: 'Günstigste verbleibende Stunden (Ø {c} ct/kWh, netto)', EN: 'Lowest remaining hours (avg. {c} ct/kWh, net)', IT: 'Ore residue più economiche (media {c} ct/kWh, netto)', FR: 'Heures restantes les moins chères (moy. {c} ct/kWh, net)', SQ: 'Orët e mbetura më të lira (mes. {c} ct/kWh, neto)' },
  planPending: { DE: 'Die Empfehlung erscheint, sobald Preis- und Prognosedaten vorliegen.', EN: 'The recommendation appears once price and forecast data are available.', IT: 'Il consiglio appare non appena sono disponibili prezzi e previsioni.', FR: 'Le conseil apparaît dès que prix et prévisions sont disponibles.', SQ: 'Këshilla shfaqet sapo të ketë çmime dhe parashikime.' },
  goldenRule: { DE: 'Regel: Prognose ≥ 60 % der Tagesspitze und Preis unter dem Tagesmittel.', EN: 'Rule: forecast ≥ 60 % of the daily peak and price below the daily average.', IT: 'Regola: previsione ≥ 60 % del picco e prezzo sotto la media giornaliera.', FR: 'Règle\u00A0: prévision ≥ 60 % du pic du jour et prix sous la moyenne du jour.', SQ: 'Rregull: parashikimi ≥ 60 % e pikut dhe çmimi nën mesataren ditore.' },


  // Beispiel
  savingEyebrow: { DE: 'Beispiel · Zeitpunkt zählt', EN: 'Example · Timing matters', IT: 'Esempio · Il momento conta', FR: 'Exemple · Le moment compte', SQ: 'Shembull · Koha ka rëndësi' },
  savingLead: { DE: '{h} h Laden mit {kw}\u00A0kW – bestes statt teuerstes Fenster', EN: '{h} h charging at {kw}\u00A0kW – best instead of priciest window', IT: '{h} h di ricarica a {kw}\u00A0kW – finestra migliore invece della più cara', FR: '{h} h de recharge à {kw}\u00A0kW – meilleur créneau au lieu du plus cher', SQ: '{h} orë karikim me {kw}\u00A0kW – dritarja më e mirë në vend të më të shtrenjtës' },
  scopeToday: { DE: 'Ab jetzt bis 24 Uhr ·', EN: 'From now until midnight ·', IT: 'Da ora a mezzanotte ·', FR: 'De maintenant à minuit ·', SQ: 'Nga tani deri në mesnatë ·' },
  scopeTomorrow: { DE: 'Ab jetzt bis morgen 24 Uhr ·', EN: 'From now until tomorrow midnight ·', IT: 'Da ora a domani mezzanotte ·', FR: 'De maintenant à demain minuit ·', SQ: 'Nga tani deri nesër në mesnatë ·' },
  savingTooFew: { DE: 'Für heute sind zu wenige Stunden übrig. Das Beispiel erscheint wieder mit den Preisen für morgen (ab ca. 13 Uhr).', EN: 'Too few hours left today. The example returns with tomorrow’s prices (from approx. 1 pm).', IT: 'Restano troppe poche ore oggi. L’esempio torna con i prezzi di domani (dalle 13 circa).', FR: 'Il reste trop peu d’heures aujourd’hui. L’exemple revient avec les prix de demain (vers 13 h).', SQ: 'Kanë mbetur pak orë sot. Shembulli kthehet me çmimet e nesërme (rreth orës 13).' },
  bestWin: { DE: 'Günstigste 4 h', EN: 'Cheapest 4 h', IT: '4 h più economiche', FR: '4 h les moins chères', SQ: '4 orët më të lira' },
  worstWin: { DE: 'Teuerste 4 h', EN: 'Priciest 4 h', IT: '4 h più care', FR: '4 h les plus chères', SQ: '4 orët më të shtrenjta' },
  savingFine: { DE: '{k}\u00A0kWh, nur Energiepreis (netto).', EN: '{k}\u00A0kWh, energy price only (net).', IT: '{k}\u00A0kWh, solo prezzo dell’energia (netto).', FR: '{k}\u00A0kWh, prix de l’énergie seul (net).', SQ: '{k}\u00A0kWh, vetëm çmimi i energjisë (neto).' },



  // Morgen
  yieldLabel: { DE: 'Ertrag', EN: 'Yield', IT: 'Resa', FR: 'Énergie', SQ: 'Prodhimi' },
  sunrise: { DE: 'Aufgang', EN: 'Sunrise', IT: 'Alba', FR: 'Lever', SQ: 'Lindja' },
  sunset: { DE: 'Untergang', EN: 'Sunset', IT: 'Tramonto', FR: 'Coucher', SQ: 'Perëndimi' },
  strongest: { DE: 'Stärkste Sonnenstunden:', EN: 'Strongest sun hours:', IT: 'Ore di sole più forti:', FR: 'Heures les plus ensoleillées\u00A0:', SQ: 'Orët më me diell:' },
  peak: { DE: 'Spitze', EN: 'peak', IT: 'picco', FR: 'pic', SQ: 'piku' },
  tomorrowExplain: {
    DE: 'Die Strombörse veröffentlicht die Day-Ahead-Preise mittags. Dann erscheinen hier Tief, Hoch und das beste Fenster.',
    EN: 'The exchange publishes day-ahead prices around midday. Low, high and the best window then appear here.',
    IT: 'La borsa pubblica i prezzi day-ahead a mezzogiorno. Poi qui appaiono minimo, massimo e finestra migliore.',
    FR: 'La bourse publie les prix day-ahead vers midi. Minimum, maximum et meilleur créneau apparaîtront ici.',
    SQ: 'Bursa publikon çmimet day-ahead në mesditë. Më pas shfaqen këtu minimumi, maksimumi dhe dritarja më e mirë.',
  },
  tomorrowPrices: {
    DE: 'Börsenpreis morgen: Tief {lo} um {lt} · Hoch {hi} um {ht}',
    EN: 'Spot price tomorrow: low {lo} at {lt} · high {hi} at {ht}',
    IT: 'Prezzo domani: minimo {lo} alle {lt} · massimo {hi} alle {ht}',
    FR: 'Prix demain\u00A0: min. {lo} à {lt} · max. {hi} à {ht}',
    SQ: 'Çmimi nesër: min. {lo} në {lt} · maks. {hi} në {ht}',
  },
  cheapest3Short: { DE: 'günstigste 3 h: {s}', EN: 'cheapest 3 h: {s}', IT: '3 h più economiche: {s}', FR: '3 h les moins chères\u00A0: {s}', SQ: '3 orët më të lira: {s}' },

  // Annahmen
  howWeCalc: { DE: 'So rechnen wir', EN: 'How we calculate', IT: 'Come calcoliamo', FR: 'Notre méthode', SQ: 'Si llogarisim' },
  nPv: { DE: 'PV-Prognose', EN: 'PV forecast', IT: 'Previsione FV', FR: 'Prévision PV', SQ: 'Parashikimi FV' },
  nPvText: {
    DE: '{kwp}15° Süd, 14 % Systemverluste, Temperaturkoeffizient −0,35 %/K. Quelle: Open-Meteo',
    EN: '{kwp}15° south, 14 % system losses, temperature coefficient −0.35 %/K. Source: Open-Meteo',
    IT: '{kwp}15° sud, 14 % perdite di sistema, coefficiente di temperatura −0,35 %/K. Fonte: Open-Meteo',
    FR: '{kwp}15° sud, 14 % de pertes système, coefficient de température −0,35 %/K. Source\u00A0: Open-Meteo',
    SQ: '{kwp}15° jug, 14 % humbje sistemi, koeficienti i temperaturës −0,35 %/K. Burimi: Open-Meteo',
  },

  nPrice: { DE: 'Strompreis', EN: 'Power price', IT: 'Prezzo', FR: 'Prix', SQ: 'Çmimi' },
  nPriceText: {
    DE: 'Day-Ahead Österreich, netto, ohne Netzentgelte & Abgaben. Quelle: {s}',
    EN: 'Day-ahead Austria, net, excl. grid fees & levies. Source: {s}',
    IT: 'Day-ahead Austria, netto, senza oneri di rete. Fonte: {s}',
    FR: 'Day-ahead Autriche, net, hors frais de réseau. Source\u00A0: {s}',
    SQ: 'Day-ahead Austri, neto, pa tarifa rrjeti. Burimi: {s}',
  },
  nNote: { DE: 'Hinweis', EN: 'Note', IT: 'Nota', FR: 'Remarque', SQ: 'Shënim' },
  nNoteText: { DE: 'Prognosen sind Richtwerte; Wolken, Schnee und Verschattung können stark abweichen.', EN: 'Forecasts are guide values; clouds, snow and shading can deviate strongly.', IT: 'Le previsioni sono indicative; nuvole, neve e ombre possono discostarsi molto.', FR: 'Les prévisions sont indicatives\u00A0; nuages, neige et ombrage peuvent fortement les modifier.', SQ: 'Parashikimet janë orientuese; retë, bora dhe hijet mund të devijojnë shumë.' },

  noTodayYet: { DE: 'Preise für heute liegen noch nicht vor.', EN: 'Prices for today are not available yet.', IT: 'I prezzi di oggi non sono ancora disponibili.', FR: 'Les prix du jour ne sont pas encore disponibles.', SQ: 'Çmimet e sotme nuk janë ende të disponueshme.' },
  retryHint: { DE: 'Die Anzeige aktualisiert sich automatisch, sobald Daten eintreffen.', EN: 'The display updates automatically as soon as data arrives.', IT: 'La schermata si aggiorna automaticamente all’arrivo dei dati.', FR: 'L’affichage se met à jour automatiquement dès réception des données.', SQ: 'Ekrani përditësohet automatikisht sapo të vijnë të dhënat.' },
  nextCheap3: { DE: 'Günstigste 3 h ab jetzt', EN: 'Cheapest 3 h from now', IT: '3 h più economiche da ora', FR: '3 h les moins chères dès maintenant', SQ: '3 orët më të lira nga tani' },
} satisfies Record<string, Words>;

export type Key = keyof typeof D;

const LOCALES: Record<string, string> = { DE: 'de-AT', EN: 'en-GB', IT: 'it-IT', FR: 'fr-FR', SQ: 'sq-AL' };
/** Währungsformat je Sprache; DE: Zahl nach de-AT, Euro nachgestellt („8,19 €“) */
const MONEY: Record<string, string> = { DE: 'de-AT', EN: 'en-GB', IT: 'it-IT', FR: 'fr-FR', SQ: 'sq-AL' };

export interface I18n {
  lang: string;
  locale: string;
  t: (key: Key, vars?: Record<string, string | number>) => string;
  /** Einzelne Stunde im Fließtext, z. B. „5 Uhr“ / „05:00“ / „5 h“ */
  hour: (ms: number) => string;
  /** Zeitfenster, z. B. „11–16 Uhr“, „21–24 Uhr“ / „21:00–24:00“ / „21 h–24 h“ */
  span: (a: number, b: number) => string;
  /** Zeitfenster mit Tag, z. B. „heute 21–24 Uhr“ / „morgen 11–13 Uhr“ */
  daySpan: (a: number, b: number, now: number) => string;
  /** Kurzform für Diagramme: „11–16“ */
  shortSpan: (a: number, b: number) => string;
  /** Großdarstellung: Zahl + gedämpfte Einheit */
  bigSpan: (a: number, b: number) => { text: string; unit: string };
  nf: (v: number, d?: number) => string;
  /** Euro-Betrag in Landesschreibweise („8,19 €“, „€8.19“) */
  eur: (v: number) => string;
  /** Steht das €-Zeichen vor der Zahl? */
  eurFirst: boolean;
}

/** Stunde 0–24 ohne führende Null; Fensterende um Mitternacht = 24 */
const hNum = (ms: number, isEnd = false) => {
  const h = Number(hh(ms));
  return isEnd && h === 0 ? 24 : h;
};
const pad = (n: number) => String(n).padStart(2, '0');

export function makeI18n(language: string | null): I18n {
  const lang = language && LOCALES[language] ? language : 'DE';
  const locale = LOCALES[lang];
  const t = (key: Key, vars?: Record<string, string | number>) => {
    let s = tr(lang, D[key]);
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
    return s;
  };
  const hour = (ms: number) => (lang === 'DE' ? `${hNum(ms)} Uhr` : lang === 'FR' ? `${hNum(ms)}\u00A0h` : `${pad(hNum(ms))}:00`);
  // Diagramm-Kurzform im selben Format wie die Karten (EN/IT/SQ mit :00)
  const shortSpan = (a: number, b: number) =>
    lang === 'DE' || lang === 'FR' ? `${hNum(a)}–${hNum(b, true)}` : `${pad(hNum(a))}:00–${pad(hNum(b, true))}:00`;
  const span = (a: number, b: number) =>
    lang === 'DE'
      ? `${hNum(a)}–${hNum(b, true)}\u00A0Uhr`
      : lang === 'FR'
        ? `${hNum(a)}\u00A0h–${hNum(b, true)}\u00A0h`
        : `${pad(hNum(a))}:00–${pad(hNum(b, true))}:00`;
  const daySpan = (a: number, b: number, now: number) => {
    const tomorrow = a >= viennaMidnight(now, 1);
    return `${t(tomorrow ? 'tomorrowLc' : 'todayLc')} ${span(a, b)}`;
  };
  const bigSpan = (a: number, b: number) =>
    lang === 'DE'
      ? { text: shortSpan(a, b), unit: 'Uhr' }
      : lang === 'FR'
        ? { text: shortSpan(a, b), unit: 'h' }
        : { text: `${pad(hNum(a))}:00–${pad(hNum(b, true))}:00`, unit: '' };
  // Negative Werte mit echtem Minuszeichen (U+2212) statt Bindestrich
  const nf = (v: number, d = 1) => new Intl.NumberFormat(locale, { minimumFractionDigits: d, maximumFractionDigits: d }).format(v).replace('-', '\u2212');
  const money = new Intl.NumberFormat(MONEY[lang], { style: 'currency', currency: 'EUR' });
  const eur = (v: number) => (lang === 'DE' ? `${nf(v, 2)}\u00A0€` : money.format(v).replace('-', '\u2212'));
  const eurFirst =
    lang !== 'DE' && money.formatToParts(1).findIndex((q) => q.type === 'currency') < money.formatToParts(1).findIndex((q) => q.type === 'integer');
  return { lang, locale, t, hour, span, daySpan, shortSpan, bigSpan, nf, eur, eurFirst };
}

export const I18nContext = createContext<I18n>(makeI18n('DE'));
export const useI18n = () => useContext(I18nContext);
