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
// ---------------------------------------------------------------------------

interface LabMapping {
  pattern: RegExp;
  id: string;
  dbUnit: string;
  convert?: (value: number, fromUnit: string) => number;
  note?: string;
}

const UNIT_CONVERSIONS = {
  apoB_g_to_mg: (v: number) => Math.round(v * 100 * 10) / 10,
  testo_ng_ml_to_ng_dl: (v: number) => Math.round(v * 100 * 10) / 10,
  selen_umol_to_ug: (v: number) => Math.round(v * 78.96 * 10) / 10,
  zink_umol_to_mg: (v: number) => Math.round(v * 0.06538 * 1000) / 1000,
  mg_mmol_to_mg: (v: number) => Math.round(v * 24.305 * 10) / 10,
};

// Normalize µ variants: PDF may use U+00B5 (micro sign) or U+03BC (mu)
function normalizeText(s: string): string {
  return s.replace(/\u00B5/g, '\u03BC').replace(/μ/g, 'µ');
}

const LAB_MAPPINGS: LabMapping[] = [
  // Klinische Chemie
  { pattern: /gamma[- ]?gt/i, id: 'ggt', dbUnit: 'U/l' },
  { pattern: /got\s*\/?\s*ast/i, id: 'got', dbUnit: 'U/l' },
  { pattern: /gpt\s*\/?\s*alt/i, id: 'gpt', dbUnit: 'U/l' },
  { pattern: /harns[äa]ure/i, id: 'harnsaeure', dbUnit: 'mg/dl' },
  { pattern: /kreatinin\b(?!.*cystatin)/i, id: 'kreatinin', dbUnit: 'mg/dl' },
  { pattern: /(?:kombinierte\s*gfr|glom.*filtrations.*ckd)/i, id: 'gfr', dbUnit: 'ml/min/1.73m²' },
  { pattern: /cystatin\s*c\b/i, id: 'cystatin-c', dbUnit: 'mg/l' },
  { pattern: /crp\s*(quantitativ|sensitiv|hs)/i, id: 'hs-crp', dbUnit: 'mg/l' },
  { pattern: /bilirubin\s*(gesamt)?/i, id: 'bilirubin', dbUnit: 'mg/dl' },
  { pattern: /\bck\b(?!\s*-?\s*mb)/i, id: 'ck', dbUnit: 'U/l' },
  { pattern: /\bldh\b/i, id: 'ldh', dbUnit: 'U/l' },

  // Elektrolyte
  { pattern: /\bkalium\b/i, id: 'kalium', dbUnit: 'mmol/l' },
  {
    pattern: /\bmagnesium\b/i,
    id: 'magnesium',
    dbUnit: 'mg/l',
    convert: (v, u) => u.includes('mmol') ? UNIT_CONVERSIONS.mg_mmol_to_mg(v) : v,
    note: 'Serum-Wert (nicht Vollblut)',
  },

  // Schilddrüse
  { pattern: /ft\s*3\b|freies?\s*trijod/i, id: 'ft3', dbUnit: 'pg/ml' },
  { pattern: /ft\s*4\b|freies?\s*thyroxin/i, id: 'ft4', dbUnit: 'ng/dl' },
  { pattern: /\btsh\b/i, id: 'tsh', dbUnit: 'mU/l' },
  { pattern: /tpo[- ]?ak|anti[- ]?tpo/i, id: 'tpo-ak', dbUnit: 'IU/ml' },

  // Kohlenhydratstoffwechsel
  { pattern: /glukose\s*n[üu]chtern|n[üu]chtern.*glukose|gluco\s*exact/i, id: 'nuechtern-glukose', dbUnit: 'mg/dl' },
  { pattern: /\bhba1c\b(?!\s*\(ifcc)/i, id: 'hba1c', dbUnit: '%' },
  { pattern: /\binsulin\b/i, id: 'nuechtern-insulin', dbUnit: 'µU/ml' },
  { pattern: /homa[- ]?(index|ir)/i, id: 'homa-ir', dbUnit: '(dimensionslos)' },

  // Lipide
  { pattern: /cholesterin\s*gesamt/i, id: 'gesamtcholesterin', dbUnit: 'mg/dl' },
  { pattern: /\btriglyceride\b/i, id: 'triglyceride', dbUnit: 'mg/dl' },
  { pattern: /hdl[- ]?cholesterin/i, id: 'hdl', dbUnit: 'mg/dl' },
  { pattern: /ldl[- ]?cholesterin/i, id: 'ldl', dbUnit: 'mg/dl' },
  {
    pattern: /apolipoprotein\s*b|apo\s*b\b/i,
    id: 'apob',
    dbUnit: 'mg/dl',
    convert: (v, u) => u.includes('g/l') && !u.includes('mg') ? UNIT_CONVERSIONS.apoB_g_to_mg(v) : v,
  },
  { pattern: /lipoprotein\s*\(?\s*a\s*\)?/i, id: 'lpa', dbUnit: 'nmol/l' },
  { pattern: /\bhomocystein\b/i, id: 'homocystein', dbUnit: 'umol/l' },

  // Eisen
  { pattern: /\bferritin\b/i, id: 'ferritin', dbUnit: 'ng/ml' },
  { pattern: /transferrins[äa]ttigung/i, id: 'transferrinsaettigung', dbUnit: '%' },
  { pattern: /\btransferrin\b(?!.*s[äa]ttigung)/i, id: 'transferrin', dbUnit: 'mg/dl' },
  { pattern: /serum[- ]?eisen|eisen\s*\(serum\)/i, id: 'serum-eisen', dbUnit: 'µg/dl' },

  // Blutbild
  { pattern: /\bleukozyten\b/i, id: 'leukozyten', dbUnit: 'Tsd/µl' },
  { pattern: /\berythrozyten\b/i, id: 'erythrozyten', dbUnit: 'Mio/µl' },
  { pattern: /\brdw\b|\bevb\b/i, id: 'rdw', dbUnit: '%' },
  { pattern: /h[äa]moglobin\b/i, id: 'haemoglobin', dbUnit: 'g/dl' },
  { pattern: /h[äa]matokrit\b/i, id: 'haematokrit', dbUnit: '%' },
  { pattern: /\bmcv\b/i, id: 'mcv', dbUnit: 'fl' },
  { pattern: /\bmch\b|mch\s*\/\s*hbe/i, id: 'mch', dbUnit: 'pg' },
  { pattern: /\bmchc\b/i, id: 'mchc', dbUnit: 'g/dl' },
  { pattern: /\bthrombozyten\b/i, id: 'thrombozyten', dbUnit: 'Tsd/µl' },

  // Hormone
  {
    pattern: /\btestosteron\b(?!\s*(frei|free|index))/i,
    id: 'testosteron-gesamt',
    dbUnit: 'ng/dl',
    convert: (v, u) => u.includes('ng/ml') ? UNIT_CONVERSIONS.testo_ng_ml_to_ng_dl(v) : v,
  },
  { pattern: /\bshbg\b/i, id: 'shbg', dbUnit: 'nmol/l' },
  { pattern: /\bdhea[- ]?s\b/i, id: 'dhea-s', dbUnit: 'ug/dl' },
  { pattern: /[öo]stradiol|17[- ]?beta/i, id: 'estradiol', dbUnit: 'pg/ml' },
  { pattern: /\bcortisol\b/i, id: 'cortisol', dbUnit: 'ug/dl' },
  { pattern: /\bprogesteron\b/i, id: 'progesteron', dbUnit: 'ng/ml' },

  // Vitamine
  { pattern: /vitamin\s*b\s*12|cobalamin/i, id: 'vitamin-b12', dbUnit: 'pg/ml' },
  { pattern: /holotranscobalamin|holo[- ]?tc/i, id: 'holotranscobalamin', dbUnit: 'pmol/l' },
  { pattern: /fols[äa]ure|folat\b/i, id: 'folsaeure', dbUnit: 'ng/ml' },
  { pattern: /25[- ]?hydroxy[- ]?vitamin\s*d|vitamin\s*d\b/i, id: 'vitamin-d', dbUnit: 'ng/ml' },
  { pattern: /coenzym\s*q10|ubiquinol|ubiquinon/i, id: 'coenzym-q10', dbUnit: 'mg/l' },

  // Mineralstoffe
  {
    pattern: /\bselen\b/i,
    id: 'selen',
    dbUnit: 'µg/l',
    convert: (v, u) => (u.includes('mol') ? UNIT_CONVERSIONS.selen_umol_to_ug(v) : v),
  },
  {
    pattern: /\bzink\b/i,
    id: 'zink',
    dbUnit: 'mg/l',
    convert: (v, u) => (u.includes('mol') ? UNIT_CONVERSIONS.zink_umol_to_mg(v) : v),
  },

  // Spezial
  { pattern: /omega[- ]?3[- ]?index/i, id: 'omega-3-index', dbUnit: '%' },
];

// ---------------------------------------------------------------------------
// PDF Text extraction — POSITION-BASED LINE RECONSTRUCTION
// ---------------------------------------------------------------------------

interface TextItem {
  str: string;
  x: number;
  y: number;
}

async function extractLinesFromPdf(file: File): Promise<{ lines: string[]; fullText: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const allLines: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    // Extract items with positions
    const items: TextItem[] = [];
    for (const item of content.items) {
      if (!('str' in item) || !('transform' in item)) continue;
      const raw = item as { str: string; transform: number[] };
      if (!raw.str.trim()) continue;
      items.push({
        str: raw.str,
        x: raw.transform[4],
        y: Math.round(raw.transform[5] * 10) / 10, // round Y to group items on same line
      });
    }

    // Group by Y coordinate (tolerance of 2 units = same line)
    const lineMap = new Map<number, TextItem[]>();
    for (const item of items) {
      // Find existing line within tolerance
      let foundY: number | null = null;
      for (const [y] of lineMap) {
        if (Math.abs(y - item.y) < 2) {
          foundY = y;
          break;
        }
      }
      const key = foundY ?? item.y;
      if (!lineMap.has(key)) lineMap.set(key, []);
      lineMap.get(key)!.push(item);
    }

    // Sort lines by Y (descending = top to bottom in PDF coordinate system)
    const sortedYs = [...lineMap.keys()].sort((a, b) => b - a);

    for (const y of sortedYs) {
      const lineItems = lineMap.get(y)!;
      // Sort items within line by X (left to right)
      lineItems.sort((a, b) => a.x - b.x);
      const lineText = lineItems.map((item) => item.str).join(' ');
      allLines.push(normalizeText(lineText));
    }
  }

  return { lines: allLines, fullText: allLines.join('\n') };
}

// ---------------------------------------------------------------------------
// Value parsing
// ---------------------------------------------------------------------------

function parseNumericValue(raw: string): number | null {
  const cleaned = raw.replace(/^[<>≤≥]\s*/, '').replace(',', '.').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function extractUnit(text: string): string {
  const normalized = normalizeText(text);
  const unitPatterns = [
    /(?:mg\/dl|g\/dl|ng\/dl|µg\/dl|ug\/dl)/i,
    /(?:mg\/l|g\/l|ng\/ml|pg\/ml|µg\/l|ug\/l)/i,
    /(?:µmol\/l|umol\/l|nmol\/l|mmol\/l|pmol\/l)/i,
    /(?:µU\/ml|mU\/l|mIU\/l|IU\/ml|IU\/l)/i,
    /(?:U\/l|G\/l|T\/l|Tsd\/µl|Mio\/µl)/i,
    /(?:ml\/min(?:\/1[.,]73\s*m2\s*KOF?)?)/i,
    /(?:fl|pg|%)/,
  ];
  for (const pattern of unitPatterns) {
    const match = normalized.match(pattern);
    if (match) return match[0];
  }
  return '';
}

function detectDate(text: string): string | null {
  const dateMatch = text.match(
    /(?:Abnahme(?:datum|zeit)?|Eingang|Entnahme)[:\s]*(\d{2})[.](\d{2})[.](\d{4})/i,
  );
  if (dateMatch) return `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
  const fallback = text.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (fallback) return `${fallback[3]}-${fallback[2]}-${fallback[1]}`;
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
  const labs = ['Bioscientia', 'Synlab', 'Sonic', 'Labor Berlin', 'IMD',
    'Medizinisches Labor', 'Mein Direktlabor', 'Cerascreen', 'Lykon'];
  for (const lab of labs) {
    if (text.toLowerCase().includes(lab.toLowerCase())) return lab;
  }
  return null;
}

// ---------------------------------------------------------------------------
// LINE-BASED MATCHING: Much more reliable than full-text search
// ---------------------------------------------------------------------------

/**
 * For each line, check if it matches a lab name pattern.
 * If so, extract the numeric value from THE SAME LINE.
 * This prevents mixing up numbers from adjacent lines.
 */
function matchLineToValue(
  line: string,
  nextLine: string | undefined,
  mappings: LabMapping[],
  foundIds: Set<string>,
): ParsedLabValue | null {
  for (const mapping of mappings) {
    if (foundIds.has(mapping.id)) continue;

    const nameMatch = line.match(mapping.pattern);
    if (!nameMatch) continue;

    // Extract the part AFTER the matched name on this line
    const afterName = line.slice(nameMatch.index! + nameMatch[0].length);

    // Look for a number on THIS line (after the name)
    let valueMatch = afterName.match(/[<>≤≥]?\s*(\d+[.,]?\d*)/);
    let unitContext = afterName;

    // If no number on this line, check the next line (sometimes value wraps)
    if (!valueMatch && nextLine) {
      valueMatch = nextLine.match(/^\s*[<>≤≥]?\s*(\d+[.,]?\d*)/);
      unitContext = nextLine;
    }

    if (!valueMatch) continue;

    const rawValue = parseNumericValue(valueMatch[0]);
    if (rawValue === null) continue;

    const unit = extractUnit(unitContext);

    let convertedValue = rawValue;
    let converted = false;
    let note = mapping.note;

    if (mapping.convert) {
      convertedValue = mapping.convert(rawValue, unit);
      if (Math.abs(convertedValue - rawValue) > 0.001) {
        converted = true;
        note = note
          ? `${note}; Umgerechnet: ${rawValue} ${unit} → ${convertedValue} ${mapping.dbUnit}`
          : `Umgerechnet: ${rawValue} ${unit} → ${convertedValue} ${mapping.dbUnit}`;
      }
    }

    return {
      id: mapping.id,
      name: nameMatch[0].trim(),
      value: convertedValue,
      unit: mapping.dbUnit,
      originalValue: rawValue,
      originalUnit: unit,
      converted,
      note,
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main parse function
// ---------------------------------------------------------------------------

export async function parsePdf(file: File): Promise<PdfParseResult> {
  const { lines, fullText } = await extractLinesFromPdf(file);
  const warnings: string[] = [];
  const foundValues: ParsedLabValue[] = [];
  const foundIds = new Set<string>();

  // Detect metadata from full text
  const date = detectDate(fullText);
  const gender = detectGender(fullText);
  const lab = detectLab(fullText);

  // LINE-BY-LINE matching — the core improvement
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = i + 1 < lines.length ? lines[i + 1] : undefined;

    const result = matchLineToValue(line, nextLine, LAB_MAPPINGS, foundIds);
    if (result) {
      foundValues.push(result);
      foundIds.add(result.id);
    }
  }

  // Calculate derived values
  const valMap = new Map(foundValues.map((v) => [v.id, v.value]));

  // Trig/HDL Ratio
  const trig = valMap.get('triglyceride');
  const hdlVal = valMap.get('hdl');
  if (trig !== undefined && hdlVal !== undefined && !foundIds.has('trig-hdl-ratio')) {
    const ratio = Math.round((trig / hdlVal) * 100) / 100;
    foundValues.push({
      id: 'trig-hdl-ratio',
      name: 'Trig/HDL-Ratio (berechnet)',
      value: ratio, unit: '', originalValue: ratio, originalUnit: '',
      converted: false, note: `Berechnet: ${trig}/${hdlVal} = ${ratio}`,
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
      value: ratio, unit: '(Quotient)', originalValue: ratio, originalUnit: '',
      converted: false, note: `Berechnet: GOT/GPT = ${gotVal}/${gptVal} = ${ratio}`,
    });
  }

  if (foundValues.length === 0) {
    warnings.push('Keine Blutwerte in der PDF erkannt. Ist dies ein Laborbefund?');
  }

  return { values: foundValues, date, gender, lab, patientName: null, warnings };
}
