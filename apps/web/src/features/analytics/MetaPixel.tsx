import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

declare global {
  interface Window {
    fbq?: (...args: any[]) => void
    _fbq?: any
  }
}

const META_PIXEL_SCRIPT_ID = 'meta-pixel-base'

let _pixelLoadScheduled = false
const _pendingInits: string[] = []
const _pendingTracks: Array<[string, ...any[]]> = []

function _doLoadPixel() {
  if (document.getElementById(META_PIXEL_SCRIPT_ID)) {
    _pendingInits.forEach(id => window.fbq?.('init', id))
    _pendingInits.length = 0
    _pendingTracks.forEach(args => window.fbq?.(...args))
    _pendingTracks.length = 0
    return
  }
  ;(function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
    if (f.fbq) return
    n = (f.fbq = function () {
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
  _pendingInits.forEach(id => window.fbq?.('init', id))
  _pendingInits.length = 0
  _pendingTracks.forEach(args => window.fbq?.(...args))
  _pendingTracks.length = 0
}

export function ensureMetaPixelLoaded(pixelId: string) {
  const id = (pixelId ?? '').trim()
  if (!id) return
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  if (document.getElementById(META_PIXEL_SCRIPT_ID)) {
    window.fbq?.('init', id)
    return
  }

  _pendingInits.push(id)
  if (!_pixelLoadScheduled) {
    _pixelLoadScheduled = true
    const schedule = typeof requestIdleCallback === 'function'
      ? requestIdleCallback
      : (cb: () => void) => setTimeout(cb, 1)
    schedule(_doLoadPixel)
  }
}

function _trackPixel(...args: [string, ...any[]]) {
  if (window.fbq) {
    window.fbq(...args)
  } else {
    _pendingTracks.push(args)
  }
}

export function MetaPixel({ pixelId }: { pixelId: string }) {
  const location = useLocation()

  useEffect(() => {
    ensureMetaPixelLoaded(pixelId)
    _trackPixel('track', 'PageView')
  }, [pixelId, location.pathname, location.search])

  return null
}

/** Fire Meta Wishlist event for a specific pixel (e.g. wishlist pixel). */
export function trackWishlist(pixelId: string, params?: Record<string, unknown>) {
  const fbq = (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq
  if (fbq) {
    fbq('trackSingle', pixelId, 'Wishlist', params ?? {})
  }
}

/**
 * Fire a pixel event with an optional eventID for server-side (CAPI) deduplication.
 * Passes {eventID} as the 4th argument to fbq('track', ...) per Meta's deduplication spec.
 */
export function trackPixelEvent(eventName: string, data: Record<string, unknown>, eventId?: string) {
  const args: unknown[] = ['track', eventName, data]
  if (eventId) args.push({ eventID: eventId })
  _trackPixel(...(args as [string, ...any[]]))
}

/**
 * Execute an admin-provided pixel script string.
 * Pass vars to inject named variables into the script scope (e.g. { eventID: 'order_confirmed:xxx' })
 * so admin scripts can call: fbq('track', 'Purchase', {...}, {eventID: eventID})
 */
export function executePixelScript(script: string | null | undefined, vars?: Record<string, unknown>) {
  if (!script || typeof script !== 'string') return
  const cleaned = script.replace(/<\/?script[^>]*>/gi, '').trim()
  if (!cleaned) return
  try {
    if (vars && Object.keys(vars).length > 0) {
      const names = Object.keys(vars)
      const values = names.map(k => vars[k])
      new Function(...names, cleaned)(...values)
    } else {
      new Function(cleaned)()
    }
  } catch (e) {
    console.warn('[MetaPixel] Script execution error:', e)
  }
}

