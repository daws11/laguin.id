import { useCallback, useEffect, useState } from 'react'
import { adminGetFunnel, adminGetFunnelTrend, adminGetThemes, type FunnelData, type TrendData, type ThemeItem } from '@/features/admin/api'

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function defaultFrom(): string {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return formatDate(d)
}

function defaultTo(): string {
  return formatDate(new Date())
}

const TREND_LINES = [
  { key: 'step0Pct' as const, countKey: 'step0' as const, label: 'Add to Cart (Step 0)', color: '#f59e0b' },
  { key: 'orderCreatedPct' as const, countKey: 'orderCreated' as const, label: 'Order Created', color: '#3b82f6' },
  { key: 'orderConfirmedPct' as const, countKey: 'orderConfirmed' as const, label: 'Order Confirmed', color: '#10b981' },
]

type TrendDay = { date: string; homepage: number; step0: number; orderCreated: number; orderConfirmed: number; step0Pct: number; orderCreatedPct: number; orderConfirmedPct: number }

function TrendChart({ days }: { days: TrendDay[] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const W = 700
  const H = 260
  const PAD = { top: 30, right: 20, bottom: 40, left: 45 }
  const cw = W - PAD.left - PAD.right
  const ch = H - PAD.top - PAD.bottom

  const allVals = days.flatMap(d => [d.step0Pct, d.orderCreatedPct, d.orderConfirmedPct])
  const maxY = Math.max(10, ...allVals) * 1.15
  const yTicks = [0, Math.round(maxY / 2), Math.ceil(maxY)]

  function x(i: number) { return PAD.left + (days.length > 1 ? (i / (days.length - 1)) * cw : cw / 2) }
  function y(v: number) { return PAD.top + ch - (v / (maxY || 1)) * ch }

  function polyline(key: 'step0Pct' | 'orderCreatedPct' | 'orderConfirmedPct') {
    return days.map((d, i) => `${x(i)},${y(d[key])}`).join(' ')
  }

  const shortDate = (d: string) => {
    const parts = d.split('-')
    return `${parseInt(parts[1])}/${parseInt(parts[2])}`
  }

  const labelInterval = Math.max(1, Math.floor(days.length / 7))

  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold">Conversion Trend (%)</h4>
        <div className="flex gap-4">
          {TREND_LINES.map(l => (
            <div key={l.key} className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-[3px] rounded-full" style={{ background: l.color }} />
              <span className="text-[11px] text-muted-foreground">{l.label}</span>
            </div>
          ))}
        </div>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        onMouseLeave={() => setHoverIdx(null)}
      >
        {yTicks.map(v => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke="#e5e7eb" strokeWidth={1} />
            <text x={PAD.left - 6} y={y(v) + 4} textAnchor="end" className="fill-muted-foreground" style={{ fontSize: 10 }}>{v}%</text>
          </g>
        ))}

        {TREND_LINES.map(l => (
          <polyline key={l.key} points={polyline(l.key)} fill="none" stroke={l.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        ))}

        {days.map((d, i) => (
          <g key={i}>
            {i % labelInterval === 0 && (
              <text x={x(i)} y={H - 6} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 10 }}>{shortDate(d.date)}</text>
            )}
            <rect
              x={x(i) - (cw / days.length / 2)}
              y={PAD.top}
              width={cw / days.length}
              height={ch}
              fill="transparent"
              onMouseEnter={() => setHoverIdx(i)}
            />
            {TREND_LINES.map((l, li) => {
              const val = d[l.key]
              const yPos = y(val)
              const offsets = [-12, -12, -12]
              const otherVals = TREND_LINES.map(ol => y(d[ol.key]))
              if (li > 0 && Math.abs(otherVals[li] - otherVals[li - 1]) < 10) {
                offsets[li] = li % 2 === 0 ? -12 : 8
              }
              return (
                <g key={l.key}>
                  <circle cx={x(i)} cy={yPos} r={hoverIdx === i ? 4 : 2} fill={l.color} />
                  <text
                    x={x(i)}
                    y={yPos + offsets[li]}
                    textAnchor="middle"
                    style={{ fontSize: 8, fontWeight: 600 }}
                    fill={l.color}
                  >
                    {val > 0 ? `${val}%` : ''}
                  </text>
                </g>
              )
            })}
          </g>
        ))}

        {hoverIdx !== null && days[hoverIdx] && (
          <g>
            <line x1={x(hoverIdx)} x2={x(hoverIdx)} y1={PAD.top} y2={PAD.top + ch} stroke="#9ca3af" strokeWidth={1} strokeDasharray="3,3" />
          </g>
        )}
      </svg>
      {hoverIdx !== null && days[hoverIdx] && (
        <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground border-t pt-2">
          <span className="font-medium text-foreground">{days[hoverIdx].date}</span>
          <span>{days[hoverIdx].homepage} homepage views</span>
          {TREND_LINES.map(l => (
            <span key={l.key} style={{ color: l.color }}>
              {l.label}: {days[hoverIdx]![l.key]}% ({days[hoverIdx]![l.countKey]} orders)
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export function AdminFunnelTab({ t, token }: { t: any; token: string }) {
  const [from, setFrom] = useState(defaultFrom)
  const [to, setTo] = useState(defaultTo)
  const [pendingFrom, setPendingFrom] = useState(from)
  const [pendingTo, setPendingTo] = useState(to)
  const [data, setData] = useState<FunnelData | null>(null)
  const [trend, setTrend] = useState<TrendData | null>(null)
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
      const [result, trendResult] = await Promise.all([
        adminGetFunnel(token, f, toDate, themeFilter || undefined),
        adminGetFunnelTrend(token, f, toDate, themeFilter || undefined),
      ])
      setData(result)
      setTrend(trendResult)
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

      {!loading && trend && trend.days.length > 1 && (
        <TrendChart days={trend.days} />
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
