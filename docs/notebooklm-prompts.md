# NotebookLM Deep Research Prompts

## Prompt 1: Datentabelle (strukturiert)

```
Erstelle eine umfassende Datentabelle mit allen Blutwerten, die in den Quellen erwähnt werden.

Für JEDEN Blutwert brauche ich folgende Spalten:

| Spalte | Beschreibung |
|--------|-------------|
| ID | Kurzname (z.B. ferritin, tsh, vitamin-d) |
| Name | Voller deutscher Name |
| Kategorie | Eine von: Blutbild, Entzündung, Leber, Niere, Blutzucker, Eisen, Vitamine, Mineralstoffe, Lipide, Schilddrüse, Sexualhormone, Stressachse, Spezialwerte |
| Einheit | Messeinheit (z.B. ng/ml, mg/dl, µg/l) |
| Messmethode | Serum, Vollblut, Plasma, EDTA-Blut oder Berechnet |
| Referenz männlich min | Unterer Referenzwert Männer |
| Referenz männlich max | Oberer Referenzwert Männer |
| Referenz weiblich min | Unterer Referenzwert Frauen |
| Referenz weiblich max | Oberer Referenzwert Frauen |
| Optimal min | Unterer Optimalwert (funktionelle Medizin) |
| Optimal max | Oberer Optimalwert (funktionelle Medizin) |
| Optimal Zielwert | Idealer Zielwert |
| Ursachen zu niedrig | Komma-getrennte Liste (mind. 5) |
| Ursachen zu hoch | Komma-getrennte Liste (mind. 5) |
| Symptome zu niedrig | Komma-getrennte Liste |
| Symptome zu hoch | Komma-getrennte Liste |
| Verwandte Werte | Andere Blutwerte die man zusammen anschauen sollte |
| Kontextregeln | Besondere Interpretationsregeln (z.B. "Ferritin nicht verwertbar wenn CRP >5") |
| Lifestyle-Tipps | Ernährung, Bewegung, Schlaf etc. |
| Supplements | Name + Dosierung + Einnahmezeit |
| Red Flags | Wann sofort zum Arzt |
| Quelle | Aus welcher Quelle stammt die Info |

WICHTIG:
- Unterscheide klar zwischen REFERENZWERTEN (Labor-Normbereich) und OPTIMALWERTEN (funktionelle/präventive Medizin)
- Bei Mineralstoffen (Magnesium, Zink, Selen): Vollblut-Werte bevorzugen, Serum-Werte kennzeichnen
- Berechnete Werte (HOMA-IR, Trig/HDL-Ratio) mit Formel angeben
- Wenn verschiedene Quellen unterschiedliche Werte nennen, den Konsens angeben und Abweichungen in Klammern notieren
- Geschlechtsspezifische Unterschiede wo relevant
- Zyklusphase bei Frauenhormonen angeben

Bitte gib die Tabelle als CSV oder als Markdown-Tabelle aus. Wenn ein Wert in den Quellen nicht gefunden wurde, schreibe "k.A." (keine Angabe).
```

---

## Prompt 2: Markdown-Export (detaillierter Fließtext)

```
Erstelle einen umfassenden Markdown-Report über alle Blutwerte aus den Quellen. Strukturiere den Report wie folgt:

# Blutwerte-Wissensdatenbank

Für JEDEN Blutwert erstelle einen Abschnitt im folgenden Format:

## [Name des Blutwerts] (Abkürzung)
**Kategorie:** [z.B. Schilddrüse]
**Einheit:** [z.B. mU/l]
**Messmethode:** [Serum/Vollblut/Plasma/EDTA-Blut/Berechnet]

### Referenzwerte vs. Optimalwerte
- **Labor-Referenz:** Männer [min-max], Frauen [min-max]
- **Optimaler Bereich (funktionelle Medizin):** [min-max], Zielwert: [target]
- **Warum der Unterschied:** [Erklärung warum Referenz ≠ Optimal]

### Was dieser Wert aussagt
[2-3 Sätze Beschreibung, Funktion im Körper]

### Zu niedrig - Mögliche Ursachen
1. [Ursache 1]
2. [Ursache 2]
... (mindestens 5)

### Zu niedrig - Symptome
- [Symptom 1]
- [Symptom 2]
...

### Zu hoch - Mögliche Ursachen
1. [Ursache 1]
...

### Zu hoch - Symptome
- [Symptom 1]
...

### Zusammenspiel mit anderen Werten
- **[Verwandter Wert 1]:** [Wie hängen sie zusammen]
- **[Verwandter Wert 2]:** [Zusammenhang]

### Kontextregeln (WICHTIG für Interpretation)
- ⚠️ [Bedingung] → [Interpretation] (z.B. "CRP >5 mg/l → Ferritin nicht verwertbar")
- ℹ️ [Bedingung] → [Interpretation]

### Optimierung
**Lifestyle:**
- [Tipp 1]
- [Tipp 2]

**Supplements (mit Dosierung):**
- [Supplement]: [Dosierung], [Einnahmezeit], [Hinweise]

### Red Flags - Sofort zum Arzt
- 🔴 [Situation 1]
- 🔴 [Situation 2]

### Quellen
- [Quelle 1]
- [Quelle 2]

---

WICHTIGE REGELN:
1. Decke ALLE Blutwerte ab die in den Quellen vorkommen, mindestens diese Kategorien:
   - Großes Blutbild (Erythrozyten, Hämoglobin, Hämatokrit, MCV, MCH, MCHC, Leukozyten, Thrombozyten)
   - Entzündungsmarker (hs-CRP, CK, LDH)
   - Leberwerte (GOT, GPT, GGT, Bilirubin)
   - Nierenwerte (Kreatinin, GFR, Cystatin C, Harnsäure)
   - Blutzucker & Insulin (Nüchtern-Glukose, HbA1c, Nüchtern-Insulin, HOMA-IR)
   - Eisen-Panel (Ferritin, Transferrin, Transferrinsättigung)
   - Vitamine (Vitamin D, B12, HoloTC, Folsäure, Coenzym Q10)
   - Mineralstoffe VOLLBLUT (Magnesium, Zink, Selen)
   - Lipid-Panel (Cholesterin, LDL, HDL, Triglyceride, ApoB, Lp(a))
   - Schilddrüse (TSH, fT3, fT4)
   - Sexualhormone (Testosteron, freies Testo, SHBG, DHEA-S, Estradiol, Progesteron)
   - Stressachse (Cortisol)
   - Spezialwerte (Omega-3-Index, Homocystein)

2. Wenn verschiedene Quellen unterschiedliche Optimalwerte nennen, gib BEIDE an mit Quellenangabe
3. Hebe besonders hervor wo Referenzwerte und Optimalwerte stark abweichen (z.B. TSH, Vitamin D, Ferritin)
4. Erwähne IMMER wenn ein Wert im Vollblut statt Serum gemessen werden sollte
5. Bei berechneten Werten (HOMA-IR, Trig/HDL-Ratio): Formel angeben
6. Zusätzliche Blutwerte die in den Quellen vorkommen aber nicht in meiner Liste sind: bitte als eigenen Abschnitt "Weitere Blutwerte" am Ende anfügen
```

---

## Tipps für NotebookLM Deep Research

1. **Quellen vorher hochladen:** Alle PDFs, Bücher, Artikel in NotebookLM als Quellen hinzufügen
2. **Datentabelle zuerst:** Prompt 1 gibt dir die Rohdaten → direkt in unser JSON überführbar
3. **Markdown danach:** Prompt 2 gibt dir die Detailtexte → für Beschreibungen, Interpretationen, Kontextregeln
4. **Export:** Beide Formate als .md oder .csv exportieren und hier hochladen
5. **Nachfrage-Prompt falls Werte fehlen:**

```
Welche der folgenden Blutwerte wurden in deinem Report NICHT abgedeckt? Liste sie auf und ergänze die fehlenden Informationen:
Erythrozyten, Hämoglobin, Hämatokrit, MCV, MCH, MCHC, Leukozyten, Thrombozyten, hs-CRP, CK, LDH, GOT, GPT, GGT, Bilirubin, Kreatinin, GFR, Cystatin C, Harnsäure, Nüchtern-Glukose, HbA1c, Nüchtern-Insulin, HOMA-IR, Ferritin, Transferrin, Transferrinsättigung, Vitamin D, B12, HoloTC, Folsäure, Coenzym Q10, Magnesium, Zink, Selen, Gesamtcholesterin, LDL, HDL, Triglyceride, ApoB, Lp(a), TSH, fT3, fT4, Gesamt-Testosteron, Freies Testosteron, SHBG, DHEA-S, Estradiol, Progesteron, Cortisol, Omega-3-Index, Homocystein
```

---

## Prompt 3: Beste Nahrungsergänzungsmittel (Supplement-Datenbank)

```
Erstelle eine umfassende Supplement-Datenbank für die Optimierung von Blutwerten. Für jeden der folgenden Blutwerte/Bereiche brauche ich die besten Nahrungsergänzungsmittel.

Pro Supplement brauche ich:

| Feld | Beschreibung |
|------|-------------|
| Blutwert/Bereich | Welcher Blutwert wird damit optimiert |
| Supplement-Name | z.B. Vitamin D3, Omega-3, Magnesium |
| Wirkstoffform (bioverfügbar) | z.B. Ubiquinol statt Ubichinon, Methylcobalamin statt Cyanocobalamin |
| Wirkstoffform (schlecht) | Was man NICHT kaufen sollte und warum |
| Dosierung (Prävention) | Tägliche Dosis zur Vorbeugung |
| Dosierung (Mangel) | Höhere Dosis bei nachgewiesenem Mangel |
| Einnahme-Timing | Morgens/Mittags/Abends, nüchtern/zur Mahlzeit |
| Synergien | Welche Supplements zusammen einnehmen (z.B. D3+K2+Mg) |
| Antagonisten | Was NICHT zusammen einnehmen (z.B. Eisen+Zink, Calcium+Eisen) |
| Mindest-Abstand | Zeitlicher Abstand zu antagonistischen Supplements |
| Wechselwirkungen Medikamente | z.B. Statine senken Q10, Biotin stört Schilddrüsen-Tests |
| Kontrolle nach | Wann Blutwert nach Start der Supplementierung re-testen (z.B. 3 Monate) |
| Empfohlene Marken (DE) | 3-5 empfehlenswerte Marken auf dem deutschen Markt |
| Preis pro Monat (ca.) | Ungefähre monatliche Kosten |
| Evidenzgrad | Stark (Meta-Analysen), Mittel (RCTs), Schwach (Beobachtungsstudien/Expertenmeinung) |
| Besondere Hinweise | z.B. MTHFR-Mutation beachten, nur bei Mangel supplementieren |

Decke mindestens diese Bereiche ab:

1. **Basis-Stack (fast jeder braucht das in Mitteleuropa):**
   - Vitamin D3 + K2
   - Omega-3 (EPA/DHA)
   - Magnesium

2. **Eisen-Panel:**
   - Eisenbisglycinat (bei Mangel)
   - Vitamin C (Eisenaufnahme)

3. **B-Vitamine & Methylierung:**
   - B12 (Methylcobalamin)
   - Folsäure (5-MTHF)
   - B6 (P5P)
   - B2 (Riboflavin-5-Phosphat)
   - B-Komplex

4. **Schilddrüse:**
   - Selen (L-Selenomethionin)
   - Jod (Kaliumjodid)
   - Zink

5. **Herzgesundheit & Lipide:**
   - Omega-3 (hochdosiert)
   - Coenzym Q10 (Ubiquinol)
   - Berberin
   - Citrus Bergamotte
   - Niacin (B3)

6. **Hormone & Stress:**
   - Ashwagandha (KSM-66)
   - DHEA (nur bei Mangel)
   - Bor
   - Zink

7. **Schlaf & Regeneration:**
   - Magnesium (Bisglycinat/Threonat)
   - L-Theanin
   - Glycin

8. **Homocystein-Senkung:**
   - 5-MTHF + Methylcobalamin + P5P + Riboflavin

Erstelle zusätzlich:
- Eine **Einnahme-Zeitleiste** (Morgens/Mittags/Abends) mit allen Supplements
- Eine **Wechselwirkungs-Matrix** (was nicht zusammen einnehmen)
- Eine **"Muss vs. Kann"-Liste** (Basis-Stack vs. optionale Supplements je nach Blutwerten)
- Geschätzte **Monatskosten** für Basis-Stack und Komplett-Stack

Alle Angaben auf den **deutschen Markt** bezogen. Quellenangaben wo möglich.
```

---

## Prompt 4: Blutuntersuchungs-Kosten und GOÄ-Ziffern

```
Erstelle eine umfassende Kosten-Übersicht für Blutuntersuchungen in Deutschland (privatärztliche Liquidation nach GOÄ).

Für JEDEN der folgenden Blutwerte brauche ich:

| Feld | Beschreibung |
|------|-------------|
| Blutwert | Name des Parameters |
| GOÄ-Ziffer | Offizielle Gebührenordnungsnummer |
| Einfachsatz (EUR) | GOÄ 1,0-facher Satz |
| Regelsatz 1,15x (EUR) | Üblicher Faktor bei Laboren |
| Maximalsatz 1,3x (EUR) | Höchster zulässiger Satz |
| Kassenleistung? | Ja/Nein/Nur bei Indikation |
| IGeL-Leistung? | Ja/Nein |
| Typisches Labor-Paket | In welchem Standard-Panel enthalten |

Blutwerte (alle aus meiner Datenbank):
Großes Blutbild (inkl. Differenzial), hs-CRP, CK, LDH, GOT, GPT, GGT, Bilirubin, Kreatinin, GFR, Cystatin C, Harnsäure, Nüchtern-Glukose, HbA1c, Nüchtern-Insulin, Ferritin, Transferrin, Transferrinsättigung, Serum-Eisen, 25-OH Vitamin D, Vitamin B12, Holotranscobalamin, Folsäure, Coenzym Q10, Magnesium (Vollblut), Zink (Vollblut), Selen (Vollblut), Gesamtcholesterin, LDL, HDL, Triglyceride, ApoB, Lp(a), TSH, fT3, fT4, rT3, TPO-AK, Gesamt-Testosteron, Freies Testosteron, SHBG, DHEA-S, Estradiol, Progesteron, Cortisol, Omega-3-Index, Homocystein, Kalium

Erstelle zusätzlich **3 Untersuchungs-Pakete:**

### Paket 1: Basis-Check (jährlich empfohlen)
- Großes Blutbild, hs-CRP, Leber (GOT/GPT/GGT), Niere (Kreatinin/GFR), Blutzucker (Glukose/HbA1c), Lipide (Cholesterin/LDL/HDL/Triglyceride)
- Geschätzte Kosten: ___€

### Paket 2: Erweiterter Check (halbjährlich für Gesundheitsoptimierer)
- Alles aus Paket 1 PLUS: Ferritin, Vitamin D, TSH/fT3/fT4, Insulin/HOMA-IR, ApoB, Homocystein, Magnesium/Zink/Selen (Vollblut)
- Geschätzte Kosten: ___€

### Paket 3: Komplett-Panel (einmalig oder jährlich für Deep Health)
- Alles aus Paket 2 PLUS: HoloTC, Folsäure, CoQ10, Lp(a), Omega-3-Index, SHBG, freies Testosteron, DHEA-S, Estradiol, Cortisol, Cystatin C, TPO-AK, Progesteron
- Geschätzte Kosten: ___€

Zusätzlich:
- **Was zahlt die Kasse?** Liste aller Werte die bei Indikation Kassenleistung sind
- **Spar-Tipps:** Welche Werte muss man nur einmalig messen (z.B. Lp(a), TPO-AK)?
- **Re-Test-Intervalle:** Welche Werte wie oft messen nach Optimierung?
- **Selbstzahler-Labore:** Gibt es günstige Alternativen (z.B. Cerascreen, Lykon, medivere)?

Alle Preise in EUR, basierend auf GOÄ 2024/2025.
```

---

## Prompt 5: Lebensmittel-Matrix (Food as Medicine)

```
Erstelle eine umfassende Lebensmittel-Datenbank: Welche Nahrungsmittel verbessern welche Blutwerte?

Für jeden der folgenden Blutwerte erstelle eine Tabelle:

## [Blutwert-Name]

### Top 10 Lebensmittel zur Verbesserung

| Lebensmittel | Relevanter Nährstoff | Gehalt pro 100g | Empfohlene Portion | Bioverfügbarkeit | Hinweise |
|-------------|---------------------|-----------------|-------------------|------------------|----------|
| ... | ... | ... | ... | Hoch/Mittel/Niedrig | ... |

### Lebensmittel die diesen Wert VERSCHLECHTERN
| Lebensmittel | Warum | Mechanismus |
|-------------|-------|------------|
| ... | ... | ... |

Decke diese Blutwerte ab:
1. **Ferritin/Eisen:** Eisenreiche Lebensmittel (Häm-Eisen vs. Nicht-Häm), Eisenaufnahme-Förderer (Vitamin C), Eisenaufnahme-Hemmer (Phytinsäure, Tannine, Calcium)
2. **Vitamin D:** Natürliche Quellen (wenige!), warum Supplementierung fast immer nötig
3. **B12:** Tierische Quellen, Probleme bei veganer Ernährung
4. **Folsäure:** Blattgemüse, Hülsenfrüchte
5. **Magnesium:** Nüsse, Samen, Kakao, Vollkorn
6. **Zink:** Austern, Fleisch, Probleme mit Phytinsäure bei Vegetariern
7. **Selen:** Paranüsse (Achtung: Schwankungen!), Fisch
8. **Omega-3:** Fettfische, Algen, Leinöl (ALA vs. EPA/DHA Konversion)
9. **Triglyceride/HDL:** Was senkt Triglyceride, was hebt HDL?
10. **ApoB/LDL:** Lösliche Ballaststoffe, Pflanzensterole
11. **Blutzucker/HbA1c:** Niedrig-glykämische Ernährung, Essig-Trick, Reihenfolge beim Essen
12. **Homocystein:** B-Vitamin-reiche Lebensmittel
13. **Testosteron:** Zink, Vitamin D, gesunde Fette, Kreuzblütler (DIM/I3C)
14. **CRP/Entzündung:** Antientzündliche Ernährung, Kurkuma, Ingwer, Omega-3
15. **Schilddrüse (TSH/fT3):** Jodhaltige Lebensmittel, Selenquellen, Goitrogene (Kreuzblütler roh)

Erstelle zusätzlich:
- **Wochenplan-Vorlage** für eine "Blutwert-optimierte" Ernährung (7 Tage, 3 Mahlzeiten)
- **"Power-Foods"-Liste** die gleich mehrere Blutwerte positiv beeinflussen (z.B. Leber, Sardinen, Eier, Brokkoli)
- **Zubereitungs-Tipps** die Bioverfügbarkeit erhöhen (z.B. Tomaten kochen für Lycopin, Kurkuma + Pfeffer)
- **Veganer/Vegetarier-Guide** mit Alternativen und kritischen Werten

Quellenangaben wo möglich.
```
