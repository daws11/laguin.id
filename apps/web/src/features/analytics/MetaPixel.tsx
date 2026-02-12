import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

declare global {
  interface Window {
    fbq?: (...args: any[]) => void
    _fbq?: any
  }
}

const META_PIXEL_SCRIPT_ID = 'meta-pixel-base'

function ensureMetaPixelLoaded(pixelId: string) {
  const id = (pixelId ?? '').trim()
  if (!id) return
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  // Avoid double-inject (React StrictMode in dev, re-mounts, etc.)
  if (document.getElementById(META_PIXEL_SCRIPT_ID)) return

  ;(function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
    if (f.fbq) return
    n = (f.fbq = function () {
      // eslint-disable-next-line prefer-rest-params
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
    })
    if (!f._fbq) f._fbq = n
    n.push = n
    n.loaded = true
    n.version = '2.0'
    n.queue = []
    t = b.createElement(e)
    t.id = META_PIXEL_SCRIPT_ID
    t.async = true
    t.src = v
    s = b.getElementsByTagName(e)[0]
    s.parentNode.insertBefore(t, s)
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js')

  window.fbq?.('init', id)
}

export function MetaPixel({ pixelId }: { pixelId: string }) {
  const location = useLocation()

  useEffect(() => {
    ensureMetaPixelLoaded(pixelId)
    window.fbq?.('track', 'PageView')
    // Track SPA navigation as page views
  }, [pixelId, location.pathname, location.search])

  return null
}

