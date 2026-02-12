import { createBrowserRouter, Navigate } from 'react-router-dom'

import { LandingRoute } from '@/routes/LandingRoute'
import { ConfigRoute } from '@/routes/ConfigRoute'
import { CheckoutRoute } from '@/routes/CheckoutRoute'
import { AdminRoute } from '@/routes/AdminRoute'
import { PublicRoot } from '@/features/analytics/PublicRoot'

// NOTE: Obscure, static admin path (still protected by API auth).
// Change this value to rotate the admin URL.
const ADMIN_PATH = '/xk7pqm2n9v4d'

export const router = createBrowserRouter([
  // Public app routes (Meta Pixel enabled)
  {
    element: <PublicRoot />,
    children: [
      { path: '/', element: <LandingRoute /> },
      { path: '/config', element: <ConfigRoute /> },
      { path: '/checkout', element: <CheckoutRoute /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },

  // Admin route (Meta Pixel excluded)
  { path: ADMIN_PATH, element: <AdminRoute /> },
])

