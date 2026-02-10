import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

let loaded = false

export function loadEnv() {
  if (loaded) return
  loaded = true

  // Ensure `.env` under `apps/api` is loaded even when running from repo root.
  const here = path.dirname(fileURLToPath(import.meta.url)) // .../apps/api/src/lib
  const apiRoot = path.resolve(here, '../..') // .../apps/api
  dotenv.config({ path: path.join(apiRoot, '.env') })

  // Fallback: allow root `.env` if user prefers it.
  dotenv.config()
}

