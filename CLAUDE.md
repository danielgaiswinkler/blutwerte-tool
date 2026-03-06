# Blutwerte-Tool

## Projektbeschreibung
Persönliches Blutwerte-Analyse-Tool als lokale Web-App. Erfasst Laborwerte, vergleicht mit optimalen Bereichen (funktionelle Medizin), zeigt Ampelsystem, Trends und Zusammenhänge.

## Tech Stack
- React + TypeScript + Tailwind CSS
- Recharts (Charts/Gauges)
- localStorage (Datenhaltung)
- JSON-basierte Wissensdatenbank

## Status (2026-03-06)
- [x] **Schritt 1: Wissensdatenbank** - 63 Blutwerte in 13 Kategorien als JSON, TypeScript-Typen + Hilfsfunktionen
- [x] **Schritt 2: Eingabeformular + CSV/JSON Import** - BloodworkEntry mit manuellem Input, CSV-Upload, localStorage
- [x] **Schritt 3: Dashboard mit Ampelsystem** - Vollstaendiges Analyse-Dashboard mit Ampel-Uebersicht, Kategorie-Cards, kritische Werte Alert, Erfassungsgrad
- [x] **Schritt 4: Einzelwert-Detailansicht** - SVG-Range-Bar, Interpretation, Optimierung, verwandte Werte, Quellen. Route /wert/:id
- [x] **PDF-Import** - pdfjs-dist, positionsbasierte Zeilenrekonstruktion, 50+ Lab-Name-Mappings, Einheiten-Umrechnung, Vitamin B12 Bug gefixt
- [x] **Schritt 5: Cross-Value-Analyse** - 8 Panels (Eisen, Schilddrüse, Lipide, Methylierung, Insulinresistenz, Hormone-Mann, Leber, Niere), regelbasierte Auswertung, Route /analyse
- [x] **Schritt 7: Empfehlungen & Optimierung** - Personalisierte Supplement-/Ernährungs-/Lifestyle-Tipps, foods.json + supplements.json Integration, Route /empfehlungen
- [x] **Profile/Personen** - Multi-User mit ProfileContext, Profil-Selector in Sidebar, Migration bestehender Einträge
- [x] **Laien-Info** - InfoPopover-Komponente ("Was bedeutet dieser Wert?") im Dashboard und Eingabeformular, nutzt description-Feld
- [x] **Schritt 6: Trendansicht (Zeitverlauf)** - Recharts LineChart mit Status-Farben, Sparkline-Übersicht, Kategorie-Filter, Quick-Links für kritische Werte, Referenz-/Optimalbereich-Zonen, Zusammenfassungs-Stats, Messwert-Tabelle. Route /trend
- [x] **Schritt 8: Arzt-Bericht / Druckversion** - Werte-Auswahl mit Checkboxen, Kategorie-Toggle, Schnellauswahl (Alle/Auffaellige/Keine), optionale Empfehlungen + Supplement-Plan, druckoptimiertes Layout (weiss, Tabellen, Ampel-Emoji), @media print CSS. Route /bericht
- [ ] updates-from-research.json (34 Patches) in Hauptdatenbank mergen

## Datenstruktur
- `src/data/bloodwork-knowledge.json` - Gesamte Wissensdatenbank (63 Werte)
- `src/data/supplements.json` - Supplement-Datenbank (17 Supplements, Timing, Interaktionen, Kosten)
- `src/data/foods.json` - Lebensmittel-Datenbank (17 Kategorien, Top-Foods pro Blutwert)
- `src/data/lab-costs.json` - GOÄ-Kostenübersicht (63 Werte, Pakete, Spartipps)
- `src/data/index.ts` - TypeScript-Typen + Exports
- `src/utils/bloodwork-utils.ts` - Shared Utilities (Status-Berechnung, localStorage, Profile, Formatierung)
- `src/utils/recommendations.ts` - Empfehlungs-Engine (Supplements + Foods + Lifestyle)
- `src/utils/cross-value-rules.ts` - Cross-Value-Analyse-Regeln (8 Panels)
- `src/context/ProfileContext.tsx` - React Context für Multi-User Profile
- `src/components/InfoPopover.tsx` - Wiederverwendbare Laien-Info Komponente
- `src/components/TrendView/TrendView.tsx` - Zeitverlauf-Charts mit Recharts (Sparklines, LineChart, Status-Dots)
- `src/components/Report/Report.tsx` - Arzt-Bericht mit Werte-Auswahl, Druckversion (@media print)
- `src/components/SettingsPage/SettingsPage.tsx` - Export/Import/Reset, localStorage-Info
- Einzeldateien (Quelle): `blutbild-entzuendung.json`, `leber-niere-zucker.json`, `mikronaehrstoffe.json`, `herzgesundheit.json`, `hormone-spezial.json`, `zusatzwerte.json`

## Kategorien (13)
| Kategorie | Label | Anzahl |
|-----------|-------|--------|
| blutbild | Großes Blutbild | 8 |
| entzuendung | Entzündungsmarker | 3 |
| leber | Leberwerte | 4 |
| niere | Nierenwerte | 4 |
| blutzucker | Blutzucker & Insulin | 4 |
| eisen | Eisen-Panel | 3 |
| vitamine | Vitamine | 5 |
| mineralstoffe | Mineralstoffe (Vollblut) | 3 |
| lipide | Herzgesundheit & Lipid-Panel | 7 |
| schilddruese | Schilddrüse | 3 |
| sexualhormone | Sexualhormone (Mann) | 6 |
| stressachse | Stressachse | 1 |
| spezial | Spezialwerte | 2 |

## Referenz-Quellen
- "Der Blutwerte-Code" - Thiemo Osterhaus (Primärquelle)
- Perplexity Blutwerte-Wissensdatenbank (2026)
- ChatGPT Deep Research Report (2026)
- Gemini Blutwerte-Analyse (2026)
- European Atherosclerosis Society (EAS) Consensus (Lp(a))
- American Thyroid Association (ATA) Guidelines (Biotin-Interferenz)
- WHO Iron Assessment Guidelines (Ferritin/CRP-Ratio)

## Supplement-Datenbank (2026-02-22, v1.1.0)
- `src/data/supplements.json` - Zusammengeführt aus Gemini + Perplexity + ChatGPT Recherche
- 17 Supplements in 6 Kategorien (Basis/Bedingt/Optional Lipide/Hormone/Schlaf/Homocystein)
- Stufe 1 (Muss): D3+K2, Omega-3, Magnesium
- Stufe 2 (Bedingtes Muss): Eisen+VitC, B-Komplex, Schilddrüse (Se/Jod/Zn), Vitamin C
- Stufe 3 (Optional): Berberin, Bergamotte, Q10, Niacin, Ashwagandha, Bor, DHEA, Zink, Schlaf-Stack, Homocystein-Stack
- Enthält: Timing-Schedule (5 Tageszeiten), Interaktionsmatrix (11 neg / 11 pos), Kostenübersicht (7 Levels), Qualitätskriterien (11 Marken)
- Neue Felder: bfrHinweis, bfrWarnung, efsaReferenz, dgeReferenz, sicherheitshinweisB6, b12DosierungsPraxis, zusaetzlicheMarker, rechtlicherStatus
- Allgemeine Hinweise: 10 (erweitert um Kontraindikationen, B6-Sicherheit, BfR-Ashwagandha)

## Research-Updates (2026-02-22)
- `src/data/updates-from-research.json` - 34 Update-Objekte aus 3 Research-Quellen
- Noch NICHT in Hauptdatenbank gemerged (Patch-Datei als Referenz)
- Aenderungen: Optimale Bereiche (Homocystein, GPT, GGT), neue ContextRules (Biotin, Lp(a)-Umrechnung, Ferritin/CRP-Ratio, Q10-Lipidkorrektur), Supplement-Updates (Mg-Formen, B12/MTHFR, Folsaeure), Omega-3-Methodik

## Design
- Dark-Mode (gradient #0f172a → #1e293b)
- Desktop-first
- Medizinisch-professioneller Look
- Ampel: 🔴 Kritisch / 🟡 Suboptimal / 🟢 Optimal

## Health Hub Integration (2026-03-06)
- **Datenbruecke:** `~/Projects/health-hub/scripts/sync_blutwerte.py`
- **Workflow:** Blutwerte-Tool JSON Export → sync_blutwerte.py → health-hub/data/blutwerte.json
- **ID-Mapping:** 50+ Werte gemappt (Tool-IDs → Health Hub Kategorien)
- **Export-Button** noch einzubauen (React-Code in sync_blutwerte.py --show-export-code)

## Bekannte Probleme
- **Serum vs. Vollblut:** Magnesium, Zink, Selen werden im Tool als Vollblut-Werte gefuehrt, Bioscentia misst aber Serum. Diese Werte NICHT importieren (verschiedene Referenzbereiche). Langfristig: Serum-Varianten als eigene IDs anlegen oder Hinweis im Import
- **Text-Parser Erkennung:** Bei mehrzeiligem Paste (Name auf Zeile 1, Wert auf Zeile 2) werden manche Werte nicht erkannt. Parser erwartet Name + Wert auf einer Zeile
- **Speichern-Bug untersuchen:** Daniel konnte ueber UI mehrfach Werte eingeben + Speichern klicken, aber `blutwerte-entries` war leer. Ursache unklar — evtl. profileId-Zuordnung. Auto-Import als Workaround eingebaut

## Naechste Schritte
1. ~~**Bild-Upload mit Claude Vision**~~ — ERLEDIGT (2026-03-06)
   - Vite-Plugin `vite-plugin-vision.ts` als Backend (liest .env, proxied Claude API)
   - POST /api/vision Endpoint (Base64-Bild → Claude Sonnet 4 → strukturierte Werte)
   - GET /api/vision/status (prüft ob API-Key vorhanden)
   - "Bild Import" Button in BloodworkEntry (grüner Camera-Button, nur sichtbar wenn API verfügbar)
   - Wiederverwendet bestehendes ParsedLabValue Preview-Pattern (prüfen + übernehmen)
   - Getestet mit Bioscentia-Rechnung: Labor + Datum korrekt erkannt, 29 Positionen extrahiert
   - **Offen:** Test mit echtem Laborbefund-Foto (nicht Rechnung), ggf. Prompt-Feintuning
2. ~~**Arzt-Export / Druckversion (PDF)**~~ — ERLEDIGT (2026-03-06)
   - Report-Komponente `src/components/Report/Report.tsx` mit Werte-Auswahl (Checkboxen pro Kategorie)
   - Schnellauswahl: Alle / Nur Auffaellige / Keine
   - Optionale Sektionen: Empfehlungen + Supplement-Plan (Checkboxen)
   - Print-Layout: Weisser Hintergrund, saubere Tabellen, Ampel-Emoji, Kategorien
   - @media print CSS in index.css: Sidebar ausblenden, Print-Report einblenden
   - Route /bericht in App.tsx
3. ~~**GitHub Pages Deploy**~~ — ERLEDIGT (2026-03-06)
   - GitHub Actions Workflow `.github/workflows/deploy.yml` (auto-deploy bei push auf main)
   - `public/404.html` SPA-Redirect fuer React Router auf GitHub Pages
   - Live: https://danielgaiswinkler.github.io/blutwerte-tool/
4. ~~**Speichern-Bug fixen**~~ — ERLEDIGT (2026-03-06)
   - `saveEntries()` mit try/catch + Verification (prüft ob write geklappt hat)
   - Rote Fehlermeldung im UI wenn Speichern fehlschlägt
   - Fallback wenn activeEntryId auf gelöschten Eintrag zeigt
   - Console-Warnings bei Early-Returns
5. ~~**Export/Import + Settings-Seite**~~ — ERLEDIGT (2026-03-06)
   - Einstellungen-Seite (`src/components/SettingsPage/SettingsPage.tsx`)
   - Export: JSON-Download mit allen Profil-Eintraegen als Backup
   - Import: JSON-Upload mit Duplikat-Erkennung (gleiche ID = skip)
   - Reset: Alle Daten eines Profils loeschen (mit Bestätigung)
   - Info-Box erklaert lokale Datenhaltung
   - Auto-Import von import.json entfernt (keine persoenlichen Daten im Deploy)
6. **Export fuer Health Hub** — Separater Export-Button fuer Health Hub Sync
6. **updates-from-research.json mergen** — 34 Patches in Hauptdatenbank einarbeiten
7. **blutwerte-app aufraeumen oder loeschen** — Ist nur ein leeres Vite-Template, wird nicht gebraucht
8. **Serum vs. Vollblut** — Serum-Varianten fuer Magnesium/Zink/Selen anlegen oder Import-Hinweis

## Zielgruppen-Erweiterung (2026-03-06)
- **Daniels Schwiegervater** als erster externer Testuser geplant
- Bild-Import + Druckversion sind die Schluessel-Features fuer nicht-technikaffine User
- Multi-Profile existiert bereits (Daniel + Stefanie) — Schwiegervater als drittes Profil
