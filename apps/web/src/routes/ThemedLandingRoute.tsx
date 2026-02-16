import { useParams } from 'react-router-dom'
import { ThemeProvider } from '@/features/theme/ThemeContext'
import { LandingRoute } from './LandingRoute'

export function ThemedLandingRoute() {
  const { themeSlug } = useParams<{ themeSlug: string }>()
  return (
    <ThemeProvider themeSlug={themeSlug ?? null}>
      <LandingRoute />
    </ThemeProvider>
  )
}
