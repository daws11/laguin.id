import { lazy, Suspense } from 'react'
import { useParams } from 'react-router-dom'
import { ThemeProvider } from '@/features/theme/ThemeContext'

const LandingRoute = lazy(() => import('./LandingRoute').then(m => ({ default: m.LandingRoute })))

function LazyFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[var(--theme-accent,#E11D48)]" />
    </div>
  )
}

export function ThemedLandingRoute() {
  const { themeSlug } = useParams<{ themeSlug: string }>()
  return (
    <ThemeProvider themeSlug={themeSlug ?? null}>
      <Suspense fallback={<LazyFallback />}>
        <LandingRoute />
      </Suspense>
    </ThemeProvider>
  )
}
