/**
 * Vite Plugin: Claude Vision API fuer Bild-Import von Laborberichten.
 *
 * Fuegt dem Dev-Server einen POST /api/vision Endpoint hinzu, der:
 * 1. Ein Base64-Bild entgegennimmt
 * 2. Es an die Claude API (Vision) sendet
 * 3. Strukturierte Blutwerte zurueckgibt
 *
 * Der API-Key wird aus .env gelesen (ANTHROPIC_API_KEY).
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import type { Plugin, ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';

// Bekannte Blutwert-IDs fuer den Claude-Prompt
const KNOWN_IDS = [
  'erythrozyten', 'haemoglobin', 'haematokrit', 'mcv', 'mch', 'mchc',
  'leukozyten', 'thrombozyten', 'rdw',
  'hs-crp', 'ck', 'ldh',
  'got', 'gpt', 'ggt', 'bilirubin',
  'kreatinin', 'cystatin-c', 'harnsaeure', 'harnstoff',
  'nuechtern-glukose', 'hba1c', 'nuechtern-insulin',
  'ferritin', 'transferrin', 'transferrinsaettigung', 'serum-eisen',
  'vitamin-d', 'vitamin-b12', 'holotranscobalamin', 'folsaeure', 'coenzym-q10',
  'magnesium', 'zink', 'selen', 'calcium', 'kalium',
  'gesamtcholesterin', 'ldl', 'hdl', 'triglyceride', 'apob', 'lpa', 'homocystein',
  'tsh', 'ft3', 'ft4', 'rt3', 'tpo-ak',
  'testosteron-gesamt', 'shbg', 'dhea-s', 'estradiol', 'cortisol', 'progesteron',
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
- Einheiten genau so uebernehmen wie auf dem Befund`;

function getApiKey(root: string): string {
  try {
    const envPath = join(root, '.env');
    const content = readFileSync(envPath, 'utf-8');
    const match = content.match(/ANTHROPIC_API_KEY=(.+)/);
    return match?.[1]?.trim() ?? '';
  } catch {
    return '';
  }
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

async function callClaudeVision(
  apiKey: string,
  imageBase64: string,
  mediaType: string,
): Promise<Record<string, unknown>> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
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
    const errorText = await response.text();
    throw new Error(`Claude API Fehler (${response.status}): ${errorText}`);
  }

  const result = await response.json() as {
    content: Array<{ type: string; text?: string }>;
  };

  // Extract text from response
  const textBlock = result.content.find((b) => b.type === 'text');
  if (!textBlock?.text) {
    throw new Error('Keine Textantwort von Claude erhalten');
  }

  // Parse JSON from response (might be wrapped in markdown code blocks)
  let jsonText = textBlock.text.trim();
  const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonText = jsonMatch[1].trim();
  }

  return JSON.parse(jsonText) as Record<string, unknown>;
}

export function visionApiPlugin(): Plugin {
  let apiKey = '';
  let root = '';

  return {
    name: 'vision-api',

    configResolved(config) {
      root = config.root;
      apiKey = getApiKey(root);
      if (apiKey) {
        console.log('[Vision API] API-Key geladen, Bild-Import verfuegbar');
      } else {
        console.warn('[Vision API] Kein ANTHROPIC_API_KEY in .env gefunden!');
      }
    },

    configureServer(server: ViteDevServer) {
      // /api/vision and /api/vision/status
      server.middlewares.use('/api/vision', async (req: IncomingMessage, res: ServerResponse) => {
        res.setHeader('Content-Type', 'application/json');

        // GET /api/vision/status
        if (req.url === '/status' || req.url === '/status/') {
          res.end(JSON.stringify({ available: !!apiKey, model: 'claude-sonnet-4-20250514' }));
          return;
        }

        // CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Nur POST erlaubt' }));
          return;
        }

        if (!apiKey) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'ANTHROPIC_API_KEY nicht konfiguriert. Bitte .env pruefen.' }));
          return;
        }

        try {
          const body = await readBody(req);
          const { image, mediaType } = JSON.parse(body) as {
            image: string;
            mediaType: string;
          };

          if (!image || !mediaType) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'image und mediaType erforderlich' }));
            return;
          }

          console.log(`[Vision API] Analysiere Bild (${mediaType}, ${Math.round(image.length * 0.75 / 1024)} KB)...`);

          const result = await callClaudeVision(apiKey, image, mediaType);

          console.log(`[Vision API] Ergebnis: ${(result as { values?: unknown[] }).values?.length ?? 0} Werte erkannt`);

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
        } catch (err) {
          console.error('[Vision API] Fehler:', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            error: err instanceof Error ? err.message : 'Unbekannter Fehler',
          }));
        }
      });

      // (Status-Endpoint ist im /api/vision Handler integriert)
    },
  };
}
