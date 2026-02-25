const API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const MODEL = 'gemini-2.5-flash'

function parseJsonSafe(text) {
  const clean = text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim()
  return JSON.parse(clean)
}

export async function generateJson(prompt, schemaHint) {
  if (!API_KEY) throw new Error('Missing VITE_GEMINI_API_KEY')

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`
  const body = {
    contents: [{ role: 'user', parts: [{ text: `${prompt}\n\nReturn only JSON.` }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 2048,
    },
  }
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) throw new Error('Gemini request failed')

  const data = await response.json()
  const text =
    data?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || '{}'

  try {
    return parseJsonSafe(text)
  } catch {
    throw new Error(`Gemini returned non-JSON output. Expected: ${schemaHint}`)
  }
}