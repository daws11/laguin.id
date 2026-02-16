import { createBrowserRouter } from 'react-router-dom'

import { DefaultThemeRedirect } from '@/routes/DefaultThemeRedirect'
import { ThemedLandingRoute } from '@/routes/ThemedLandingRoute'
import { ThemedConfigRoute } from '@/routes/ThemedConfigRoute'
import { ConfigRoute } from '@/routes/ConfigRoute'
import { CheckoutRoute } from '@/routes/CheckoutRoute'
import { AdminRoute } from '@/routes/AdminRoute'
import { PublicRoot } from '@/features/analytics/PublicRoot'
import { ThemeProvider } from '@/features/theme/ThemeContext'

const ADMIN_PATH = '/xk7pqm2n9v4d'

export const router = createBrowserRouter([
  {
    element: <PublicRoot />,
    children: [
      { path: '/', element: <DefaultThemeRedirect /> },
      { path: '/config', element: <ThemeProvider themeSlug={null}><ConfigRoute /></ThemeProvider> },
      { path: '/checkout', element: <CheckoutRoute /> },
      { path: '/:themeSlug', element: <ThemedLandingRoute /> },
      { path: '/:themeSlug/config', element: <ThemedConfigRoute /> },
    ],
  },
  { path: ADMIN_PATH, element: <AdminRoute /> },
])

