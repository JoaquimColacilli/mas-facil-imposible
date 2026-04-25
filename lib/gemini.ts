/**
 * Thin wrapper around the Gemini REST API.
 * No SDK — keeps the dependency surface small.
 * Server-side only: never import this from a client component.
 */

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

export type GeminiError = 'service_unavailable' | 'invalid_response' | 'unknown'

export type GeminiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: GeminiError }

interface CallParams {
  imageBase64: string
  mimeType: string
  prompt: string
  schema: Record<string, unknown>
}

/**
 * Calls Gemini 2.5 Flash with an image + prompt and forces a JSON-shaped
 * response via responseSchema. Returns the parsed JSON or a tagged error.
 *
 * On 429 / 503 we surface `service_unavailable` so the caller can decide
 * not to count the attempt against a per-user quota (it's Google's limit,
 * not the user's).
 */
export async function callGeminiJson<T>(params: CallParams): Promise<GeminiResult<T>> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return { ok: false, error: 'unknown' }

  let res: Response
  try {
    res = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: params.prompt },
              { inline_data: { mime_type: params.mimeType, data: params.imageBase64 } },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: params.schema,
          temperature: 0.1,
        },
      }),
    })
  } catch {
    return { ok: false, error: 'unknown' }
  }

  if (res.status === 429 || res.status === 503) {
    return { ok: false, error: 'service_unavailable' }
  }
  if (!res.ok) {
    return { ok: false, error: 'unknown' }
  }

  let body: any
  try {
    body = await res.json()
  } catch {
    return { ok: false, error: 'invalid_response' }
  }

  const text: string | undefined = body?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) return { ok: false, error: 'invalid_response' }

  try {
    return { ok: true, data: JSON.parse(text) as T }
  } catch {
    return { ok: false, error: 'invalid_response' }
  }
}
