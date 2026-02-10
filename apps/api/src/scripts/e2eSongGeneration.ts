type DraftInput = {
  yourName: string
  recipientName: string
  whatsappNumber: string
  occasion: string
  story: string
  musicPreferences: {
    genre?: string
    mood?: string
    vibe?: string
    tempo?: string
    voiceStyle?: string
    language?: string
  }
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms))
}

async function httpJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}: ${text}`)
  }
  return JSON.parse(text) as T
}

async function main() {
  const baseUrl = process.env.E2E_BASE_URL ?? 'http://localhost:3001'
  const timeoutMs = Number(process.env.E2E_TIMEOUT_MS ?? 6 * 60 * 1000) // 6 minutes
  const pollEveryMs = Number(process.env.E2E_POLL_MS ?? 5000)

  const input: DraftInput = {
    yourName: 'Yanuar',
    recipientName: 'Test Recipient',
    whatsappNumber: '+628123456789',
    occasion: 'Valentine',
    story: 'We met at a coffee shop and have been together since.',
    musicPreferences: {
      genre: 'pop',
      mood: 'romantic',
      vibe: 'warm',
      tempo: 'mid',
      voiceStyle: 'male',
      language: 'id',
    },
  }

  const draft = await httpJson<{ orderId: string }>(`${baseUrl}/api/orders/draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  await httpJson(`${baseUrl}/api/orders/${draft.orderId}/confirm`, { method: 'POST' })

  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    const order = await httpJson<any>(`${baseUrl}/api/orders/${draft.orderId}`)
    const trackUrl = order?.trackUrl ?? null
    const lyricsReady = Boolean(order?.lyricsText)
    const moodReady = Boolean(order?.moodDescription)
    console.log(
      JSON.stringify({
        orderId: draft.orderId,
        lyricsReady,
        moodReady,
        trackReady: Boolean(trackUrl),
        trackUrl,
      }),
    )

    if (trackUrl) {
      console.log(`E2E_OK orderId=${draft.orderId} trackUrl=${trackUrl}`)
      return
    }
    await sleep(pollEveryMs)
  }

  throw new Error(`E2E_TIMEOUT orderId=${draft.orderId} after ${timeoutMs}ms`)
}

main().catch((e) => {
  console.error(e?.message ?? e)
  process.exit(1)
})

