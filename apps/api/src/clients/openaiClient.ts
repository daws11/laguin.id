import OpenAI from 'openai'

type GenerateTextParams = {
  apiKey: string
  prompt: string
  systemPrompt?: string | null
  temperature?: number
  model?: string | null
}

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'

export async function generateTextWithOpenAI(params: GenerateTextParams) {
  const baseURL = process.env.OPENAI_BASE_URL || OPENROUTER_BASE_URL
  const model = params.model || process.env.OPENAI_MODEL || 'openai/gpt-4o-mini'
  const system =
    params.systemPrompt ??
    process.env.OPENAI_SYSTEM_PROMPT ??
    'You are a helpful assistant that follows instructions precisely.'

  const defaultHeaders: Record<string, string> = {}
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
