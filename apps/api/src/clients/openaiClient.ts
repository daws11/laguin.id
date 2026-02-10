import OpenAI from 'openai'

type GenerateTextParams = {
  apiKey: string
  prompt: string
  systemPrompt?: string | null
  temperature?: number
}

function inferBaseUrlFromApiKey(apiKey: string) {
  // OpenRouter API keys typically start with "sk-or-".
  // If the user didn't explicitly set a base URL, default to OpenRouter to reduce config friction.
  if (apiKey.startsWith('sk-or-')) return 'https://openrouter.ai/api/v1'
  return null
}

export async function generateTextWithOpenAI(params: GenerateTextParams) {
  const baseURL = process.env.OPENAI_BASE_URL ?? inferBaseUrlFromApiKey(params.apiKey) ?? undefined
  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'
  const system =
    params.systemPrompt ??
    process.env.OPENAI_SYSTEM_PROMPT ??
    'You are a helpful assistant that follows instructions precisely.'

  const defaultHeaders: Record<string, string> = {}
  // Optional OpenRouter attribution headers.
  if (process.env.OPENAI_DEFAULT_HEADERS_REFERER) {
    defaultHeaders['HTTP-Referer'] = process.env.OPENAI_DEFAULT_HEADERS_REFERER
  }
  if (process.env.OPENAI_DEFAULT_HEADERS_TITLE) {
    defaultHeaders['X-Title'] = process.env.OPENAI_DEFAULT_HEADERS_TITLE
  }

  const client = new OpenAI({
    apiKey: params.apiKey,
    baseURL,
    defaultHeaders: Object.keys(defaultHeaders).length ? defaultHeaders : undefined,
  })

  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: params.prompt },
    ],
    temperature: params.temperature ?? 0.8,
  })

  const text = completion.choices[0]?.message?.content ?? ''
  return text.trim()
}

