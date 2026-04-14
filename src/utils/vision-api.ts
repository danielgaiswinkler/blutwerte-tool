/**
 * Vision API Client fuer Bild-Import von Laborberichten.
 *
 * Strategie:
 * 1. Cloudflare Worker (Daniels API-Key serverseitig) — Standard fuer alle User
 * 2. Fallback: Eigener API-Key (verschluesselt in localStorage) — fuer Power-User
 */

import type { ParsedLabValue } from './pdf-parser';

// Vision-API Endpoint in der SoD-Toolbox (Fly.io). Früher: Cloudflare Worker.
const WORKER_URL = 'https://ki.success-on-demand.com/api/tools/public/blutwerte-vision';

// Fuer den Fallback mit eigenem Key: Prompt + IDs
const KNOWN_IDS = [
  'erythrozyten', 'haemoglobin', 'haematokrit', 'mcv', 'mch', 'mchc',
  'leukozyten', 'thrombozyten', 'rdw',
  'neutrophile', 'lymphozyten-abs', 'monozyten-abs', 'eosinophile-abs', 'basophile-abs',
  'hs-crp', 'ck', 'ldh', 'bsg',
  'got', 'gpt', 'ggt', 'bilirubin', 'ap', 'lipase',
  'kreatinin', 'cystatin-c', 'harnsaeure', 'harnstoff', 'gfr',
  'nuechtern-glukose', 'hba1c', 'nuechtern-insulin',
  'ferritin', 'transferrin', 'transferrinsaettigung', 'serum-eisen',
  'vitamin-d', 'vitamin-b12', 'holotranscobalamin', 'folsaeure', 'coenzym-q10',
  'magnesium', 'magnesium-serum', 'zink', 'zink-serum', 'selen', 'selen-serum',
  'calcium', 'kalium', 'kupfer', 'natrium',
  'albumin-rel', 'alpha1-globulin-rel', 'alpha2-globulin-rel',
  'beta1-globulin-rel', 'beta2-globulin-rel', 'gamma-globulin-rel',
  'gesamtcholesterin', 'ldl', 'hdl', 'non-hdl', 'triglyceride', 'apob', 'lpa', 'homocystein',
  'tsh', 'ft3', 'ft4', 'rt3', 'tpo-ak',
  'testosteron-gesamt', 'testosteron-frei', 'shbg', 'dhea-s', 'estradiol',
  'cortisol', 'progesteron', 'lh', 'fsh', 'prolaktin', 'fai',
  'omega-3-index',
];

const VISION_PROMPT = `Du bist ein medizinischer Laborwerte-Parser. Analysiere dieses Bild eines Laborbefunds und extrahiere alle erkennbaren Blutwerte.

Verwende diese IDs fuer bekannte Werte:
${KNOWN_IDS.join(', ')}

Antworte NUR mit validem JSON in diesem Format (kein Markdown, keine Erklaerung):
{
  "values": [
    {"id": "ldl", "name": "LDL-Cholesterin", "value": 149.0, "unit": "mg/dl"}
  ],
  "date": "2025-04-03",
  "lab": "Bioscentia",
  "warnings": []
}

Regeln:
- Dezimalkomma zu Punkt: 5,6 wird 5.6
- Nur gemessene Zahlenwerte extrahieren, KEINE Referenzbereiche als Werte
- Werte wie "<0.60" als 0.60 erfassen mit note "unter Nachweisgrenze"
- "date" im ISO-Format (YYYY-MM-DD) oder null falls nicht erkennbar
- "lab" = Laborname oder null
- Bei Werten die keiner bekannten ID zugeordnet werden koennen: id = "unknown" und in warnings auflisten
- Bei berechneten Werten (GFR, HOMA-Index, Non-HDL etc.) ebenfalls extrahieren
- Einheiten genau so uebernehmen wie auf dem Befund
- Serum-Werte fuer Magnesium, Zink, Selen: nutze die -serum IDs (magnesium-serum, zink-serum, selen-serum)
- Laborident-Codes (Bioscentia etc.) auf IDs mappen: ELALB=albumin-rel, ELA1G=alpha1-globulin-rel, ELA2G=alpha2-globulin-rel, ELB1G=beta1-globulin-rel, ELB2G=beta2-globulin-rel, ELGG=gamma-globulin-rel, NA=natrium`;

export interface VisionResult {
  values: ParsedLabValue[];
  date: string | null;
  lab: string | null;
  warnings: string[];
}

/** Parse the raw API/Worker response into VisionResult */
function parseVisionResponse(parsed: {
  values: Array<{ id: string; name: string; value: number; unit: string; note?: string }>;
  date: string | null;
  lab: string | null;
  warnings: string[];
}): VisionResult {
  const labValues: ParsedLabValue[] = parsed.values
    .filter((v) => v.id !== 'unknown')
    .map((v) => ({
      id: v.id,
      name: v.name,
      value: v.value,
      unit: v.unit,
      originalValue: v.value,
      originalUnit: v.unit,
      converted: false,
      note: v.note,
    }));

  return {
    values: labValues,
    date: parsed.date,
    lab: parsed.lab,
    warnings: parsed.warnings ?? [],
  };
}

/**
 * Hauptfunktion: Bild analysieren.
 * Versucht zuerst den Cloudflare Worker, dann Fallback auf eigenen Key.
 */
export async function callVisionApi(
  imageBase64: string,
  mediaType: string,
  apiKey?: string,
): Promise<VisionResult> {
  // Strategie 1: Cloudflare Worker (kein eigener Key noetig)
  if (!apiKey) {
    return callWorker(imageBase64, mediaType);
  }

  // Strategie 2: Eigener Key als Fallback
  return callDirectApi(apiKey, imageBase64, mediaType);
}

/** Cloudflare Worker aufrufen */
async function callWorker(imageBase64: string, mediaType: string): Promise<VisionResult> {
  const response = await fetch(WORKER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: imageBase64, mediaType }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: `Fehler ${response.status}` })) as { error: string };
    throw new Error(err.error || `Worker-Fehler (${response.status})`);
  }

  const parsed = await response.json() as {
    values: Array<{ id: string; name: string; value: number; unit: string; note?: string }>;
    date: string | null;
    lab: string | null;
    warnings: string[];
  };

  return parseVisionResponse(parsed);
}

/** Direkt Claude API aufrufen (mit eigenem Key) */
async function callDirectApi(
  apiKey: string,
  imageBase64: string,
  mediaType: string,
): Promise<VisionResult> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: VISION_PROMPT,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Ungueltiger API-Key. Bitte in den Einstellungen pruefen.');
    }
    if (response.status === 429) {
      throw new Error('API-Limit erreicht. Bitte kurz warten und erneut versuchen.');
    }
    const errorText = await response.text();
    throw new Error(`Claude API Fehler (${response.status}): ${errorText}`);
  }

  const result = await response.json() as {
    content: Array<{ type: string; text?: string }>;
  };

  const textBlock = result.content.find((b) => b.type === 'text');
  if (!textBlock?.text) {
    throw new Error('Keine Textantwort von Claude erhalten');
  }

  let jsonText = textBlock.text.trim();
  const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonText = jsonMatch[1].trim();
  }

  const parsed = JSON.parse(jsonText) as {
    values: Array<{ id: string; name: string; value: number; unit: string; note?: string }>;
    date: string | null;
    lab: string | null;
    warnings: string[];
  };

  return parseVisionResponse(parsed);
}
