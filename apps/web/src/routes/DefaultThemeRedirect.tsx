import { lazy, Suspense, useEffect, useState } from 'react'
import { ThemeProvider } from '@/features/theme/ThemeContext'
import { apiGet } from '@/lib/http'

const LandingRoute = lazy(() => import('./LandingRoute').then(m => ({ default: m.LandingRoute })))

function LazyFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[var(--theme-accent,#E11D48)]" />
    </div>
  )
}

export function DefaultThemeRedirect() {
  const [defaultTheme, setDefaultTheme] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    apiGet<{ defaultThemeSlug: string | null }>('/api/public/settings')
      .then((res) => {
        setDefaultTheme(res?.defaultThemeSlug ?? null)
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  if (!loaded) return null

  return (
    <ThemeProvider themeSlug={defaultTheme}>
      <Suspense fallback={<LazyFallback />}>
        <LandingRoute />
      </Suspense>
    </ThemeProvider>
  )
}
