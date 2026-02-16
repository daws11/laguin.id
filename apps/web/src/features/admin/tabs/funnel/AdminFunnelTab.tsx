import { useCallback, useEffect, useState } from 'react'
import { adminGetFunnel, adminGetThemes, type FunnelData, type ThemeItem } from '@/features/admin/api'

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function defaultFrom(): string {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return formatDate(d)
}

function defaultTo(): string {
  return formatDate(new Date())
}

export function AdminFunnelTab({ t, token }: { t: any; token: string }) {
  const [from, setFrom] = useState(defaultFrom)
  const [to, setTo] = useState(defaultTo)
  const [pendingFrom, setPendingFrom] = useState(from)
  const [pendingTo, setPendingTo] = useState(to)
  const [data, setData] = useState<FunnelData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [themes, setThemes] = useState<ThemeItem[]>([])
  const [themeFilter, setThemeFilter] = useState<string>('')

  useEffect(() => {
    adminGetThemes(token).then(setThemes).catch(() => {})
  }, [token])

  const fetchData = useCallback(async (f: string, toDate: string) => {
    setLoading(true)
    setError(null)
    try {
      const result = await adminGetFunnel(token, f, toDate, themeFilter || undefined)
      setData(result)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load funnel data')
    } finally {
      setLoading(false)
    }
  }, [token, themeFilter])

  useEffect(() => {
    fetchData(from, to)
  }, [from, to, fetchData])

  const handleApply = () => {
    setFrom(pendingFrom)
    setTo(pendingTo)
  }

  const maxCount = data ? Math.max(...data.steps.map((s) => s.count), 1) : 1
  const firstCount = data?.steps[0]?.count ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">{t.funnel}</h3>
        <p className="text-sm text-muted-foreground">{t.funnelDesc}</p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-background p-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">{t.funnelFrom}</label>
          <input
            type="date"
            value={pendingFrom}
            onChange={(e) => setPendingFrom(e.target.value)}
            className="block rounded-md border bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500/40"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">{t.funnelTo}</label>
          <input
            type="date"
            value={pendingTo}
            onChange={(e) => setPendingTo(e.target.value)}
            className="block rounded-md border bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500/40"
          />
        </div>
        <button
          onClick={handleApply}
          disabled={loading}
          className="rounded-md bg-rose-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-rose-700 disabled:opacity-50 transition-colors"
        >
          {t.funnelApply}
        </button>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">{t.themeFilter ?? 'Theme'}</label>
          <select
            value={themeFilter}
            onChange={(e) => { setThemeFilter(e.target.value) }}
            className="block rounded-md border bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500/40"
          >
            <option value="">{t.allThemes ?? 'All Themes'}</option>
            {themes.map((th) => (
              <option key={th.slug} value={th.slug}>{th.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
          {t.loadingShort ?? 'Loading…'}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && data && data.steps.every((s) => s.count === 0) && (
        <div className="rounded-lg border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
          {t.funnelNoData}
        </div>
      )}

      {!loading && data && data.steps.some((s) => s.count > 0) && (
        <div className="space-y-1">
          {data.steps.map((step, i) => {
            const pct = firstCount > 0 ? (step.count / firstCount) * 100 : 0
            const barWidth = maxCount > 0 ? Math.max((step.count / maxCount) * 100, 2) : 2
            const prevCount = i > 0 ? data.steps[i - 1].count : null
            const dropoff = prevCount !== null && prevCount > 0 ? ((prevCount - step.count) / prevCount) * 100 : null

            return (
              <div key={step.key}>
                {i > 0 && dropoff !== null && (
                  <div className="flex items-center gap-2 py-1 pl-4">
                    <svg width="16" height="16" viewBox="0 0 16 16" className="text-muted-foreground/50 shrink-0">
                      <path d="M8 2 L8 14 M4 10 L8 14 L12 10" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-[11px] text-muted-foreground">
                      {dropoff > 0 ? (
                        <span className="text-red-500/80">{t.funnelDropoff}: {dropoff.toFixed(1)}%</span>
                      ) : (
                        <span className="text-emerald-600">{t.funnelConversion}: 100%</span>
                      )}
                    </span>
                  </div>
                )}
                <div className="group relative rounded-lg border bg-background p-3 hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">{step.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold tabular-nums text-foreground">{step.count.toLocaleString()}</span>
                      {firstCount > 0 && (
                        <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700 tabular-nums">
                          {pct.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-muted/50">
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${barWidth}%`,
                        background: `linear-gradient(90deg, #e11d48, #f43f5e ${Math.min(barWidth * 1.5, 100)}%, #fb7185)`,
                      }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
