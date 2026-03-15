import { prisma } from './prisma'

// --- In-memory theme cache (TTL-based, keyed by slug) ---
type ThemeRow = Awaited<ReturnType<typeof prisma.theme.findUnique>>
const _themeCache = new Map<string, { data: ThemeRow; expiresAt: number }>()
const THEME_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

export async function getCachedThemeBySlug(slug: string): Promise<ThemeRow> {
  const now = Date.now()
  const cached = _themeCache.get(slug)
  if (cached && now < cached.expiresAt) return cached.data

  const theme = await prisma.theme.findUnique({ where: { slug } })
  _themeCache.set(slug, { data: theme, expiresAt: now + THEME_CACHE_TTL_MS })
  return theme
}

/** Call after any theme create/update/delete to clear stale entries. */
export function invalidateThemeCache(slug?: string) {
  if (slug) {
    _themeCache.delete(slug)
  } else {
    _themeCache.clear()
  }
}
