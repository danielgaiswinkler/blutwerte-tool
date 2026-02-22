import * as pdfjsLib from 'pdfjs-dist';

// Use the bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParsedLabValue {
  id: string;
  name: string;
  value: number;
  unit: string;
  originalValue: number;
  originalUnit: string;
  converted: boolean;
  note?: string;
}

export interface PdfParseResult {
  values: ParsedLabValue[];
  date: string | null;
  gender: 'male' | 'female' | null;
  lab: string | null;
  patientName: string | null;
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Mapping: German lab names → blood value IDs
// Each entry: [regex pattern, blood value ID, unit in our DB, conversion?]
// ---------------------------------------------------------------------------

interface LabMapping {
  pattern: RegExp;
  id: string;
  dbUnit: string;
  convert?: (value: number, fromUnit: string) => number;
  note?: string;
}

const UNIT_CONVERSIONS = {
  // ApoB: g/l → mg/dl (×100)
  apoB_g_to_mg: (v: number) => Math.round(v * 100 * 10) / 10,
  // Testosteron: ng/ml → ng/dl (×100)
  testo_ng_ml_to_ng_dl: (v: number) => Math.round(v * 100 * 10) / 10,
  // Selen: µmol/l → µg/l (×78.96)
  selen_umol_to_ug: (v: number) => Math.round(v * 78.96 * 10) / 10,
  // Zink: µmol/l → mg/l (×0.06538)
  zink_umol_to_mg: (v: number) => Math.round(v * 0.06538 * 1000) / 1000,
  // Magnesium: mmol/l → mg/l (×24.305)
  mg_mmol_to_mg: (v: number) => Math.round(v * 24.305 * 10) / 10,
};

const LAB_MAPPINGS: LabMapping[] = [
  // Klinische Chemie
  { pattern: /gamma[- ]?gt/i, id: 'ggt', dbUnit: 'U/l' },
  { pattern: /got\/?ast/i, id: 'got', dbUnit: 'U/l' },
  { pattern: /gpt\/?alt/i, id: 'gpt', dbUnit: 'U/l' },
  { pattern: /harns[äa]ure/i, id: 'harnsaeure', dbUnit: 'mg/dl' },
  { pattern: /kreatinin(?!\s*-?\s*cystatin)/i, id: 'kreatinin', dbUnit: 'mg/dl' },
  { pattern: /glom\.?\s*filtrations.*ckd[- ]?epi\)?/i, id: 'gfr', dbUnit: 'ml/min/1.73m²' },
  { pattern: /cystatin\s*c(?!\s*\))/i, id: 'cystatin-c', dbUnit: 'mg/l' },
  { pattern: /crp\s*(quantitativ|sensitiv|hs)/i, id: 'hs-crp', dbUnit: 'mg/l' },
  { pattern: /bilirubin\s*gesamt/i, id: 'bilirubin', dbUnit: 'mg/dl' },
  { pattern: /\bck\b(?!\s*-?\s*mb)/i, id: 'ck', dbUnit: 'U/l' },
  { pattern: /\bldh\b/i, id: 'ldh', dbUnit: 'U/l' },

  // Elektrolyte
  { pattern: /\bkalium\b/i, id: 'kalium', dbUnit: 'mmol/l' },
  {
    pattern: /\bmagnesium\b/i,
    id: 'magnesium',
    dbUnit: 'mg/l',
    convert: (v, fromUnit) =>
      fromUnit.includes('mmol') ? UNIT_CONVERSIONS.mg_mmol_to_mg(v) : v,
    note: 'Serum-Wert (nicht Vollblut)',
  },

  // Schilddrüse
  { pattern: /ft3|freies?\s*trijod/i, id: 'ft3', dbUnit: 'pg/ml' },
  { pattern: /ft4|freies?\s*thyroxin/i, id: 'ft4', dbUnit: 'ng/dl' },
  { pattern: /tsh\s*(basal)?/i, id: 'tsh', dbUnit: 'mU/l' },
  { pattern: /tpo[- ]?ak|anti[- ]?tpo/i, id: 'tpo-ak', dbUnit: 'IU/ml' },

  // Kohlenhydratstoffwechsel
  {
    pattern: /glukose\s*n[üu]chtern|n[üu]chtern.*glukose|gluco\s*exact/i,
    id: 'nuechtern-glukose',
    dbUnit: 'mg/dl',
  },
  { pattern: /hba1c(?!\s*\(ifcc)/i, id: 'hba1c', dbUnit: '%' },
  { pattern: /\binsulin\b(?!.*resist)/i, id: 'nuechtern-insulin', dbUnit: 'µU/ml' },
  { pattern: /homa[- ]?(index|ir)/i, id: 'homa-ir', dbUnit: '(dimensionslos)' },

  // Lipide
  { pattern: /cholesterin\s*gesamt/i, id: 'gesamtcholesterin', dbUnit: 'mg/dl' },
  { pattern: /triglyceride/i, id: 'triglyceride', dbUnit: 'mg/dl' },
  { pattern: /hdl[- ]?cholesterin/i, id: 'hdl', dbUnit: 'mg/dl' },
  { pattern: /ldl[- ]?cholesterin/i, id: 'ldl', dbUnit: 'mg/dl' },
  {
    pattern: /apolipoprotein\s*b|apo\s*b\b/i,
    id: 'apob',
    dbUnit: 'mg/dl',
    convert: (v, fromUnit) =>
      fromUnit.includes('g/l') ? UNIT_CONVERSIONS.apoB_g_to_mg(v) : v,
  },
  { pattern: /lipoprotein\s*\(?a\)?/i, id: 'lpa', dbUnit: 'nmol/l' },
  { pattern: /homocystein/i, id: 'homocystein', dbUnit: 'umol/l' },

  // Eisen
  { pattern: /\bferritin\b/i, id: 'ferritin', dbUnit: 'ng/ml' },
  { pattern: /transferrins[äa]ttigung/i, id: 'transferrinsaettigung', dbUnit: '%' },
  { pattern: /\btransferrin\b(?!.*s[äa]ttigung)/i, id: 'transferrin', dbUnit: 'mg/dl' },
  { pattern: /serum[- ]?eisen|eisen\s*\(serum\)/i, id: 'serum-eisen', dbUnit: 'µg/dl' },

  // Blutbild
  { pattern: /\bleukozyten\b/i, id: 'leukozyten', dbUnit: 'Tsd/µl' },
  { pattern: /\berythrozyten\b/i, id: 'erythrozyten', dbUnit: 'Mio/µl' },
  { pattern: /rdw|evb/i, id: 'rdw', dbUnit: '%' },
  { pattern: /h[äa]moglobin\b/i, id: 'haemoglobin', dbUnit: 'g/dl' },
  { pattern: /h[äa]matokrit/i, id: 'haematokrit', dbUnit: '%' },
  { pattern: /\bmcv\b/i, id: 'mcv', dbUnit: 'fl' },
  { pattern: /\bmch\b|mch\/hbe/i, id: 'mch', dbUnit: 'pg' },
  { pattern: /\bmchc\b/i, id: 'mchc', dbUnit: 'g/dl' },
  { pattern: /\bthrombozyten\b/i, id: 'thrombozyten', dbUnit: 'Tsd/µl' },

  // Hormone
  {
    pattern: /\btestosteron\b(?!\s*(frei|free|index))/i,
    id: 'testosteron-gesamt',
    dbUnit: 'ng/dl',
    convert: (v, fromUnit) =>
      fromUnit.includes('ng/ml') ? UNIT_CONVERSIONS.testo_ng_ml_to_ng_dl(v) : v,
  },
  { pattern: /\bshbg\b/i, id: 'shbg', dbUnit: 'nmol/l' },
  { pattern: /dhea[- ]?s/i, id: 'dhea-s', dbUnit: 'ug/dl' },
  { pattern: /[öo]stradiol|17[- ]?beta/i, id: 'estradiol', dbUnit: 'pg/ml' },
  { pattern: /\bcortisol\b/i, id: 'cortisol', dbUnit: 'ug/dl' },
  { pattern: /\bprogesteron\b/i, id: 'progesteron', dbUnit: 'ng/ml' },

  // Vitamine
  { pattern: /vitamin\s*b12|cobalamin/i, id: 'vitamin-b12', dbUnit: 'pg/ml' },
  { pattern: /holotranscobalamin|holo[- ]?tc/i, id: 'holotranscobalamin', dbUnit: 'pmol/l' },
  { pattern: /fols[äa]ure|folat/i, id: 'folsaeure', dbUnit: 'ng/ml' },
  {
    pattern: /25[- ]?hydroxy[- ]?vitamin\s*d|vitamin\s*d3?\s*\(?(25|clia)/i,
    id: 'vitamin-d',
    dbUnit: 'ng/ml',
  },
  { pattern: /coenzym\s*q10|ubiquinol|ubiquinon/i, id: 'coenzym-q10', dbUnit: 'mg/l' },

  // Mineralstoffe
  {
    pattern: /\bselen\b/i,
    id: 'selen',
    dbUnit: 'µg/l',
    convert: (v, fromUnit) =>
      fromUnit.includes('µmol') || fromUnit.includes('umol')
        ? UNIT_CONVERSIONS.selen_umol_to_ug(v)
        : v,
  },
  {
    pattern: /\bzink\b/i,
    id: 'zink',
    dbUnit: 'mg/l',
    convert: (v, fromUnit) =>
      fromUnit.includes('µmol') || fromUnit.includes('umol')
        ? UNIT_CONVERSIONS.zink_umol_to_mg(v)
        : v,
  },

  // Spezial
  { pattern: /omega[- ]?3[- ]?index/i, id: 'omega-3-index', dbUnit: '%' },
];

// ---------------------------------------------------------------------------
// PDF Text extraction
// ---------------------------------------------------------------------------

async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item: { str?: string }) => ('str' in item ? item.str : ''))
      .join(' ');
    pages.push(text);
  }
  return pages.join('\n');
}

// ---------------------------------------------------------------------------
// Value parsing from text
// ---------------------------------------------------------------------------

function parseNumericValue(raw: string): number | null {
  // Handle "<0.60" style values
  const cleaned = raw.replace(/^[<>]\s*/, '').replace(',', '.').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function extractUnit(text: string): string {
  // Common unit patterns
  const unitPatterns = [
    /(?:mg\/dl|g\/dl|ng\/dl|µg\/dl|ug\/dl)/i,
    /(?:mg\/l|g\/l|ng\/ml|pg\/ml|µg\/l|ug\/l)/i,
    /(?:µmol\/l|umol\/l|nmol\/l|mmol\/l|pmol\/l)/i,
    /(?:µU\/ml|mU\/l|mIU\/l|IU\/ml|IU\/l)/i,
    /(?:U\/l|G\/l|T\/l|Tsd\/µl|Mio\/µl)/i,
    /(?:ml\/min(?:\/1[.,]73\s*m2)?)/i,
    /(?:fl|pg|%)/,
  ];

  for (const pattern of unitPatterns) {
    const match = text.match(pattern);
    if (match) return match[0];
  }
  return '';
}

function detectDate(text: string): string | null {
  // Match German date formats: DD.MM.YYYY
  const dateMatch = text.match(
    /(?:Abnahme(?:datum|zeit)?|Eingang|Entnahme)[:\s]*(\d{2})[.](\d{2})[.](\d{4})/i,
  );
  if (dateMatch) {
    return `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
  }
  // Fallback: any date in the header area
  const fallback = text.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (fallback) {
    return `${fallback[3]}-${fallback[2]}-${fallback[1]}`;
  }
  return null;
}

function detectGender(text: string): 'male' | 'female' | null {
  if (/Geschlecht\s*:?\s*M\b/i.test(text)) return 'male';
  if (/Geschlecht\s*:?\s*(?:W|F)\b/i.test(text)) return 'female';
  if (/\bm[äa]nnlich\b/i.test(text)) return 'male';
  if (/\bweiblich\b/i.test(text)) return 'female';
  return null;
}

function detectLab(text: string): string | null {
  const labs = [
    'Bioscientia',
    'Synlab',
    'Sonic',
    'Labor Berlin',
    'IMD',
    'Medizinisches Labor',
    'Mein Direktlabor',
    'Cerascreen',
    'Lykon',
  ];
  for (const lab of labs) {
    if (text.toLowerCase().includes(lab.toLowerCase())) return lab;
  }
  return null;
}

function detectPatientName(text: string): string | null {
  const match = text.match(/Patient[:\s]*([A-ZÄÖÜa-zäöüß]+\s+[A-ZÄÖÜa-zäöüß]+)/);
  return match ? match[1].trim() : null;
}

// ---------------------------------------------------------------------------
// Main parse function
// ---------------------------------------------------------------------------

export async function parsePdf(file: File): Promise<PdfParseResult> {
  const text = await extractTextFromPdf(file);
  const warnings: string[] = [];
  const foundValues: ParsedLabValue[] = [];
  const foundIds = new Set<string>();

  // Detect metadata
  const date = detectDate(text);
  const gender = detectGender(text);
  const lab = detectLab(text);
  const patientName = detectPatientName(text);

  // Split text into segments and try to find lab values
  // Strategy: for each mapping, search the full text for the pattern,
  // then look for a number nearby
  for (const mapping of LAB_MAPPINGS) {
    if (foundIds.has(mapping.id)) continue;

    // Find all occurrences of this lab name in the text
    const nameMatch = text.match(mapping.pattern);
    if (!nameMatch || nameMatch.index === undefined) continue;

    // Get text after the match (next ~100 chars should contain the value)
    const afterMatch = text.slice(nameMatch.index + nameMatch[0].length, nameMatch.index + nameMatch[0].length + 150);

    // Look for a number pattern (possibly with < or > prefix)
    const valueMatch = afterMatch.match(/[<>]?\s*(\d+[.,]?\d*)/);
    if (!valueMatch) continue;

    const rawValue = parseNumericValue(valueMatch[0]);
    if (rawValue === null) continue;

    // Extract the unit from the text near the value
    const unitContext = afterMatch.slice(0, 80);
    const unit = extractUnit(unitContext);

    // Apply conversion if needed
    let convertedValue = rawValue;
    let converted = false;
    let note = mapping.note;

    if (mapping.convert) {
      convertedValue = mapping.convert(rawValue, unit);
      if (convertedValue !== rawValue) {
        converted = true;
        note = note
          ? `${note}; Umgerechnet: ${rawValue} ${unit} → ${convertedValue} ${mapping.dbUnit}`
          : `Umgerechnet: ${rawValue} ${unit} → ${convertedValue} ${mapping.dbUnit}`;
      }
    }

    foundValues.push({
      id: mapping.id,
      name: nameMatch[0].trim(),
      value: convertedValue,
      unit: mapping.dbUnit,
      originalValue: rawValue,
      originalUnit: unit,
      converted,
      note,
    });
    foundIds.add(mapping.id);
  }

  // Calculate derived values if we have the components
  const valMap = new Map(foundValues.map((v) => [v.id, v.value]));

  // Trig/HDL Ratio
  const trig = valMap.get('triglyceride');
  const hdlVal = valMap.get('hdl');
  if (trig !== undefined && hdlVal !== undefined && !foundIds.has('trig-hdl-ratio')) {
    const ratio = Math.round((trig / hdlVal) * 100) / 100;
    foundValues.push({
      id: 'trig-hdl-ratio',
      name: 'Trig/HDL-Ratio (berechnet)',
      value: ratio,
      unit: '',
      originalValue: ratio,
      originalUnit: '',
      converted: false,
      note: `Berechnet: ${trig}/${hdlVal} = ${ratio}`,
    });
  }

  // De-Ritis-Quotient
  const gotVal = valMap.get('got');
  const gptVal = valMap.get('gpt');
  if (gotVal !== undefined && gptVal !== undefined && !foundIds.has('de-ritis-quotient')) {
    const ratio = Math.round((gotVal / gptVal) * 100) / 100;
    foundValues.push({
      id: 'de-ritis-quotient',
      name: 'De-Ritis-Quotient (berechnet)',
      value: ratio,
      unit: '(Quotient)',
      originalValue: ratio,
      originalUnit: '',
      converted: false,
      note: `Berechnet: GOT/GPT = ${gotVal}/${gptVal} = ${ratio}`,
    });
  }

  if (foundValues.length === 0) {
    warnings.push('Keine Blutwerte in der PDF erkannt. Ist dies ein Laborbefund?');
  }

  return { values: foundValues, date, gender, lab, patientName, warnings };
}
