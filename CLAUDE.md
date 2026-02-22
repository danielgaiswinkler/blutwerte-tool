# Blutwerte-Tool

## Projektbeschreibung
Persönliches Blutwerte-Analyse-Tool als lokale Web-App. Erfasst Laborwerte, vergleicht mit optimalen Bereichen (funktionelle Medizin), zeigt Ampelsystem, Trends und Zusammenhänge.

## Tech Stack
- React + TypeScript + Tailwind CSS
- Recharts (Charts/Gauges)
- localStorage (Datenhaltung)
- JSON-basierte Wissensdatenbank

## Status (2026-02-22)
- [x] **Schritt 1: Wissensdatenbank** - 53 Blutwerte in 13 Kategorien als JSON, TypeScript-Typen + Hilfsfunktionen
- [x] **Schritt 2: Eingabeformular + CSV/JSON Import** - BloodworkEntry mit manuellem Input, CSV-Upload, localStorage
- [x] **Schritt 3: Dashboard mit Ampelsystem** - Vollstaendiges Analyse-Dashboard mit Ampel-Uebersicht, Kategorie-Cards, kritische Werte Alert, Erfassungsgrad
- [ ] Schritt 4: Einzelwert-Detailansicht mit Gauge
- [ ] Schritt 5: Cross-Value-Analyse
- [ ] Schritt 6: Trendansicht (Zeitverlauf)
- [ ] Schritt 7: Empfehlungen & Optimierung
- [ ] Schritt 8: PDF-Export

## Datenstruktur
- `src/data/bloodwork-knowledge.json` - Gesamte Wissensdatenbank (53 Werte)
- `src/data/index.ts` - TypeScript-Typen + Exports
- Einzeldateien (Quelle): `blutbild-entzuendung.json`, `leber-niere-zucker.json`, `mikronaehrstoffe.json`, `herzgesundheit.json`, `hormone-spezial.json`

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

## Research-Updates (2026-02-22)
- `src/data/updates-from-research.json` - 34 Update-Objekte aus 3 Research-Quellen
- Noch NICHT in Hauptdatenbank gemerged (Patch-Datei als Referenz)
- Aenderungen: Optimale Bereiche (Homocystein, GPT, GGT), neue ContextRules (Biotin, Lp(a)-Umrechnung, Ferritin/CRP-Ratio, Q10-Lipidkorrektur), Supplement-Updates (Mg-Formen, B12/MTHFR, Folsaeure), Omega-3-Methodik

## Design
- Dark-Mode (gradient #0f172a → #1e293b)
- Desktop-first
- Medizinisch-professioneller Look
- Ampel: 🔴 Kritisch / 🟡 Suboptimal / 🟢 Optimal

## Nächster Schritt
Schritt 4: Einzelwert-Detailansicht mit Gauge-Diagramm (Recharts) bauen.
