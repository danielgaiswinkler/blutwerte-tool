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
