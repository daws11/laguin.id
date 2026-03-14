import { useParams } from 'react-router-dom'
import { ThemeProvider } from '@/features/theme/ThemeContext'
import { UpsellRoute } from './UpsellRoute'

export function ThemedUpsellRoute() {
  const { themeSlug } = useParams<{ themeSlug: string }>()
  return (
    <ThemeProvider themeSlug={themeSlug ?? null}>
      <UpsellRoute key={themeSlug} />
    </ThemeProvider>
  )
}
