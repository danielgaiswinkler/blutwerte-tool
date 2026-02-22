# Blutwerte-Tool

## Projektbeschreibung
Persönliches Blutwerte-Analyse-Tool als lokale Web-App. Erfasst Laborwerte, vergleicht mit optimalen Bereichen (funktionelle Medizin), zeigt Ampelsystem, Trends und Zusammenhänge.

## Tech Stack
- React + TypeScript + Tailwind CSS
- Recharts (Charts/Gauges)
- localStorage (Datenhaltung)
- JSON-basierte Wissensdatenbank

## Status (2026-02-22)
- [x] **Schritt 1: Wissensdatenbank** - 63 Blutwerte in 13 Kategorien als JSON, TypeScript-Typen + Hilfsfunktionen
- [x] **Schritt 2: Eingabeformular + CSV/JSON Import** - BloodworkEntry mit manuellem Input, CSV-Upload, localStorage
- [x] **Schritt 3: Dashboard mit Ampelsystem** - Vollstaendiges Analyse-Dashboard mit Ampel-Uebersicht, Kategorie-Cards, kritische Werte Alert, Erfassungsgrad
- [x] **Schritt 4: Einzelwert-Detailansicht** - SVG-Range-Bar, Interpretation, Optimierung, verwandte Werte, Quellen. Route /wert/:id
- [x] **PDF-Import** - pdfjs-dist, positionsbasierte Zeilenrekonstruktion, 50+ Lab-Name-Mappings, Einheiten-Umrechnung
- [ ] Schritt 5: Cross-Value-Analyse
- [ ] Schritt 6: Trendansicht (Zeitverlauf)
- [ ] Schritt 7: Empfehlungen & Optimierung (foods.json + supplements.json Daten vorhanden!)
- [ ] Schritt 8: PDF-Export / Berichte
- [ ] Profile/Personen (mehrere Nutzer mit eigenen Werten)
- [ ] updates-from-research.json (34 Patches) in Hauptdatenbank mergen
- [ ] BloodworkEntry refactoren (inline Helpers → shared utils)

## Datenstruktur
- `src/data/bloodwork-knowledge.json` - Gesamte Wissensdatenbank (63 Werte)
- `src/data/supplements.json` - Supplement-Datenbank (17 Supplements, Timing, Interaktionen, Kosten)
- `src/data/foods.json` - Lebensmittel-Datenbank (17 Kategorien, Top-Foods pro Blutwert)
- `src/data/lab-costs.json` - GOÄ-Kostenübersicht (63 Werte, Pakete, Spartipps)
- `src/data/index.ts` - TypeScript-Typen + Exports
- `src/utils/bloodwork-utils.ts` - Shared Utilities (Status-Berechnung, localStorage, Formatierung)
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

## Nächster Schritt (Session 2026-02-23)
1. **Profile/Personen** — Name-Feld in Entries, Profil-Selector, getrennte Datenhaltung
2. **PDF-Import testen** — Bioscentia PDF nochmal testen (Vitamin B12, Folsäure, Selen, Zink, Insulin Fixes verifizieren)
3. **Schritt 7: Empfehlungen** — Personalisierte Supplement-/Ernährungs-/Lifestyle-Tipps basierend auf aktuellen Werten (Daten in foods.json + supplements.json vorhanden)
4. **Schritt 5: Cross-Value-Analyse** — Zusammenhänge zwischen Werten (z.B. Eisen-Panel, Schilddrüse)
5. **Berichte/PDF-Export** — Zusammenfassender Bericht als PDF
