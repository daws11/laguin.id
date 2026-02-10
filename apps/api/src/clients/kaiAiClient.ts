type KieSunoGenerateParams = {
  apiKey: string
  callbackUrl: string
  model: string
  title: string
  style: string
  lyrics: string
  // Optional tuning knobs
  negativeTags?: string
  vocalGender?: 'm' | 'f'
  styleWeight?: number
  weirdnessConstraint?: number
  audioWeight?: number
  personaId?: string
}

type KieSunoGenerateResponse = {
  code: number
  msg: string
  data?: {
    taskId?: string
  }
}

type KieSunoRecordInfoResponse = {
  code: number
  msg: string
  data?: {
    taskId?: string
    status?: string
    response?: {
      sunoData?: Array<{
        id?: string
        audioUrl?: string
        streamAudioUrl?: string
        imageUrl?: string
        prompt?: string
        modelName?: string
        title?: string
        tags?: string
        createTime?: string
        duration?: number
      }>
    }
    errorCode?: string | null
    errorMessage?: string | null
  }
}

function getKieBaseUrl() {
  // Prefer the new var name; keep backward compat with existing env used earlier.
  const raw = process.env.KIE_AI_BASE_URL ?? process.env.KAI_AI_BASE_URL ?? 'https://api.kie.ai'
  return raw.replace(/\/$/, '')
}

export async function createSunoTaskWithKieAi(params: KieSunoGenerateParams): Promise<{ taskId: string; metadata: unknown }> {
  const baseUrl = getKieBaseUrl()

  const payload = {
    customMode: true,
    instrumental: false,
    callBackUrl: params.callbackUrl,
    model: params.model,
    prompt: params.lyrics,
    style: params.style,
    title: params.title,
    negativeTags: params.negativeTags,
    vocalGender: params.vocalGender,
    styleWeight: params.styleWeight,
    weirdnessConstraint: params.weirdnessConstraint,
    audioWeight: params.audioWeight,
    personaId: params.personaId,
  }

  const res = await fetch(`${baseUrl}/api/v1/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.apiKey}`,
    },
    body: JSON.stringify(payload),
  })

  const json = (await res.json().catch(() => null)) as KieSunoGenerateResponse | null
  if (!res.ok) {
    throw new Error(`kie.ai generate failed (${res.status}): ${JSON.stringify(json)}`)
  }
  if (!json || json.code !== 200) {
    throw new Error(`kie.ai generate error: ${JSON.stringify(json)}`)
  }
  const taskId = json.data?.taskId
  if (!taskId) throw new Error(`kie.ai generate response missing taskId: ${JSON.stringify(json)}`)
  return { taskId, metadata: json }
}

export async function getSunoTaskWithKieAi(params: {
  apiKey: string
  taskId: string
}): Promise<{ status: string; trackUrl: string | null; trackUrls: string[]; metadata: unknown }> {
  const baseUrl = getKieBaseUrl()
  const url = new URL(`${baseUrl}/api/v1/generate/record-info`)
  url.searchParams.set('taskId', params.taskId)

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
    },
  })

  const json = (await res.json().catch(() => null)) as KieSunoRecordInfoResponse | null
  if (!res.ok) {
    throw new Error(`kie.ai record-info failed (${res.status}): ${JSON.stringify(json)}`)
  }
  if (!json || json.code !== 200) {
    throw new Error(`kie.ai record-info error: ${JSON.stringify(json)}`)
  }

  const status = json.data?.status ?? 'UNKNOWN'
  const sunoData = json.data?.response?.sunoData ?? []
  const trackUrls = sunoData.map((x) => x.audioUrl).filter((x): x is string => typeof x === 'string' && x.length > 0)
  const trackUrl = trackUrls[0] ?? null

  return { status, trackUrl, trackUrls, metadata: json }
}

