const API_KEY = import.meta.env.VITE_GITHUB_TOKEN
const MODEL = 'gpt-4o-mini'
const MAX_RETRIES = 5
const INITIAL_DELAY_MS = 3000
const MIN_INTERVAL_MS = 1000 // minimum gap between API calls

// ── Global serial queue so only ONE request is in-flight at a time ──
let _queue = Promise.resolve()
function enqueue(fn) {
  const task = _queue.then(fn, fn) // always chain, even after rejection
  _queue = task.then(
    () => sleep(MIN_INTERVAL_MS),
    () => sleep(MIN_INTERVAL_MS),
  )
  return task
}

function parseJsonSafe(text) {
  // Strip markdown fences
  let clean = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
  // If there is leading non-JSON text before the first '{' or '[', strip it
  const firstBrace = clean.search(/[{[]/)
  if (firstBrace > 0) clean = clean.slice(firstBrace)
  return JSON.parse(clean)
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function generateJson(prompt, schemaHint) {
  return enqueue(() => _generateJsonInternal(prompt, schemaHint))
}

async function _generateJsonInternal(prompt, schemaHint) {
  if (!API_KEY) throw new Error('Missing VITE_GITHUB_TOKEN')

  const endpoint = 'https://models.inference.ai.azure.com/chat/completions'
  const body = {
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: 'You are a JSON-only assistant. Always respond with valid JSON. No markdown fences, no explanation, no extra text.',
      },
      {
        role: 'user',
        content: `${prompt}\n\nReturn ONLY valid JSON.`,
      },
    ],
    temperature: 0.2,
    max_tokens: 4096,
    response_format: { type: 'json_object' },
  }

  let lastError = null
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = Math.min(INITIAL_DELAY_MS * 2 ** attempt, 60000)
      console.warn(`[GitHubModels] Retrying in ${delay / 1000}s (attempt ${attempt + 1}/${MAX_RETRIES})`)
      await sleep(delay)
    }

    let response
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify(body),
      })
    } catch (networkErr) {
      lastError = new Error(`Network error calling GitHub Models: ${networkErr.message}`)
      continue
    }

    if (response.status === 429 || response.status === 503) {
      lastError = new Error(`GitHub Models ${response.status} — rate limited or overloaded`)
      continue
    }

    if (!response.ok) {
      const errBody = await response.text().catch(() => '')
      throw new Error(`GitHub Models request failed (${response.status}): ${errBody.slice(0, 300)}`)
    }

    const data = await response.json()

    // OpenAI-compatible response format
    const choice = data?.choices?.[0]
    if (!choice?.message?.content) {
      const reason = choice?.finish_reason || 'unknown'
      throw new Error(`GitHub Models returned empty response (reason: ${reason})`)
    }

    const text = choice.message.content

    try {
      return parseJsonSafe(text)
    } catch {
      console.error('[GitHubModels] Non-JSON response:', text.slice(0, 500))
      throw new Error(`GitHub Models returned non-JSON output (expected: ${schemaHint}). Preview: ${text.slice(0, 100)}`)
    }
  }

  throw lastError
}