const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

async function parseJson(res: Response) {
  const text = await res.text()
  try {
    return text ? JSON.parse(text) : null
  } catch {
    return text
  }
}

export async function apiGet<T>(path: string, opts?: { token?: string }) {
  const res = await fetch(API_BASE + path, {
    method: 'GET',
    headers: {
      ...(opts?.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
  })
  if (!res.ok) {
    const body = await parseJson(res)
    throw new Error(typeof body === 'string' ? body : body?.error ?? `Request failed (${res.status})`)
  }
  return (await parseJson(res)) as T
}

export async function apiPost<T>(path: string, body: unknown, opts?: { token?: string }) {
  const res = await fetch(API_BASE + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(opts?.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const payload = await parseJson(res)
    throw new Error(typeof payload === 'string' ? payload : payload?.error ?? `Request failed (${res.status})`)
  }
  return (await parseJson(res)) as T
}

export async function apiPut<T>(path: string, body: unknown, opts?: { token?: string }) {
  const res = await fetch(API_BASE + path, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(opts?.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const payload = await parseJson(res)
    throw new Error(typeof payload === 'string' ? payload : payload?.error ?? `Request failed (${res.status})`)
  }
  return (await parseJson(res)) as T
}

