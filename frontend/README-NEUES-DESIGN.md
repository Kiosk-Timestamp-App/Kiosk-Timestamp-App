# ÖKOVOLT Kiosk – neues Frontend (Navy-Bühne)

Komplettes React-Frontend des TV-Kiosks (ersetzt `Kiosk-main/frontend`).
Das Frappe-Backend (`Kiosk-main/kiosk`, `hooks.py` usw.) ist unverändert und nicht enthalten.

## Einbauen
1. Sicherung von `Kiosk-main/frontend` anlegen.
2. Inhalt dieses Ordners nach `Kiosk-main/frontend/` kopieren.
3. Im Ordner `frontend`: `yarn install` – neue Abhängigkeit: `gsap` 3.13.0 (Werbe-Spots).
4. Bauen wie bisher: `yarn build` (schreibt nach `../kiosk/public/frontend`, kopiert `kiosk.html`).
5. Auf dem TV prüfen (Hochformat 1080×1920 empfohlen; 4K und Querformat werden unterstützt).

## Bildschirm-Rotation
Strommix Österreich (1 min) → Ihre Anlage (Kiosk-Dauer aus Backend, Standard 3,5 min) → Energie heute & Prognose (1 min)
→ **ein** ÖKOVOLT-Spot (12 s, reihum: Drohne → Wartung → Reinigung → Repowering) → weitere Anlagen (falls konfiguriert).

Eigenwerbung bewusst sparsam (Kundenvorgabe 20.10.2026): rund 12 s pro Runde von knapp 6 min (≈ 3,5 %).
Marke dauerhaft in der Kopfzeile, Website-QR in der News-Leiste. Unternehmensinfo (5 Kapitel) ist aus –
wieder einschalten: in `src/App.tsx` `SHOW_COMPANY_SCREEN = true`.

Backend-Werbung (company_ads) ist abgeschaltet. Wieder einschalten: in `src/App.tsx` `SHOW_BACKEND_ADS = true` setzen.

## Datenquellen
- Eigenes Backend (`src/api/apiBaseUrl.ts`): Anlagenwerte, Verläufe, CO₂, News, Einstellungen, Anlagenliste.
- Öffentlich (Internet nötig): aWATTar (Börsenpreise), Open-Meteo (Wetter, PV-Prognose), Electricity Maps (Strommix, Token aus dem Backend).
- „Heute live“ wird vom Kiosk selbst aus den Live-Werten aufgezeichnet (lokal im Browser, pro Anlage getrennt).

## Inhalte & Entscheidungen
- Texte und Kennzahlen stammen von der neuen Website (oekovolt-fe-at.vercel.app), wortgetreu mit Stand-Datum.
- Website-Adresse: „oekovolt.at“ aus dem Backend wird automatisch zu „oekovolt.com“ (`src/hooks/useLogoAndWebsite.ts`, `PUBLIC_WEBSITE`).
- QR-Codes zeigen auf diese Website + Pfad (/termin, /angebot, /foerdercheck, /service/…).
  Zentral konfigurierbar: `src/components/Company/qrTargets.ts` und `src/components/Ads/scenes/links.ts`.
  Die Zielseiten müssen auf der Live-Domain existieren (neue Website muss vor dem Start live sein).
- Installierte Leistung wird als „510 MWp“ angezeigt; Claim „Power of green energy“ bleibt.
- CO₂-Vergleich als „Baum-Äquivalent“ (ganze Zahlen, mit Faktor); kein öffentlicher g/kWh-Faktor.
- Normbezeichnung einheitlich „OVE E 8101“.
- Befristete Förder-Infos (EAG, Investitionsfreibetrag) blenden sich nach Ablauf automatisch aus;
  Kennzahlen mit „Stand“ werden nach dem 31.03.2027 ausgeblendet (`facts.ts`, `KEY_FIGURES_REVIEW_BY`).
- Der TV zeigt immer die dunkle Navy-Bühne; die Theme-Einstellung im Backend wirkt nicht mehr.

## Hinweise
- `src/components/Insights/preview-main.tsx` und `src/components/Company/preview-main.tsx` dienen nur der Einzelvorschau.
- Geprüft: TypeScript 0 Fehler, ESLint 0 Befunde, Produktions-Build ok, mehrere unabhängige visuelle Prüfrunden
  (Hochformat, 4K, Querformat, Ausfälle, gedrosselte CPU). Nicht geprüft: echtes TV-Gerät und echtes Backend.
