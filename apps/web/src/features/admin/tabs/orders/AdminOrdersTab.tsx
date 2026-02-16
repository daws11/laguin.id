import { useEffect, useMemo, useState } from 'react'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { OrderDetail, OrderListItem } from '@/features/admin/types'
import { adminGetThemes, type ThemeItem } from '@/features/admin/api'
import {
  Search,
  RotateCcw,
  Mail,
  MessageCircle,
  Eye,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Music,
  ExternalLink,
  X,
  Activity,
  FileText,
  Terminal,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

function statusColor(status: string) {
  const s = (status ?? '').toLowerCase()
  if (s === 'completed' || s === 'delivered' || s === 'paid')
    return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (s === 'processing' || s === 'delivery_scheduled')
    return 'bg-amber-50 text-amber-700 border-amber-200'
  if (s === 'created' || s === 'free' || s === 'pending' || s === 'delivery_pending')
    return 'bg-slate-50 text-slate-600 border-slate-200'
  if (s === 'failed' || s === 'delivery_failed')
    return 'bg-red-50 text-red-700 border-red-200'
  return 'bg-slate-50 text-slate-600 border-slate-200'
}

function StatusBadge({ value }: { value: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border capitalize',
        statusColor(value)
      )}
    >
      {value.replace(/_/g, ' ')}
    </span>
  )
}

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  const s = (status ?? '').toLowerCase()
  if (s.includes('fail') || s.includes('error')) return 'destructive'
  if (s.includes('pending')) return 'outline'
  if (s.includes('success') || s.includes('paid') || s.includes('delivered')) return 'default'
  if (s.includes('completed')) return 'secondary'
  return 'secondary'
}

type SortField = 'createdAt' | 'status' | 'customer'
type SortDir = 'asc' | 'desc'

export function AdminOrdersTab({
  t,
  token,
  orders,
  selectedOrder,
  onSelectOrder,
  onOpenOrder,
  onRetryOrder,
  onResendEmail,
  onResendWhatsApp,
  loading,
}: {
  t: any
  token: string
  orders: OrderListItem[]
  selectedOrder: OrderDetail | null
  onSelectOrder: (o: OrderDetail | null) => void
  onOpenOrder: (id: string) => void
  onRetryOrder: (id: string) => void
  onResendEmail: (id: string) => void
  onResendWhatsApp: (id: string) => void
  loading: boolean
}) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [themeFilter, setThemeFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [themes, setThemes] = useState<ThemeItem[]>([])

  useEffect(() => {
    adminGetThemes(token).then(setThemes).catch(() => {})
  }, [token])

  const filtered = useMemo(() => {
    let result = orders
    const q = query.trim().toLowerCase()
    if (q) {
      result = result.filter((o) => {
        const hay = `${o.id} ${o.customer?.name ?? ''} ${o.customer?.whatsappNumber ?? ''}`.toLowerCase()
        return hay.includes(q)
      })
    }
    if (statusFilter !== 'all') {
      result = result.filter((o) => o.status === statusFilter)
    }
    if (themeFilter !== 'all') {
      result = result.filter((o) => (o.themeSlug ?? '') === themeFilter)
    }
    const sorted = [...result].sort((a, b) => {
      let cmp = 0
      if (sortField === 'createdAt') {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      } else if (sortField === 'status') {
        cmp = a.status.localeCompare(b.status)
      } else if (sortField === 'customer') {
        cmp = (a.customer?.name ?? '').localeCompare(b.customer?.name ?? '')
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return sorted
  }, [orders, query, statusFilter, themeFilter, sortField, sortDir])

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ChevronDown className="h-3 w-3 opacity-30" />
    return sortDir === 'asc' ? (
      <ChevronUp className="h-3 w-3" />
    ) : (
      <ChevronDown className="h-3 w-3" />
    )
  }

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: orders.length }
    orders.forEach((o) => {
      counts[o.status] = (counts[o.status] || 0) + 1
    })
    return counts
  }, [orders])

  if (selectedOrder) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="outline" size="sm" onClick={() => onSelectOrder(null)} className="gap-2">
            <X className="h-3.5 w-3.5" /> {t.backToOrders ?? 'Back to Orders'}
          </Button>
          <span className="text-sm text-muted-foreground font-mono">{selectedOrder.id}</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex items-start justify-between pb-4 border-b shrink-0">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold tracking-tight">
                  {t.orderDetailsTitle ?? 'Order Details'}
                </h2>
                <Badge variant={statusVariant(selectedOrder.status)} className="uppercase">
                  {selectedOrder.status}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                <span>{selectedOrder.id}</span>
                <span>&bull;</span>
                <span>{new Date(selectedOrder.createdAt).toLocaleString()}</span>
                {selectedOrder.customer && (
                  <>
                    <span>&bull;</span>
                    <span>{selectedOrder.customer.name}</span>
                    <span>({selectedOrder.customer.whatsappNumber})</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onRetryOrder(selectedOrder.id)}
                disabled={loading}
                className="gap-2"
              >
                <RotateCcw className="h-3.5 w-3.5" /> {t.retryCreation}
              </Button>
            </div>
          </div>

          <div className="py-4">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="overview" className="gap-2">
                  <Activity className="h-3.5 w-3.5" /> {t.overview}
                </TabsTrigger>
                <TabsTrigger value="userInput" className="gap-2">
                  <FileText className="h-3.5 w-3.5" /> {t.userInput}
                </TabsTrigger>
                <TabsTrigger value="deliveryDebug" className="gap-2">
                  <Terminal className="h-3.5 w-3.5" /> {t.deliveryDebug}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Card className="shadow-sm">
                    <CardHeader className="p-3 pb-1">
                      <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                        {t.deliveryStatus ?? 'Delivery Status'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-semibold capitalize">
                          {selectedOrder.deliveryStatus.replace('_', ' ')}
                        </span>
                        <div
                          className={cn(
                            'h-2.5 w-2.5 rounded-full',
                            selectedOrder.deliveryStatus === 'delivered'
                              ? 'bg-green-500'
                              : 'bg-amber-500'
                          )}
                        />
                      </div>
                      {selectedOrder.deliveryStatus === 'delivery_pending' && (
                        <div className="grid grid-cols-2 gap-2 mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={loading}
                            onClick={() => onResendEmail(selectedOrder.id)}
                            className="h-8 text-xs gap-2"
                          >
                            <Mail className="h-3 w-3" /> {t.resendEmailShort ?? 'Resend Email'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={loading}
                            onClick={() => onResendWhatsApp(selectedOrder.id)}
                            className="h-8 text-xs gap-2"
                          >
                            <MessageCircle className="h-3 w-3" />{' '}
                            {t.resendWhatsAppShort ?? 'Resend WA'}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="shadow-sm">
                    <CardHeader className="p-3 pb-1">
                      <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                        {t.generatedTrack ?? 'Generated Track'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-1">
                      {(() => {
                        const meta = selectedOrder.trackMetadata as any
                        const tracks = Array.isArray(meta?.tracks)
                          ? (meta.tracks as string[]).filter(Boolean)
                          : []
                        const links = tracks.length
                          ? tracks
                          : selectedOrder.trackUrl
                            ? [selectedOrder.trackUrl]
                            : []

                        if (!links.length)
                          return (
                            <span className="text-sm text-muted-foreground italic">
                              {t.noTrackYet ?? 'No track generated yet'}
                            </span>
                          )

                        return (
                          <div className="space-y-1">
                            {links.map((url: string, idx: number) => (
                              <a
                                key={idx}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 text-sm font-medium text-primary hover:underline p-1.5 rounded-md hover:bg-primary/5 transition-colors"
                              >
                                <Music className="h-3.5 w-3.5" />
                                {links.length > 1 ? `${t.songLink} ${idx + 1}` : t.songLink}
                              </a>
                            ))}
                          </div>
                        )
                      })()}
                    </CardContent>
                  </Card>
                </div>

                {selectedOrder.errorMessage && (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 flex items-start gap-3 text-sm text-destructive">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Error:</span> {selectedOrder.errorMessage}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">{t.activityLog ?? 'Activity Log'}</h3>
                  <div className="rounded-xl border bg-card p-0 overflow-hidden text-sm">
                    <div className="max-h-[300px] overflow-y-auto divide-y">
                      {(selectedOrder.events ?? []).map((ev: any) => (
                        <div
                          key={ev.id}
                          className="p-3 flex gap-3 hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex flex-col items-center gap-1 min-w-[60px] text-[10px] text-muted-foreground font-mono pt-0.5">
                            <span>
                              {new Date(ev.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            <span>
                              {new Date(ev.createdAt).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                          <div className="flex-1 space-y-0.5">
                            <div className="font-medium text-foreground">{ev.type}</div>
                            {ev.message && (
                              <div className="text-muted-foreground text-xs">{ev.message}</div>
                            )}
                          </div>
                        </div>
                      ))}
                      {(selectedOrder.events ?? []).length === 0 && (
                        <div className="p-4 text-center text-muted-foreground text-xs">
                          {t.noEventsRecorded ?? 'No events recorded.'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="userInput" className="space-y-4">
                {selectedOrder.inputPayload ? (
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          {t.recipientName}
                        </label>
                        <div className="p-2.5 bg-muted/30 rounded-lg text-sm font-medium border">
                          {selectedOrder.inputPayload.recipientName}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          {t.yourName}
                        </label>
                        <div className="p-2.5 bg-muted/30 rounded-lg text-sm border text-muted-foreground">
                          {selectedOrder.inputPayload.yourName || '-'}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          {t.occasion}
                        </label>
                        <div className="p-2.5 bg-muted/30 rounded-lg text-sm border">
                          {selectedOrder.inputPayload.occasion}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          {t.story}
                        </label>
                        <div className="p-2.5 bg-muted/30 rounded-lg text-sm border whitespace-pre-wrap min-h-[120px] leading-relaxed">
                          {selectedOrder.inputPayload.story}
                        </div>
                      </div>
                    </div>
                    {selectedOrder.inputPayload.musicPreferences && (
                      <div className="sm:col-span-2 space-y-3 pt-2 border-t">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
                          {t.musicPreferences}
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {Object.entries(
                            selectedOrder.inputPayload.musicPreferences as Record<string, unknown>
                          ).map(([key, val]) =>
                            val ? (
                              <div key={key} className="space-y-1">
                                <span className="text-[10px] font-medium text-muted-foreground uppercase">
                                  {key}
                                </span>
                                <div className="text-sm font-medium capitalize border-b border-dashed pb-1">
                                  {String(val)}
                                </div>
                              </div>
                            ) : null
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    {t.noInputData ?? 'No input data found.'}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="deliveryDebug" className="space-y-4">
                <div className="rounded-xl border bg-muted/10 p-4 space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                      <Terminal className="h-3 w-3" /> Technical Metadata
                    </h4>
                    <div className="grid gap-2">
                      <div className="flex justify-between py-1 border-b border-dashed">
                        <span className="text-xs text-muted-foreground">Task ID</span>
                        <span className="text-xs font-mono select-all">
                          {(selectedOrder.trackMetadata as any)?.taskId ?? '-'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-dashed">
                        <span className="text-xs text-muted-foreground">Model</span>
                        <span className="text-xs font-mono">
                          {(selectedOrder.trackMetadata as any)?.model ?? '-'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider">
                      Generated Lyrics Prompt
                    </h4>
                    <pre className="text-[10px] bg-black/5 p-3 rounded-lg whitespace-pre-wrap font-mono border">
                      {selectedOrder.lyricsText ?? '-'}
                    </pre>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider">
                      Full Metadata JSON
                    </h4>
                    <pre className="text-[9px] bg-black/80 text-green-400 p-3 rounded-lg overflow-x-auto font-mono">
                      {JSON.stringify(selectedOrder.trackMetadata, null, 2)}
                    </pre>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t.orders}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {filtered.length} of {orders.length} orders
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchPlaceholder ?? 'Search by name, ID, or phone...'}
            className="pl-9 h-9"
          />
        </div>

        <div className="flex gap-1.5">
          {['all', 'created', 'processing', 'completed', 'failed'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors border',
                statusFilter === s
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:bg-muted'
              )}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              <span className="ml-1.5 opacity-70">({statusCounts[s] ?? 0})</span>
            </button>
          ))}
        </div>

        <select
          value={themeFilter}
          onChange={(e) => setThemeFilter(e.target.value)}
          className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500/40"
        >
          <option value="all">{t.allThemes ?? 'All Themes'}</option>
          {themes.map((th) => (
            <option key={th.slug} value={th.slug}>{th.name}</option>
          ))}
        </select>
      </div>

      <div className="flex-1 min-h-0 border rounded-lg overflow-hidden bg-card">
        <div className="overflow-auto h-full">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 sticky top-0 z-10">
              <tr className="border-b">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  ID
                </th>
                <th
                  className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider cursor-pointer select-none"
                  onClick={() => toggleSort('customer')}
                >
                  <span className="inline-flex items-center gap-1">
                    Customer <SortIcon field="customer" />
                  </span>
                </th>
                <th
                  className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider cursor-pointer select-none"
                  onClick={() => toggleSort('createdAt')}
                >
                  <span className="inline-flex items-center gap-1">
                    Date <SortIcon field="createdAt" />
                  </span>
                </th>
                <th
                  className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider cursor-pointer select-none"
                  onClick={() => toggleSort('status')}
                >
                  <span className="inline-flex items-center gap-1">
                    Status <SortIcon field="status" />
                  </span>
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Theme
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Delivery
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Payment
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Track
                </th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((o) => (
                <tr
                  key={o.id}
                  className="hover:bg-muted/30 transition-colors group"
                >
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-muted-foreground">
                      {o.id.slice(0, 8)}...
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{o.customer?.name ?? '-'}</div>
                    <div className="text-xs text-muted-foreground">
                      {o.customer?.whatsappNumber ?? '-'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {new Date(o.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge value={o.status} />
                    {o.errorMessage && (
                      <div className="mt-1">
                        <span className="inline-flex items-center gap-1 text-[10px] text-red-600">
                          <AlertTriangle className="h-3 w-3" /> Error
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {o.themeSlug ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border bg-purple-50 text-purple-700 border-purple-200">
                        {o.themeSlug}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">--</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge value={o.deliveryStatus} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge value={o.paymentStatus} />
                  </td>
                  <td className="px-4 py-3">
                    {o.trackUrl ? (
                      <a
                        href={o.trackUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Music className="h-3 w-3" />
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">--</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="View details"
                        onClick={() => onOpenOrder(o.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title={t.retryCreation}
                        onClick={() => onRetryOrder(o.id)}
                        disabled={loading}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title={t.resendEmail}
                        onClick={() => onResendEmail(o.id)}
                        disabled={loading}
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title={t.resendWhatsApp}
                        onClick={() => onResendWhatsApp(o.id)}
                        disabled={loading}
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                    {t.noOrdersFound ?? 'No orders found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
