import type { BloodValue } from '../data';
import { getValueById } from '../data';
import { getRangeStatus } from './bloodwork-utils';
import type { RangeStatus } from './bloodwork-utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CrossValueInsight {
  severity: 'info' | 'attention' | 'warning';
  title: string;
  message: string;
  affectedValues: string[];
}

export interface CrossValuePanel {
  id: string;
  name: string;
  description: string;
  valueIds: string[];
  insights: CrossValueInsight[];
  presentValues: Array<{
    bv: BloodValue;
    value: number;
    status: RangeStatus;
  }>;
}

// ---------------------------------------------------------------------------
// Panel definitions
// ---------------------------------------------------------------------------

interface PanelDef {
  id: string;
  name: string;
  description: string;
  valueIds: string[];
  rules: Array<{
    requiredIds: string[];
    evaluate: (
      vals: Record<string, number>,
      gender: 'male' | 'female',
    ) => CrossValueInsight | null;
  }>;
}

const PANELS: PanelDef[] = [
  // -----------------------------------------------------------------------
  // Eisen-Panel
  // -----------------------------------------------------------------------
  {
    id: 'eisen',
    name: 'Eisen-Panel',
    description: 'Ferritin, Transferrinsättigung und Entzündungsmarker zusammen betrachten',
    valueIds: ['ferritin', 'transferrinsaettigung', 'serum-eisen', 'hs-crp', 'haemoglobin'],
    rules: [
      {
        requiredIds: ['ferritin', 'hs-crp'],
        evaluate: (vals) => {
          if (vals['hs-crp'] > 3 && vals['ferritin'] > 50) {
            return {
              severity: 'attention',
              title: 'Ferritin bei Entzündung erhöht',
              message:
                'CRP ist erhöht — Ferritin ist ein Akute-Phase-Protein und kann bei Entzündung falsch hoch sein. Der wahre Eisenstatus könnte niedriger liegen. Transferrinsättigung ist hier aussagekräftiger.',
              affectedValues: ['ferritin', 'hs-crp'],
            };
          }
          if (vals['ferritin'] < 50 && vals['hs-crp'] < 1) {
            return {
              severity: 'attention',
              title: 'Niedriges Ferritin ohne Entzündung',
              message:
                'Ferritin unter 50 ng/ml bei niedrigem CRP deutet auf einen echten Eisenmangel hin. Funktionelle Medizin empfiehlt Ferritin > 100 ng/ml.',
              affectedValues: ['ferritin', 'hs-crp'],
            };
          }
          return null;
        },
      },
      {
        requiredIds: ['ferritin', 'haemoglobin'],
        evaluate: (vals, gender) => {
          const hbLow = gender === 'male' ? 13.5 : 12.0;
          if (vals['ferritin'] < 30 && vals['haemoglobin'] < hbLow) {
            return {
              severity: 'warning',
              title: 'Eisenmangel-Anämie möglich',
              message:
                'Ferritin und Hämoglobin sind beide niedrig — das ist ein starker Hinweis auf eine Eisenmangel-Anämie. Ärztliche Abklärung empfohlen.',
              affectedValues: ['ferritin', 'haemoglobin'],
            };
          }
          return null;
        },
      },
    ],
  },

  // -----------------------------------------------------------------------
  // Schilddrüse
  // -----------------------------------------------------------------------
  {
    id: 'schilddruese',
    name: 'Schilddrüsen-Panel',
    description: 'TSH, fT3 und fT4 im Zusammenspiel bewerten',
    valueIds: ['tsh', 'ft3', 'ft4'],
    rules: [
      {
        requiredIds: ['tsh', 'ft4'],
        evaluate: (vals) => {
          if (vals['tsh'] > 2.5 && vals['ft4'] < 1.2) {
            return {
              severity: 'attention',
              title: 'Subklinische Hypothyreose möglich',
              message:
                'TSH über 2.5 mU/l bei niedrig-normalem fT4 kann auf eine beginnende Schilddrüsenunterfunktion hinweisen. Funktionelle Medizin sieht optimales TSH bei 1.0-2.0 mU/l.',
              affectedValues: ['tsh', 'ft4'],
            };
          }
          return null;
        },
      },
      {
        requiredIds: ['ft3', 'ft4'],
        evaluate: (vals) => {
          // fT3/fT4-Ratio als Konversions-Indikator
          // Optimal: fT3 (pg/ml) / fT4 (ng/dl) ≈ 2.5-3.5
          const ratio = vals['ft3'] / vals['ft4'];
          if (ratio < 2.0) {
            return {
              severity: 'attention',
              title: 'Eingeschränkte T4→T3-Konversion',
              message:
                `fT3/fT4-Ratio: ${ratio.toFixed(2)} (optimal: 2.5-3.5). Eine niedrige Ratio deutet auf eine eingeschränkte Konversion von T4 zu T3 hin. Mögliche Ursachen: Selenmangel, Stress, Nährstoffdefizite.`,
              affectedValues: ['ft3', 'ft4'],
            };
          }
          return null;
        },
      },
    ],
  },

  // -----------------------------------------------------------------------
  // Lipid-Panel
  // -----------------------------------------------------------------------
  {
    id: 'lipide',
    name: 'Lipid-Panel & Herz-Risiko',
    description: 'Cholesterin, Triglyceride und ApoB im Zusammenhang',
    valueIds: ['gesamtcholesterin', 'ldl', 'hdl', 'triglyceride', 'apob', 'lpa', 'homocystein'],
    rules: [
      {
        requiredIds: ['triglyceride', 'hdl'],
        evaluate: (vals) => {
          const ratio = vals['triglyceride'] / vals['hdl'];
          if (ratio > 3.0) {
            return {
              severity: 'warning',
              title: 'Hohe Trig/HDL-Ratio — Insulinresistenz-Marker',
              message:
                `Trig/HDL-Ratio: ${ratio.toFixed(1)} (optimal: < 2.0). Ein erhöhtes Verhältnis ist ein starker Prädiktor für Insulinresistenz und Small Dense LDL.`,
              affectedValues: ['triglyceride', 'hdl'],
            };
          }
          if (ratio > 2.0) {
            return {
              severity: 'attention',
              title: 'Trig/HDL-Ratio leicht erhöht',
              message:
                `Trig/HDL-Ratio: ${ratio.toFixed(1)} (optimal: < 2.0). Ein Wert über 2.0 deutet auf suboptimalen Lipidstoffwechsel hin.`,
              affectedValues: ['triglyceride', 'hdl'],
            };
          }
          return null;
        },
      },
      {
        requiredIds: ['ldl', 'apob'],
        evaluate: (vals) => {
          // LDL/ApoB-Diskordanz
          // LDL in mg/dl, ApoB in mg/dl
          // Wenn ApoB deutlich höher als erwartet → Small Dense LDL
          if (vals['apob'] > 100 && vals['ldl'] < 130) {
            return {
              severity: 'attention',
              title: 'LDL-ApoB-Diskordanz',
              message:
                'ApoB ist relativ zum LDL erhöht — das deutet auf eine höhere Anzahl kleinerer, dichterer LDL-Partikel (Small Dense LDL) hin. ApoB ist der bessere Risikomarker als LDL-C.',
              affectedValues: ['ldl', 'apob'],
            };
          }
          return null;
        },
      },
      {
        requiredIds: ['lpa'],
        evaluate: (vals) => {
          if (vals['lpa'] > 30) {
            return {
              severity: 'warning',
              title: 'Erhöhtes Lipoprotein(a)',
              message:
                'Lp(a) ist genetisch bedingt und diätetisch/medikamentös kaum beeinflussbar. Bei erhöhtem Lp(a) sollten alle anderen Risikofaktoren (LDL, ApoB, Entzündung) besonders streng optimiert werden.',
              affectedValues: ['lpa'],
            };
          }
          return null;
        },
      },
    ],
  },

  // -----------------------------------------------------------------------
  // B-Vitamine & Methylierung
  // -----------------------------------------------------------------------
  {
    id: 'methylierung',
    name: 'Methylierung & B-Vitamine',
    description: 'Homocystein, B12 und Folsäure als Methylierungs-Indikatoren',
    valueIds: ['homocystein', 'vitamin-b12', 'folsaeure'],
    rules: [
      {
        requiredIds: ['homocystein', 'vitamin-b12', 'folsaeure'],
        evaluate: (vals) => {
          if (vals['homocystein'] > 10 && (vals['vitamin-b12'] < 500 || vals['folsaeure'] < 10)) {
            return {
              severity: 'warning',
              title: 'Gestörte Methylierung',
              message:
                'Erhöhtes Homocystein bei niedrigen B-Vitaminen deutet auf einen Methylierungsstau hin. B12 und Folsäure sind Cofaktoren für den Homocystein-Abbau. MTHFR-Mutation ausschließen.',
              affectedValues: ['homocystein', 'vitamin-b12', 'folsaeure'],
            };
          }
          if (vals['homocystein'] > 12) {
            return {
              severity: 'attention',
              title: 'Homocystein erhöht',
              message:
                `Homocystein ${vals['homocystein']} µmol/l — ein kardiovaskulärer Risikofaktor. Häufigste Ursache: B12-, Folsäure- oder B6-Mangel. Auch Schilddrüse und Nierenfunktion prüfen.`,
              affectedValues: ['homocystein'],
            };
          }
          return null;
        },
      },
      {
        requiredIds: ['homocystein'],
        evaluate: (vals) => {
          if (vals['homocystein'] < 8) {
            return {
              severity: 'info',
              title: 'Homocystein optimal',
              message:
                'Homocystein unter 8 µmol/l deutet auf eine gut funktionierende Methylierung hin.',
              affectedValues: ['homocystein'],
            };
          }
          return null;
        },
      },
    ],
  },

  // -----------------------------------------------------------------------
  // Insulinresistenz
  // -----------------------------------------------------------------------
  {
    id: 'insulinresistenz',
    name: 'Blutzucker & Insulinresistenz',
    description: 'Glukose, Insulin, HOMA-IR und HbA1c zusammen bewerten',
    valueIds: ['nuechtern-glukose', 'nuechtern-insulin', 'homa-ir', 'hba1c'],
    rules: [
      {
        requiredIds: ['homa-ir'],
        evaluate: (vals) => {
          if (vals['homa-ir'] > 2.5) {
            return {
              severity: 'warning',
              title: 'Insulinresistenz wahrscheinlich',
              message:
                `HOMA-IR ${vals['homa-ir']} (optimal: < 1.5). Dies deutet auf eine Insulinresistenz hin — der Körper braucht mehr Insulin, um den Blutzucker zu regulieren.`,
              affectedValues: ['homa-ir'],
            };
          }
          if (vals['homa-ir'] > 1.5) {
            return {
              severity: 'attention',
              title: 'Insulinsensitivität suboptimal',
              message:
                `HOMA-IR ${vals['homa-ir']} — funktionelle Medizin sieht optimal < 1.5. Lebensstil-Maßnahmen (Kraft-Training, Intervallfasten, Ballaststoffe) können helfen.`,
              affectedValues: ['homa-ir'],
            };
          }
          return null;
        },
      },
      {
        requiredIds: ['nuechtern-glukose', 'hba1c'],
        evaluate: (vals) => {
          if (vals['nuechtern-glukose'] > 100 && vals['hba1c'] < 5.7) {
            return {
              severity: 'info',
              title: 'Erhöhte Nüchternglukose, normaler HbA1c',
              message:
                'Nüchternglukose über 100 mg/dl bei normalem HbA1c kann durch Stress, Dawn-Phänomen oder Timing der Blutentnahme bedingt sein. Gesamtbild ist entscheidend.',
              affectedValues: ['nuechtern-glukose', 'hba1c'],
            };
          }
          return null;
        },
      },
    ],
  },

  // -----------------------------------------------------------------------
  // Hormone (Mann)
  // -----------------------------------------------------------------------
  {
    id: 'hormone-mann',
    name: 'Hormon-Panel (Mann)',
    description: 'Testosteron, SHBG, Estradiol und Cortisol im Zusammenspiel',
    valueIds: ['testosteron-gesamt', 'shbg', 'estradiol', 'dhea-s', 'cortisol'],
    rules: [
      {
        requiredIds: ['testosteron-gesamt', 'shbg'],
        evaluate: (vals, gender) => {
          if (gender !== 'male') return null;
          // Freier Androgen-Index (FAI) = Testosteron (nmol/l) / SHBG (nmol/l) * 100
          // Testosteron in ng/dl → nmol/l: * 0.0347
          const testoNmol = vals['testosteron-gesamt'] * 0.0347;
          const fai = (testoNmol / vals['shbg']) * 100;
          if (vals['shbg'] > 50 && fai < 40) {
            return {
              severity: 'attention',
              title: 'SHBG erhöht — weniger freies Testosteron',
              message:
                `SHBG ${vals['shbg']} nmol/l bindet mehr Testosteron. Geschätzter FAI: ${fai.toFixed(0)}. Trotz normalem Gesamttestosteron kann das bioverfügbare Testosteron niedrig sein.`,
              affectedValues: ['testosteron-gesamt', 'shbg'],
            };
          }
          return null;
        },
      },
      {
        requiredIds: ['testosteron-gesamt', 'estradiol'],
        evaluate: (vals, gender) => {
          if (gender !== 'male') return null;
          // Testosteron/Estradiol-Ratio
          // Optimal: T(ng/dl) / E2(pg/ml) ≈ 14-20
          const ratio = vals['testosteron-gesamt'] / vals['estradiol'];
          if (ratio < 10) {
            return {
              severity: 'attention',
              title: 'Relative Östrogendominanz',
              message:
                `Testo/Estradiol-Ratio: ${ratio.toFixed(1)} (optimal: 14-20). Niedrige Ratio kann auf erhöhte Aromatase-Aktivität hindeuten. Bauchumfang, Alkohol und BMI prüfen.`,
              affectedValues: ['testosteron-gesamt', 'estradiol'],
            };
          }
          return null;
        },
      },
      {
        requiredIds: ['cortisol', 'dhea-s'],
        evaluate: (vals) => {
          if (vals['cortisol'] > 15 && vals['dhea-s'] < 200) {
            return {
              severity: 'attention',
              title: 'Stressachsen-Dysbalance',
              message:
                'Erhöhtes Cortisol bei niedrigem DHEA-S deutet auf chronischen Stress hin. DHEA-S fällt bei anhaltender HPA-Achsen-Aktivierung.',
              affectedValues: ['cortisol', 'dhea-s'],
            };
          }
          return null;
        },
      },
    ],
  },

  // -----------------------------------------------------------------------
  // Leber
  // -----------------------------------------------------------------------
  {
    id: 'leber',
    name: 'Leber-Panel',
    description: 'GOT, GPT und GGT im Zusammenhang (De-Ritis-Quotient)',
    valueIds: ['got', 'gpt', 'ggt', 'bilirubin'],
    rules: [
      {
        requiredIds: ['got', 'gpt'],
        evaluate: (vals) => {
          const deRitis = vals['got'] / vals['gpt'];
          if (deRitis > 2.0) {
            return {
              severity: 'warning',
              title: 'De-Ritis-Quotient deutlich erhöht',
              message:
                `GOT/GPT = ${deRitis.toFixed(2)} — ein Quotient > 2.0 kann auf eine alkoholtoxische Leberschädigung oder Herzmuskelschaden hindeuten.`,
              affectedValues: ['got', 'gpt'],
            };
          }
          if (deRitis < 0.7) {
            return {
              severity: 'attention',
              title: 'De-Ritis-Quotient niedrig',
              message:
                `GOT/GPT = ${deRitis.toFixed(2)} — ein Quotient < 0.7 ist typisch für eine entzündliche Lebererkrankung (z.B. Hepatitis).`,
              affectedValues: ['got', 'gpt'],
            };
          }
          if (deRitis >= 0.7 && deRitis <= 1.0) {
            return {
              severity: 'info',
              title: 'De-Ritis-Quotient im Normbereich',
              message:
                `GOT/GPT = ${deRitis.toFixed(2)} — unauffällig. Optimal: 0.8-1.0.`,
              affectedValues: ['got', 'gpt'],
            };
          }
          return null;
        },
      },
      {
        requiredIds: ['ggt'],
        evaluate: (vals) => {
          if (vals['ggt'] > 40) {
            return {
              severity: 'attention',
              title: 'GGT erhöht — Leberbelastung',
              message:
                'Gamma-GT ist ein sensitiver Marker für Leberbelastung (Alkohol, Medikamente, Gallengang). Auch isoliert ohne GOT/GPT-Erhöhung relevant.',
              affectedValues: ['ggt'],
            };
          }
          return null;
        },
      },
    ],
  },

  // -----------------------------------------------------------------------
  // Niere
  // -----------------------------------------------------------------------
  {
    id: 'niere',
    name: 'Nieren-Panel',
    description: 'Kreatinin, GFR und Cystatin C zusammen bewerten',
    valueIds: ['kreatinin', 'gfr', 'cystatin-c'],
    rules: [
      {
        requiredIds: ['kreatinin', 'gfr'],
        evaluate: (vals) => {
          if (vals['gfr'] < 60) {
            return {
              severity: 'warning',
              title: 'Eingeschränkte Nierenfunktion',
              message:
                `GFR ${vals['gfr']} ml/min — unter 60 deutet auf eine relevante Einschränkung hin (CKD Stadium 3+). Ärztliche Abklärung dringend empfohlen.`,
              affectedValues: ['gfr', 'kreatinin'],
            };
          }
          return null;
        },
      },
      {
        requiredIds: ['gfr', 'cystatin-c'],
        evaluate: (vals) => {
          // Cystatin-C basierte GFR ist muskelmassenunabhängig
          if (vals['cystatin-c'] > 0.95) {
            return {
              severity: 'attention',
              title: 'Cystatin C erhöht',
              message:
                'Cystatin C ist ein muskelmassenunabhängiger Nierenmarker. Erhöhte Werte bei normalem Kreatinin können eine frühe Nierenfunktionseinschränkung anzeigen.',
              affectedValues: ['cystatin-c', 'gfr'],
            };
          }
          return null;
        },
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

/**
 * Analyze cross-value relationships for a given set of measured values.
 * Returns panels that have at least 2 present values.
 */
export function analyzeCrossValues(
  values: Record<string, number>,
  gender: 'male' | 'female',
): CrossValuePanel[] {
  const results: CrossValuePanel[] = [];

  for (const panel of PANELS) {
    // Find which panel values are present
    const presentValues: CrossValuePanel['presentValues'] = [];
    for (const id of panel.valueIds) {
      const val = values[id];
      if (val !== undefined && !isNaN(val)) {
        const bv = getValueById(id);
        if (bv) {
          presentValues.push({
            bv,
            value: val,
            status: getRangeStatus(val, bv, gender),
          });
        }
      }
    }

    // Need at least 2 values to show a panel
    if (presentValues.length < 2) continue;

    // Run rules
    const insights: CrossValueInsight[] = [];
    for (const rule of panel.rules) {
      const hasRequired = rule.requiredIds.every((id) => values[id] !== undefined);
      if (!hasRequired) continue;

      const result = rule.evaluate(values, gender);
      if (result) insights.push(result);
    }

    results.push({
      id: panel.id,
      name: panel.name,
      description: panel.description,
      valueIds: panel.valueIds,
      insights,
      presentValues,
    });
  }

  // Sort: panels with warnings first, then by number of insights
  results.sort((a, b) => {
    const aMax = Math.max(
      ...a.insights.map((i) => (i.severity === 'warning' ? 2 : i.severity === 'attention' ? 1 : 0)),
      0,
    );
    const bMax = Math.max(
      ...b.insights.map((i) => (i.severity === 'warning' ? 2 : i.severity === 'attention' ? 1 : 0)),
      0,
    );
    if (aMax !== bMax) return bMax - aMax;
    return b.insights.length - a.insights.length;
  });

  return results;
}
