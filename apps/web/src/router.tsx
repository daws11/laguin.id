import { createBrowserRouter, Navigate } from 'react-router-dom'

import { LandingRoute } from '@/routes/LandingRoute'
import { ConfigRoute } from '@/routes/ConfigRoute'
import { CheckoutRoute } from '@/routes/CheckoutRoute'
import { AdminRoute } from '@/routes/AdminRoute'

export const router = createBrowserRouter([
  { path: '/', element: <LandingRoute /> },
  { path: '/config', element: <ConfigRoute /> },
  { path: '/checkout', element: <CheckoutRoute /> },
  { path: '/admin', element: <AdminRoute /> },
  { path: '*', element: <Navigate to="/" replace /> },
])

