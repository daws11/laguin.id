import { useEffect, useMemo, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

export type ActivityToastItem = {
  fullName: string
  city: string
  recipientName: string
}

export type ActivityToastConfig = {
  enabled?: boolean
  intervalMs?: number
  durationMs?: number
  items?: ActivityToastItem[]
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

export function ActivityToast({ config }: { config?: ActivityToastConfig | null }) {
  const items = useMemo(() => (Array.isArray(config?.items) ? config!.items! : []), [config])
  const enabled = Boolean(config?.enabled) && items.length > 0

  const intervalMs = useMemo(() => clamp(Number(config?.intervalMs ?? 10000), 2000, 120000), [config])
  const durationMs = useMemo(() => clamp(Number(config?.durationMs ?? 4500), 1000, intervalMs - 250), [config, intervalMs])

  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(false)

  const hideTimeoutRef = useRef<number | null>(null)
  const intervalRef = useRef<number | null>(null)
  const startTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    if (!enabled) {
      setVisible(false)
      return
    }

    function clearTimers() {
      if (hideTimeoutRef.current) window.clearTimeout(hideTimeoutRef.current)
      if (intervalRef.current) window.clearInterval(intervalRef.current)
      if (startTimeoutRef.current) window.clearTimeout(startTimeoutRef.current)
      hideTimeoutRef.current = null
      intervalRef.current = null
      startTimeoutRef.current = null
    }

    function showCurrentThenHide() {
      setVisible(true)
      if (hideTimeoutRef.current) window.clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = window.setTimeout(() => setVisible(false), durationMs)
    }

    clearTimers()
    setIdx(0)

    // Show first toast shortly after load.
    startTimeoutRef.current = window.setTimeout(() => {
      showCurrentThenHide()
    }, 1500)

    intervalRef.current = window.setInterval(() => {
      setIdx((prev) => (items.length ? (prev + 1) % items.length : 0))
      showCurrentThenHide()
    }, intervalMs)

    return () => clearTimers()
  }, [enabled, intervalMs, durationMs, items.length])

  const item = enabled ? items[idx % items.length] : null
  if (!enabled || !item) return null

  return (
    <div className="fixed left-4 bottom-24 md:bottom-6 z-50">
      <div
        className={cn(
          'w-[280px] rounded-2xl border border-rose-100 bg-white/95 backdrop-blur px-4 py-3 shadow-xl transition-all duration-300',
          visible ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 translate-y-2',
        )}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            ♪
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold text-gray-900">{item.fullName}</div>
            <div className="text-xs text-gray-500">{item.city}</div>
            <div className="mt-1 text-xs text-gray-700">
              Baru saja membuat <span className="font-semibold text-rose-600">Lagu</span> untuk{' '}
              <span className="font-semibold text-gray-900">{item.recipientName}</span>
            </div>
          </div>
          <button
            type="button"
            className="ml-1 -mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-gray-50 hover:text-gray-700"
            onClick={() => setVisible(false)}
            aria-label="Tutup"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  )
}

