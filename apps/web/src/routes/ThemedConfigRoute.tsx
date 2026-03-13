import { useParams } from 'react-router-dom'
import { ThemeProvider } from '@/features/theme/ThemeContext'
import { ConfigRoute } from './ConfigRoute'

export function ThemedConfigRoute() {
  const { themeSlug } = useParams<{ themeSlug: string }>()
  return (
    <ThemeProvider themeSlug={themeSlug ?? null}>
      <ConfigRoute key={themeSlug} />
    </ThemeProvider>
  )
}
