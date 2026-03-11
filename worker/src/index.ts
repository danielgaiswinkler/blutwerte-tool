/**
 * Cloudflare Worker: Proxy fuer Claude Vision API.
 * Schuetzt den API-Key serverseitig, erlaubt nur Requests von erlaubten Origins.
 */

interface Env {
  ANTHROPIC_API_KEY: string;
}

const ALLOWED_ORIGINS = [
  'https://health-data-tools.github.io',
  'http://localhost:5173',
  'http://localhost:4173',
];

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
  'calcium', 'kalium', 'kupfer',
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
- Serum-Werte fuer Magnesium, Zink, Selen: nutze die -serum IDs (magnesium-serum, zink-serum, selen-serum)`;

function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function isAllowedOrigin(request: Request): string | null {
  const origin = request.headers.get('Origin') ?? '';
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  return null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = isAllowedOrigin(request);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin ?? ''),
      });
    }

    // Only POST allowed
    if (request.method !== 'POST') {
      return Response.json({ error: 'Nur POST erlaubt' }, { status: 405 });
    }

    // Origin check
    if (!origin) {
      return Response.json({ error: 'Nicht autorisiert' }, { status: 403 });
    }

    // API key check
    if (!env.ANTHROPIC_API_KEY) {
      return Response.json({ error: 'API-Key nicht konfiguriert' }, {
        status: 500,
        headers: corsHeaders(origin),
      });
    }

    try {
      const { image, mediaType } = await request.json() as {
        image: string;
        mediaType: string;
      };

      if (!image || !mediaType) {
        return Response.json({ error: 'image und mediaType erforderlich' }, {
          status: 400,
          headers: corsHeaders(origin),
        });
      }

      // Forward to Claude API
      const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
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
                    data: image,
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

      if (!claudeResponse.ok) {
        const errorText = await claudeResponse.text();
        return Response.json(
          { error: `Claude API Fehler (${claudeResponse.status})` },
          { status: 502, headers: corsHeaders(origin) },
        );
      }

      const result = await claudeResponse.json() as {
        content: Array<{ type: string; text?: string }>;
      };

      const textBlock = result.content.find((b) => b.type === 'text');
      if (!textBlock?.text) {
        return Response.json(
          { error: 'Keine Textantwort von Claude erhalten' },
          { status: 502, headers: corsHeaders(origin) },
        );
      }

      // Parse JSON from response
      let jsonText = textBlock.text.trim();
      const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1].trim();
      }

      const parsed = JSON.parse(jsonText);

      return Response.json(parsed, {
        headers: corsHeaders(origin),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
      return Response.json({ error: message }, {
        status: 500,
        headers: corsHeaders(origin),
      });
    }
  },
};
