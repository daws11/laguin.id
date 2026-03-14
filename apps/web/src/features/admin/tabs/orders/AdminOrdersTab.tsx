import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { OrderDetail, OrderListItem } from '@/features/admin/types'
import { adminGetOrders, adminGetThemes, adminUpdateOrderInput, type ThemeItem } from '@/features/admin/api'
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
  Copy,
  X,
  Activity,
  FileText,
  Terminal,
  Trash2,
  Sparkles,
  Pencil,
  Save,
  CheckCircle2,
  HardDrive,
  Cloud,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

function EditableUserInput({ inputPayload, token, orderId, t, onSaved }: {
  inputPayload: any
  token: string
  orderId: string
  t: any
  onSaved: (updatedOrder: any) => void
}) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [draft, setDraft] = useState({
    recipientName: inputPayload.recipientName ?? '',
    yourName: inputPayload.yourName ?? '',
    occasion: inputPayload.occasion ?? '',
    story: inputPayload.story ?? '',
    musicPreferences: { ...(inputPayload.musicPreferences ?? {}) } as Record<string, string>,
  })

  useEffect(() => {
    setDraft({
      recipientName: inputPayload.recipientName ?? '',
      yourName: inputPayload.yourName ?? '',
      occasion: inputPayload.occasion ?? '',
      story: inputPayload.story ?? '',
      musicPreferences: { ...(inputPayload.musicPreferences ?? {}) },
    })
    setEditing(false)
  }, [inputPayload])

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const payload: Record<string, unknown> = {}
      if (draft.recipientName !== (inputPayload.recipientName ?? '')) payload.recipientName = draft.recipientName
      if (draft.yourName !== (inputPayload.yourName ?? '')) payload.yourName = draft.yourName
      if (draft.occasion !== (inputPayload.occasion ?? '')) payload.occasion = draft.occasion
      if (draft.story !== (inputPayload.story ?? '')) payload.story = draft.story

      const origPrefs = inputPayload.musicPreferences ?? {}
      const prefsChanged = Object.keys(draft.musicPreferences).some(k => draft.musicPreferences[k] !== (origPrefs[k] ?? ''))
      if (prefsChanged) payload.musicPreferences = draft.musicPreferences

      if (Object.keys(payload).length === 0) { setEditing(false); setSaving(false); return }

      const updated = await adminUpdateOrderInput(token, orderId, payload)
      onSaved(updated)
      setEditing(false)
    } catch (e: any) {
      setSaveError(e?.message ?? 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const resetDraft = () => {
    setDraft({
      recipientName: inputPayload.recipientName ?? '',
      yourName: inputPayload.yourName ?? '',
      occasion: inputPayload.occasion ?? '',
      story: inputPayload.story ?? '',
      musicPreferences: { ...(inputPayload.musicPreferences ?? {}) },
    })
    setEditing(false)
  }

  const standardPrefKeys = ['genre', 'mood', 'vibe', 'tempo', 'voiceStyle', 'language']
  const existingKeys = Object.keys(inputPayload.musicPreferences ?? {})
  const musicPrefKeys = [...new Set([...standardPrefKeys, ...existingKeys])].filter(k => editing || (inputPayload.musicPreferences ?? {})[k])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span />
        {!editing ? (
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => { setEditing(true); setSaveError(null) }}>
            <Pencil className="h-3 w-3" /> Edit
          </Button>
        ) : (
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={resetDraft} disabled={saving}>
              Cancel
            </Button>
            <Button variant="default" size="sm" className="h-7 gap-1 text-xs" onClick={handleSave} disabled={saving}>
              <Save className="h-3 w-3" /> {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        )}
      </div>
      {saveError && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-1.5">{saveError}</div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t.recipientName}</label>
            {editing ? (
              <Input value={draft.recipientName} onChange={e => setDraft(d => ({ ...d, recipientName: e.target.value }))} className="text-sm" disabled={saving} />
            ) : (
              <div className="p-2.5 bg-muted/30 rounded-lg text-sm font-medium border">{inputPayload.recipientName}</div>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t.yourName}</label>
            {editing ? (
              <Input value={draft.yourName} onChange={e => setDraft(d => ({ ...d, yourName: e.target.value }))} className="text-sm" disabled={saving} />
            ) : (
              <div className="p-2.5 bg-muted/30 rounded-lg text-sm border text-muted-foreground">{inputPayload.yourName || '-'}</div>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t.occasion}</label>
            {editing ? (
              <Input value={draft.occasion} onChange={e => setDraft(d => ({ ...d, occasion: e.target.value }))} className="text-sm" disabled={saving} />
            ) : (
              <div className="p-2.5 bg-muted/30 rounded-lg text-sm border">{inputPayload.occasion}</div>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t.story}</label>
          {editing ? (
            <Textarea value={draft.story} onChange={e => setDraft(d => ({ ...d, story: e.target.value }))} className="text-sm min-h-[180px] leading-relaxed" disabled={saving} />
          ) : (
            <div className="p-2.5 bg-muted/30 rounded-lg text-sm border whitespace-pre-wrap min-h-[180px] leading-relaxed">{inputPayload.story}</div>
          )}
        </div>

        {musicPrefKeys.length > 0 && (
          <div className="sm:col-span-2 space-y-3 pt-2 border-t">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary">{t.musicPreferences}</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {musicPrefKeys.map(key => (
                <div key={key} className="space-y-1">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase">{key}</span>
                  {editing ? (
                    <Input
                      value={draft.musicPreferences[key] ?? ''}
                      onChange={e => setDraft(d => ({ ...d, musicPreferences: { ...d.musicPreferences, [key]: e.target.value } }))}
                      className="text-sm h-8 capitalize"
                      disabled={saving}
                    />
                  ) : (
                    <div className="text-sm font-medium capitalize border-b border-dashed pb-1">{String(inputPayload.musicPreferences[key])}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

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

type SortField = 'createdAt' | 'status' | 'customer' | 'deliveryStatus'
type SortDir = 'asc' | 'desc'

export function AdminOrdersTab({
  t,
  token,
  selectedOrder,
  onSelectOrder,
  onOpenOrder,
  onRetryOrder,
  onResendEmail,
  onResendWhatsApp,
  onMarkDelivered,
  onBulkDelete,
  onBulkClearTracks,
  onBulkResendWhatsApp,
  loading,
  refreshTrigger,
}: {
  t: any
  token: string
  selectedOrder: OrderDetail | null
  onSelectOrder: (o: OrderDetail | null) => void
  onOpenOrder: (id: string) => void
  onRetryOrder: (id: string) => void
  onResendEmail: (id: string) => void
  onResendWhatsApp: (id: string) => void
  onMarkDelivered: (id: string) => void
  onBulkDelete: (ids: string[]) => Promise<void>
  onBulkClearTracks: (ids: string[]) => Promise<void>
  onBulkResendWhatsApp: (ids: string[]) => Promise<void>
  loading: boolean
  refreshTrigger?: number
}) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [deliveryFilter, setDeliveryFilter] = useState<string>('all')
  const [themeFilter, setThemeFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [themes, setThemes] = useState<ThemeItem[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showDeliverConfirm, setShowDeliverConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showClearTracksConfirm, setShowClearTracksConfirm] = useState(false)
  const [clearingTracks, setClearingTracks] = useState(false)
  const [showBulkWAConfirm, setShowBulkWAConfirm] = useState(false)
  const [sendingBulkWA, setSendingBulkWA] = useState(false)
  const [showResendWAConfirm, setShowResendWAConfirm] = useState(false)
  const [sendingResendWA, setSendingResendWA] = useState(false)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 100

  // Server-side data state
  const [orders, setOrders] = useState<OrderListItem[]>([])
  const [total, setTotal] = useState(0)
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({ all: 0 })
  const [fetchLoading, setFetchLoading] = useState(false)
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    adminGetThemes(token).then(setThemes).catch(() => {})
  }, [token])

  // Debounce search input
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      setDebouncedQuery(query)
      setPage(1)
    }, 350)
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current) }
  }, [query])

  // Reset page when non-search filters change
  useEffect(() => { setPage(1) }, [statusFilter, deliveryFilter, themeFilter, sortField, sortDir])

  // Fetch orders from server whenever params change
  useEffect(() => {
    if (!token) return
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('pageSize', String(PAGE_SIZE))
    if (debouncedQuery.trim()) params.set('search', debouncedQuery.trim())
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (deliveryFilter !== 'all') params.set('deliveryStatus', deliveryFilter)
    if (themeFilter !== 'all') params.set('themeSlug', themeFilter)
    params.set('sortField', sortField)
    params.set('sortDir', sortDir)

    setFetchLoading(true)
    adminGetOrders(token, params)
      .then((res) => {
        setOrders(res.orders)
        setTotal(res.total)
        setStatusCounts(res.statusCounts)
      })
      .catch(() => {})
      .finally(() => setFetchLoading(false))
  }, [token, page, debouncedQuery, statusFilter, deliveryFilter, themeFilter, sortField, sortDir, refreshTrigger])

  // Derived pagination
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paged = orders

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
                {(selectedOrder.inputPayload?.recipientName || selectedOrder.customer) && (
                  <>
                    <span>&bull;</span>
                    <span>{selectedOrder.inputPayload?.recipientName ?? selectedOrder.customer?.name}</span>
                    {selectedOrder.customer?.whatsappNumber && (
                      <span>({selectedOrder.customer.whatsappNumber})</span>
                    )}
                  </>
                )}
              </div>
              {selectedOrder.xenditInvoiceUrl && (
                <div className="flex items-center gap-2 mt-1 text-xs">
                  <span className="text-muted-foreground">Payment Link:</span>
                  <a
                    href={selectedOrder.xenditInvoiceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline truncate max-w-[300px] inline-flex items-center gap-1"
                  >
                    {selectedOrder.xenditInvoiceUrl}
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    title="Copy payment link"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedOrder.xenditInvoiceUrl)
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {selectedOrder.deliveryStatus !== 'delivered' && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShowDeliverConfirm(true)}
                  disabled={loading}
                  className="gap-2"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Mark Delivered
                </Button>
              )}
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

          {showDeliverConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowDeliverConfirm(false)}>
              <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4 space-y-4" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-semibold">Mark as Delivered</h3>
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to mark this order as manually delivered? This will update the delivery status to "delivered".
                </p>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowDeliverConfirm(false)} disabled={loading}>
                    Cancel
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    disabled={loading}
                    onClick={() => {
                      setShowDeliverConfirm(false)
                      onMarkDelivered(selectedOrder.id)
                    }}
                    className="gap-2"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Confirm
                  </Button>
                </div>
              </div>
            </div>
          )}

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
                          {selectedOrder.deliveryStatus.replace(/_/g, ' ')}
                        </span>
                        <div
                          className={cn(
                            'h-2.5 w-2.5 rounded-full',
                            selectedOrder.deliveryStatus === 'delivered'
                              ? 'bg-green-500'
                              : selectedOrder.deliveryStatus === 'delivery_failed'
                              ? 'bg-red-500'
                              : 'bg-amber-500'
                          )}
                        />
                      </div>

                      {selectedOrder.deliveryStatus === 'delivered' && (
                        <div className="mt-3 space-y-2">
                          {selectedOrder.deliveredAt && (
                            <div className="text-xs text-muted-foreground">
                              Delivered:{' '}
                              <span className="font-medium text-foreground">
                                {new Date(selectedOrder.deliveredAt).toLocaleString()}
                              </span>
                            </div>
                          )}
                          {(() => {
                            const events: any[] = Array.isArray(selectedOrder.events) ? selectedOrder.events : []
                            const emailEvent = events.find((e: any) => e.type === 'email_song_sent')
                            const waEvent = events.find((e: any) => e.type === 'whatsapp_reminder_sent')
                            const deliveryEvent = events.find((e: any) => e.type === 'delivered')
                            
                            return (
                              <div className="flex flex-col gap-1 text-xs">
                                {emailEvent && emailEvent.createdAt && (
                                  <div className="flex items-center gap-2 text-green-600">
                                    <Mail className="h-3 w-3 flex-shrink-0" />
                                    <span>Email sent: {new Date(emailEvent.createdAt).toLocaleString()}</span>
                                  </div>
                                )}
                                {waEvent && waEvent.createdAt && (
                                  <div className="flex items-center gap-2 text-green-600">
                                    <MessageCircle className="h-3 w-3 flex-shrink-0" />
                                    <span>WhatsApp template: {new Date(waEvent.createdAt).toLocaleString()}</span>
                                  </div>
                                )}
                                {deliveryEvent && deliveryEvent.createdAt && (
                                  <div className="flex items-center gap-2 text-green-600">
                                    <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                                    <span>Marked delivered: {new Date(deliveryEvent.createdAt).toLocaleString()}</span>
                                  </div>
                                )}
                              </div>
                            )
                          })()}
                        </div>
                      )}

                      {selectedOrder.deliveryStatus === 'delivery_scheduled' && (
                        <div className="mt-2 space-y-1.5">
                          {selectedOrder.deliveryScheduledAt && (
                            <div className="text-xs text-muted-foreground">
                              Scheduled:{' '}
                              <span className="font-medium text-foreground">
                                {new Date(selectedOrder.deliveryScheduledAt).toLocaleString()}
                              </span>
                            </div>
                          )}
                          {(() => {
                            const events: any[] = Array.isArray(selectedOrder.events) ? selectedOrder.events : []
                            const waSent = events.some((e: any) => e.type === 'whatsapp_reminder_sent')
                            const emailSent = events.some((e: any) => e.type === 'email_song_sent')
                            return (
                              <div className="flex flex-col gap-0.5">
                                <div className={cn('text-xs flex items-center gap-1', waSent ? 'text-green-600' : 'text-muted-foreground')}>
                                  <MessageCircle className="h-3 w-3" />
                                  WhatsApp template: {waSent ? 'Sent ✓' : 'Not sent yet'}
                                </div>
                                <div className={cn('text-xs flex items-center gap-1', emailSent ? 'text-green-600' : 'text-muted-foreground')}>
                                  <Mail className="h-3 w-3" />
                                  Email: {emailSent ? 'Sent ✓' : 'Not sent yet'}
                                </div>
                              </div>
                            )
                          })()}
                        </div>
                      )}
                      {(selectedOrder.deliveryStatus === 'delivery_pending' || selectedOrder.deliveryStatus === 'delivery_scheduled') && (
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
                            onClick={() => setShowResendWAConfirm(true)}
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
                        const kieTracks = Array.isArray(meta?.tracks)
                          ? (meta.tracks as string[]).filter(Boolean)
                          : selectedOrder.trackUrl
                            ? [selectedOrder.trackUrl]
                            : []
                        const storedTracks: string[] = Array.isArray(meta?.storedTracks)
                          ? (meta.storedTracks as string[]).filter(Boolean)
                          : []

                        if (!kieTracks.length && !storedTracks.length)
                          return (
                            <span className="text-sm text-muted-foreground italic">
                              {t.noTrackYet ?? 'No track generated yet'}
                            </span>
                          )

                        return (
                          <div className="space-y-3">
                            {kieTracks.length > 0 && (
                              <div>
                                <div className="flex items-center gap-1.5 mb-1">
                                  <Cloud className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-[11px] font-medium text-muted-foreground uppercase">Kie.ai</span>
                                </div>
                                <div className="space-y-1">
                                  {kieTracks.map((url: string, idx: number) => (
                                    <a
                                      key={idx}
                                      href={url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex items-center gap-2 text-sm font-medium text-primary hover:underline p-1.5 rounded-md hover:bg-primary/5 transition-colors"
                                    >
                                      <Music className="h-3.5 w-3.5" />
                                      {kieTracks.length > 1 ? `${t.songLink ?? 'Song Link'} ${idx + 1}` : t.songLink ?? 'Song Link'}
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                            {storedTracks.length > 0 && (
                              <div>
                                <div className="flex items-center gap-1.5 mb-1">
                                  <HardDrive className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-[11px] font-medium text-muted-foreground uppercase">Stored Backup</span>
                                </div>
                                <div className="space-y-1">
                                  {storedTracks.map((url: string, idx: number) => (
                                    <a
                                      key={idx}
                                      href={url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex items-center gap-2 text-sm font-medium text-emerald-700 hover:underline p-1.5 rounded-md hover:bg-emerald-50 transition-colors"
                                    >
                                      <Music className="h-3.5 w-3.5" />
                                      {storedTracks.length > 1 ? `Backup ${idx + 1}` : 'Backup'}
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                            {kieTracks.length > 0 && !storedTracks.length && (
                              <p className="text-[11px] text-muted-foreground italic">No backup stored yet</p>
                            )}
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

                {(() => {
                  const upsellItems = selectedOrder.upsellItems
                  if (!Array.isArray(upsellItems) || upsellItems.length === 0) return null
                  const fmtIDR = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
                  return (
                    <Card className="shadow-sm">
                      <CardHeader className="p-3 pb-1">
                        <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                          Accepted Upsells
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 pt-1">
                        <div className="space-y-1.5">
                          {upsellItems.map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                              <span>
                                {item.icon ? `${item.icon} ` : ''}<span className="font-medium">{item.title}</span>
                              </span>
                              <span className="font-semibold text-emerald-700">{fmtIDR(item.price ?? 0)}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })()}

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">{t.activityLog ?? 'Activity Log'}</h3>

                  {/* Current status banner */}
                  {(() => {
                    const events = selectedOrder.events ?? []
                    const latestType = events[0]?.type
                    const statusMap: Record<string, { label: string; color: string; pulse?: boolean }> = {
                      lyrics_generated: { label: 'Generating mood description...', color: 'blue', pulse: true },
                      mood_generated: { label: 'Submitting music generation task...', color: 'blue', pulse: true },
                      music_task_submitted: { label: 'Song is being generated by AI...', color: 'amber', pulse: true },
                      music_task_polled: { label: 'Song is being generated by AI...', color: 'amber', pulse: true },
                      music_callback_received: { label: 'Song generated, processing...', color: 'blue', pulse: true },
                      music_generated: { label: 'Song ready! Preparing delivery...', color: 'green' },
                      tracks_stored: { label: 'Tracks stored, completing order...', color: 'blue', pulse: true },
                      generation_started: { label: 'Generating lyrics...', color: 'blue', pulse: true },
                      generation_completed: { label: 'Order completed', color: 'green' },
                      delivered: { label: 'Delivered to customer', color: 'green' },
                      generation_failed: { label: 'Generation failed', color: 'red' },
                      delivery_failed: { label: 'Delivery failed', color: 'red' },
                      music_generation_blocked: { label: 'Music generation blocked', color: 'red' },
                    }
                    const status = latestType ? statusMap[latestType] : null
                    if (!status) return null
                    const colorClasses: Record<string, string> = {
                      blue: 'bg-blue-50 border-blue-200 text-blue-700',
                      amber: 'bg-amber-50 border-amber-200 text-amber-700',
                      green: 'bg-green-50 border-green-200 text-green-700',
                      red: 'bg-red-50 border-red-200 text-red-700',
                    }
                    return (
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium ${colorClasses[status.color]}`}>
                        {status.pulse && <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-current" /></span>}
                        {status.label}
                      </div>
                    )
                  })()}

                  <div className="rounded-xl border bg-card p-0 overflow-hidden text-sm">
                    <div className="max-h-[300px] overflow-y-auto divide-y">
                      {(selectedOrder.events ?? []).map((ev: any) => {
                        const eventInfo: Record<string, { label: string; icon: string; color?: string }> = {
                          generation_started: { label: 'Generation started', icon: '🚀' },
                          lyrics_generated: { label: 'Lyrics generated', icon: '📝' },
                          mood_generated: { label: 'Mood & style description generated', icon: '🎨' },
                          music_preferences_enriched: { label: 'Music preferences enriched by AI', icon: '🎵' },
                          language_fallback: { label: 'Language set to default (Bahasa Indonesia)', icon: '🌐' },
                          music_task_submitted: { label: 'Song generation submitted to kie.ai', icon: '📤' },
                          music_task_polled: { label: 'Checking song generation status...', icon: '🔄' },
                          music_generated: { label: 'Song generated successfully', icon: '🎶', color: 'text-green-600' },
                          music_callback_received: { label: 'Song callback received from kie.ai', icon: '📥' },
                          music_generation_blocked: { label: 'Song generation blocked', icon: '🚫', color: 'text-red-600' },
                          tracks_stored: { label: 'Audio tracks stored', icon: '💾' },
                          generation_completed: { label: 'Order generation completed', icon: '✅', color: 'text-green-600' },
                          generation_failed: { label: 'Generation failed', icon: '❌', color: 'text-red-600' },
                          generation_exception: { label: 'Unexpected generation error', icon: '⚠️', color: 'text-red-600' },
                          generation_retryable_error: { label: 'Temporary error (will retry)', icon: '🔁', color: 'text-amber-600' },
                          email_song_sent: { label: 'Song link emailed to customer', icon: '📧', color: 'text-green-600' },
                          email_song_failed: { label: 'Email send failed', icon: '📧', color: 'text-red-600' },
                          delivered: { label: 'Order delivered to customer', icon: '🎉', color: 'text-green-600' },
                          delivery_failed: { label: 'Delivery failed', icon: '❌', color: 'text-red-600' },
                          delivery_retry_scheduled: { label: 'Delivery retry scheduled', icon: '🔁' },
                          delivery_exception: { label: 'Unexpected delivery error', icon: '⚠️', color: 'text-red-600' },
                          whatsapp_reminder_sent: { label: 'WhatsApp reminder sent', icon: '💬', color: 'text-green-600' },
                          whatsapp_reminder_failed: { label: 'WhatsApp reminder failed', icon: '💬', color: 'text-red-600' },
                          ycloud_send_failed: { label: 'WhatsApp send failed (YCloud)', icon: '💬', color: 'text-red-600' },
                          input_edited: { label: 'Order input edited by admin', icon: '✏️' },
                          admin_approved: { label: 'Manually approved by admin', icon: '👤' },
                          admin_retry: { label: 'Regeneration triggered by admin', icon: '🔄' },
                          admin_resend_email: { label: 'Email resent by admin', icon: '📧' },
                          admin_resend_whatsapp: { label: 'WhatsApp resent by admin', icon: '💬' },
                          admin_mark_delivered: { label: 'Marked as delivered by admin', icon: '👤', color: 'text-green-600' },
                        }
                        const info = eventInfo[ev.type] ?? { label: ev.type, icon: '📋' }
                        return (
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
                              <div className={`font-medium ${info.color ?? 'text-foreground'}`}>
                                <span className="mr-1.5">{info.icon}</span>
                                {info.label}
                              </div>
                              {ev.message && (
                                <div className="text-muted-foreground text-xs">{ev.message}</div>
                              )}
                            </div>
                          </div>
                        )
                      })}
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
                  <EditableUserInput
                    inputPayload={selectedOrder.inputPayload}
                    token={token}
                    orderId={selectedOrder.id}
                    t={t}
                    onSaved={(updatedOrder) => onSelectOrder(updatedOrder)}
                  />
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    {t.noInputData ?? 'No input data found.'}
                  </div>
                )}

                {(selectedOrder.lyricsText || selectedOrder.moodDescription || (selectedOrder.trackMetadata as any)?.prompt || (selectedOrder.trackMetadata as any)?.style) && (
                  <div className="space-y-4 pt-4 border-t">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5" />
                      {t.generatedPrompts ?? 'Generated Prompts'}
                    </h4>
                    <div className="grid gap-4">
                      {selectedOrder.lyricsText && (
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            {t.lyricsText ?? 'Generated Lyrics'}
                          </label>
                          <div className="p-3 bg-muted/30 rounded-lg text-sm border whitespace-pre-wrap max-h-[300px] overflow-y-auto font-mono leading-relaxed">
                            {selectedOrder.lyricsText}
                          </div>
                        </div>
                      )}
                      {selectedOrder.moodDescription && (
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            {t.moodDescription ?? 'Mood / Style Description'}
                          </label>
                          <div className="p-3 bg-muted/30 rounded-lg text-sm border whitespace-pre-wrap max-h-[200px] overflow-y-auto font-mono leading-relaxed">
                            {selectedOrder.moodDescription}
                          </div>
                        </div>
                      )}
                      {(selectedOrder.trackMetadata as any)?.prompt && (
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            {t.musicPrompt ?? 'Music Prompt (sent to Suno)'}
                          </label>
                          <div className="p-3 bg-muted/30 rounded-lg text-sm border whitespace-pre-wrap max-h-[200px] overflow-y-auto font-mono leading-relaxed">
                            {(selectedOrder.trackMetadata as any).prompt}
                          </div>
                        </div>
                      )}
                      {(selectedOrder.trackMetadata as any)?.style && (
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            {t.musicStyle ?? 'Style Tags'}
                          </label>
                          <div className="p-3 bg-muted/30 rounded-lg text-sm border whitespace-pre-wrap font-mono leading-relaxed">
                            {(selectedOrder.trackMetadata as any).style}
                          </div>
                        </div>
                      )}
                      {(selectedOrder.trackMetadata as any)?.title && (
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            {t.musicTitle ?? 'Song Title'}
                          </label>
                          <div className="p-3 bg-muted/30 rounded-lg text-sm border font-mono">
                            {(selectedOrder.trackMetadata as any).title}
                          </div>
                        </div>
                      )}
                    </div>
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
            {fetchLoading ? 'Loading…' : `${total} order${total !== 1 ? 's' : ''}${totalPages > 1 ? ` · Page ${safePage} of ${totalPages}` : ''}`}
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
          value={deliveryFilter}
          onChange={(e) => setDeliveryFilter(e.target.value)}
          className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500/40"
        >
          <option value="all">All Delivery</option>
          <option value="delivery_pending">Delivery Pending</option>
          <option value="delivery_scheduled">Delivery Scheduled</option>
          <option value="delivered">Delivered</option>
          <option value="delivery_failed">Delivery Failed</option>
        </select>

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

      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-3 px-4 py-2.5 rounded-lg border border-red-200 bg-red-50">
          <span className="text-sm font-medium text-red-800">
            {selected.size} order{selected.size > 1 ? 's' : ''} selected
          </span>
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setSelected(new Set())}
          >
            Deselect All
          </Button>
          {!showDeleteConfirm ? (
            <Button
              variant="destructive"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Selected
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-700 font-medium">Are you sure?</span>
              <Button
                variant="destructive"
                size="sm"
                className="h-7 text-xs"
                disabled={deleting}
                onClick={async () => {
                  setDeleting(true)
                  try {
                    await onBulkDelete(Array.from(selected))
                    setSelected(new Set())
                    setShowDeleteConfirm(false)
                  } finally {
                    setDeleting(false)
                  }
                }}
              >
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </Button>
            </div>
          )}
          {!showClearTracksConfirm ? (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => setShowClearTracksConfirm(true)}
            >
              <HardDrive className="h-3.5 w-3.5" />
              Clear Stored Tracks
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-700 font-medium">Clear backups?</span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
                disabled={clearingTracks}
                onClick={async () => {
                  setClearingTracks(true)
                  try {
                    await onBulkClearTracks(Array.from(selected))
                    setSelected(new Set())
                    setShowClearTracksConfirm(false)
                  } finally {
                    setClearingTracks(false)
                  }
                }}
              >
                {clearingTracks ? 'Clearing...' : 'Confirm Clear'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setShowClearTracksConfirm(false)}
              >
                Cancel
              </Button>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5 border-green-300 text-green-700 hover:bg-green-50"
            onClick={() => setShowBulkWAConfirm(true)}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Resend WhatsApp
          </Button>
        </div>
      )}

      <div className="flex-1 min-h-0 border rounded-lg overflow-hidden bg-card flex flex-col">
        <div className="overflow-auto flex-1 min-h-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 sticky top-0 z-10">
              <tr className="border-b">
                <th className="px-3 py-3 w-10">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                    checked={paged.length > 0 && paged.every((o) => selected.has(o.id))}
                    ref={(el) => {
                      if (el) el.indeterminate = paged.some((o) => selected.has(o.id)) && !paged.every((o) => selected.has(o.id))
                    }}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelected(new Set([...selected, ...paged.map((o) => o.id)]))
                      } else {
                        const next = new Set(selected)
                        paged.forEach((o) => next.delete(o.id))
                        setSelected(next)
                      }
                    }}
                  />
                </th>
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
                    Date &amp; Time <SortIcon field="createdAt" />
                  </span>
                </th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Price
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
                <th
                  className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider cursor-pointer select-none"
                  onClick={() => toggleSort('deliveryStatus')}
                >
                  <span className="inline-flex items-center gap-1">
                    Delivery <SortIcon field="deliveryStatus" />
                  </span>
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
              {paged.map((o) => (
                <tr
                  key={o.id}
                  className={cn(
                    'hover:bg-muted/30 transition-colors group',
                    selected.has(o.id) && 'bg-primary/5'
                  )}
                >
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                      checked={selected.has(o.id)}
                      onChange={(e) => {
                        const next = new Set(selected)
                        if (e.target.checked) next.add(o.id)
                        else next.delete(o.id)
                        setSelected(next)
                      }}
                    />
                  </td>
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
                    <div>
                      {new Date(o.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                    <div className="text-xs opacity-70">
                      {new Date(o.createdAt).toLocaleTimeString(undefined, {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {o.totalAmount != null ? (
                      o.totalAmount === 0 ? (
                        <span className="text-xs text-muted-foreground">Free</span>
                      ) : (
                        <span className="text-sm font-medium">
                          {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(o.totalAmount)}
                        </span>
                      )
                    ) : (
                      <span className="text-xs text-muted-foreground">--</span>
                    )}
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
              {paged.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
                    {t.noOrdersFound ?? 'No orders found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3 shrink-0 bg-card">
            <span className="text-sm text-muted-foreground">
              Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, total)} of {total}
            </span>
            <div className="flex gap-1">
              <button
                disabled={safePage <= 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 rounded-md text-xs font-medium border transition-colors disabled:opacity-40 hover:bg-muted"
              >
                Previous
              </button>
              <button
                disabled={safePage >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 rounded-md text-xs font-medium border transition-colors disabled:opacity-40 hover:bg-muted"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Resend WhatsApp Confirmation Modal */}
      {showResendWAConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-96 shadow-lg">
            <CardHeader className="border-b">
              <CardTitle className="text-sm font-semibold text-green-700">
                Resend WhatsApp Message
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-6">
                This will send a WhatsApp template message to the customer. Their delivery status will be marked as delivered.
              </p>
              <div className="flex gap-3">
                <Button
                  className="flex-1 border-green-400 text-green-700 hover:bg-green-50"
                  variant="outline"
                  disabled={sendingResendWA}
                  onClick={async () => {
                    setSendingResendWA(true)
                    try {
                      await onResendWhatsApp(selectedOrder.id)
                      setShowResendWAConfirm(false)
                    } finally {
                      setSendingResendWA(false)
                    }
                  }}
                >
                  {sendingResendWA ? 'Sending...' : 'Confirm Send'}
                </Button>
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={() => setShowResendWAConfirm(false)}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bulk Resend WhatsApp Confirmation Modal */}
      {showBulkWAConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-96 shadow-lg">
            <CardHeader className="border-b">
              <CardTitle className="text-sm font-semibold text-green-700">
                Resend WhatsApp Messages
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-6">
                This will send WhatsApp template messages to {selected.size} order{selected.size > 1 ? 's' : ''}. Their delivery status will be marked as delivered.
              </p>
              <div className="flex gap-3">
                <Button
                  className="flex-1 border-green-400 text-green-700 hover:bg-green-50"
                  variant="outline"
                  disabled={sendingBulkWA}
                  onClick={async () => {
                    setSendingBulkWA(true)
                    try {
                      await onBulkResendWhatsApp(Array.from(selected))
                      setSelected(new Set())
                      setShowBulkWAConfirm(false)
                    } finally {
                      setSendingBulkWA(false)
                    }
                  }}
                >
                  {sendingBulkWA ? 'Sending...' : 'Confirm Send'}
                </Button>
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={() => setShowBulkWAConfirm(false)}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
