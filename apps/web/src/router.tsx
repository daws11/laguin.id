import { lazy, Suspense } from 'react'
import { createBrowserRouter, useRouteError, isRouteErrorResponse } from 'react-router-dom'

import { DefaultThemeRedirect } from '@/routes/DefaultThemeRedirect'
import { ThemedLandingRoute } from '@/routes/ThemedLandingRoute'
import { PublicRoot } from '@/features/analytics/PublicRoot'
import { ThemeProvider } from '@/features/theme/ThemeContext'

const ConfigRoute = lazy(() => import('@/routes/ConfigRoute').then(m => ({ default: m.ConfigRoute })))
const CheckoutRoute = lazy(() => import('@/routes/CheckoutRoute').then(m => ({ default: m.CheckoutRoute })))
const AdminRoute = lazy(() => import('@/routes/AdminRoute').then(m => ({ default: m.AdminRoute })))
const ThemedConfigRoute = lazy(() => import('@/routes/ThemedConfigRoute').then(m => ({ default: m.ThemedConfigRoute })))
const UpsellRoute = lazy(() => import('@/routes/UpsellRoute').then(m => ({ default: m.UpsellRoute })))
const ThemedUpsellRoute = lazy(() => import('@/routes/ThemedUpsellRoute').then(m => ({ default: m.ThemedUpsellRoute })))
const PrivacyPage = lazy(() => import('@/routes/PrivacyPage').then(m => ({ default: m.PrivacyPage })))
const TermsPage = lazy(() => import('@/routes/TermsPage').then(m => ({ default: m.TermsPage })))
const ContactPage = lazy(() => import('@/routes/ContactPage').then(m => ({ default: m.ContactPage })))
const OrderDeliveryRoute = lazy(() => import('@/routes/OrderDeliveryRoute').then(m => ({ default: m.OrderDeliveryRoute })))

function LazyFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[var(--theme-accent,#E11D48)]" />
    </div>
  )
}

function RouteErrorFallback() {
  const error = useRouteError()
  const is404 = isRouteErrorResponse(error) && error.status === 404

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="text-4xl font-bold text-gray-800">{is404 ? '404' : 'Oops!'}</h1>
      <p className="mt-2 text-gray-600">
        {is404 ? 'Halaman tidak ditemukan.' : 'Terjadi kesalahan. Silakan coba lagi.'}
      </p>
      <button
        type="button"
        onClick={() => window.location.assign('/')}
        className="mt-6 rounded-lg bg-[var(--theme-accent,#E11D48)] px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90"
      >
        Kembali ke Beranda
      </button>
    </div>
  )
}

const ADMIN_PATH = '/xk7pqm2n9v4d'

export const router = createBrowserRouter([
  {
    element: <PublicRoot />,
    errorElement: <RouteErrorFallback />,
    children: [
      { path: '/', element: <DefaultThemeRedirect /> },
      { path: '/config', element: <Suspense fallback={<LazyFallback />}><ThemeProvider themeSlug={null}><ConfigRoute /></ThemeProvider></Suspense> },
      { path: '/checkout', element: <Suspense fallback={<LazyFallback />}><CheckoutRoute /></Suspense> },
      { path: '/order/:orderId', element: <Suspense fallback={<LazyFallback />}><OrderDeliveryRoute /></Suspense> },
      { path: '/privasi', element: <Suspense fallback={<LazyFallback />}><PrivacyPage /></Suspense> },
      { path: '/ketentuan', element: <Suspense fallback={<LazyFallback />}><TermsPage /></Suspense> },
      { path: '/kontak', element: <Suspense fallback={<LazyFallback />}><ContactPage /></Suspense> },
      { path: ADMIN_PATH, element: <Suspense fallback={<LazyFallback />}><AdminRoute /></Suspense> },
      { path: '/:themeSlug', element: <ThemedLandingRoute /> },
      { path: '/upsell', element: <Suspense fallback={<LazyFallback />}><ThemeProvider themeSlug={null}><UpsellRoute /></ThemeProvider></Suspense> },
      { path: '/:themeSlug/config', element: <Suspense fallback={<LazyFallback />}><ThemedConfigRoute /></Suspense> },
      { path: '/:themeSlug/upsell', element: <Suspense fallback={<LazyFallback />}><ThemedUpsellRoute /></Suspense> },
    ],
  },
])
