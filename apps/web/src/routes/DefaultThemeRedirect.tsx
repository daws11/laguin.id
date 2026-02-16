import { useEffect, useState } from 'react'
import { ThemeProvider } from '@/features/theme/ThemeContext'
import { LandingRoute } from './LandingRoute'
import { apiGet } from '@/lib/http'

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
      <LandingRoute />
    </ThemeProvider>
  )
}
