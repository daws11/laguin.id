import { useMemo, useState } from 'react'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { OrderDetail, OrderListItem } from '@/features/admin/types'
import { Search, ShoppingBag, Truck, CreditCard, RotateCcw, Mail, MessageCircle, AlertTriangle, FileText, Activity, Terminal } from 'lucide-react'

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  const s = (status ?? '').toLowerCase()
  if (s.includes('fail') || s.includes('error')) return 'destructive'
  if (s.includes('pending')) return 'outline'
  if (s.includes('success') || s.includes('paid') || s.includes('delivered')) return 'default'
  if (s.includes('completed')) return 'secondary'
  return 'secondary'
}

export function AdminOrdersTab({
  t,
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return orders
    return orders.filter((o) => {
      const hay = `${o.id} ${o.customer?.name ?? ''} ${o.customer?.whatsappNumber ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [orders, query])

  return (
    <Card className="h-full shadow-sm md:col-span-2 lg:col-span-3 flex flex-col overflow-hidden">
      <CardHeader className="p-4 pb-2 bg-muted/5 shrink-0 border-b">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">{t.orders}</CardTitle>
            <CardDescription className="text-[10px]">{t.orderTap}</CardDescription>
          </div>
          <Badge variant="outline" className="h-6">
            {filtered.length} / {orders.length}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1 min-h-0 flex flex-col md:flex-row">
        {/* List Sidebar */}
        <aside className="w-full md:w-[350px] bg-muted/10 border-b md:border-b-0 md:border-r flex flex-col shrink-0">
           <div className="p-3 border-b bg-background/50">
             <div className="relative">
               <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
               <Input
                 value={query}
                 onChange={(e) => setQuery(e.target.value)}
                 placeholder={t.searchOrdersPlaceholder ?? 'Search...'}
                 className="h-9 pl-9 text-xs"
               />
             </div>
           </div>
           
           <div className="flex-1 overflow-y-auto p-2 space-y-1">
             {filtered.map((o) => (
               <button
                 key={o.id}
                 className={cn(
                   'w-full rounded-lg border p-3 text-left text-sm transition-all duration-200 group',
                   selectedOrder?.id === o.id 
                     ? 'bg-background border-primary shadow-sm ring-1 ring-primary/10' 
                     : 'bg-background hover:bg-muted/50 hover:border-primary/30 border-transparent shadow-sm'
                 )}
                 onClick={() => onOpenOrder(o.id)}
               >
                 <div className="flex items-center justify-between mb-1.5">
                   <div className="font-semibold text-foreground truncate flex items-center gap-2">
                     <ShoppingBag className="h-3.5 w-3.5 text-muted-foreground" />
                     {o.customer.name}
                   </div>
                   <Badge variant={statusVariant(o.status)} className="text-[9px] h-4 px-1.5 uppercase">
                     {o.status}
                   </Badge>
                 </div>
                 
                 <div className="text-[10px] text-muted-foreground font-mono mb-2 truncate">
                   {o.id}
                 </div>

                 <div className="flex flex-wrap gap-1.5">
                   <Badge variant="outline" className="text-[9px] h-4 px-1 gap-1 font-normal bg-muted/30">
                      <Truck className="h-2.5 w-2.5" /> {o.deliveryStatus}
                   </Badge>
                   <Badge variant="outline" className="text-[9px] h-4 px-1 gap-1 font-normal bg-muted/30">
                      <CreditCard className="h-2.5 w-2.5" /> {o.paymentStatus}
                   </Badge>
                   {o.errorMessage && (
                      <Badge variant="destructive" className="text-[9px] h-4 px-1 gap-1">
                        <AlertTriangle className="h-2.5 w-2.5" /> Error
                      </Badge>
                   )}
                 </div>
               </button>
             ))}
             
             {filtered.length === 0 && (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  {t.noOrdersFound ?? 'No orders found.'}
                </div>
             )}
           </div>
        </aside>

        {/* Detail Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-background">
          {selectedOrder ? (
            <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-start justify-between pb-4 border-b shrink-0">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-xl font-bold tracking-tight">{t.orderDetailsTitle ?? 'Order Details'}</h2>
                            <Badge variant={statusVariant(selectedOrder.status)} className="uppercase">{selectedOrder.status}</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                            <span>{selectedOrder.id}</span>
                            <span>•</span>
                            <span>{new Date(selectedOrder.createdAt).toLocaleString()}</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => onSelectOrder(null)} className="md:hidden">
                          {t.close ?? 'Close'}
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => onRetryOrder(selectedOrder.id)} disabled={loading} className="gap-2">
                            <RotateCcw className="h-3.5 w-3.5" /> {t.retryCreation}
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto py-4">
                    <Tabs defaultValue="overview" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 mb-4">
                            <TabsTrigger value="overview" className="gap-2"><Activity className="h-3.5 w-3.5" /> {t.overview}</TabsTrigger>
                            <TabsTrigger value="userInput" className="gap-2"><FileText className="h-3.5 w-3.5" /> {t.userInput}</TabsTrigger>
                            <TabsTrigger value="deliveryDebug" className="gap-2"><Terminal className="h-3.5 w-3.5" /> {t.deliveryDebug}</TabsTrigger>
                        </TabsList>

                        {/* --- OVERVIEW TAB --- */}
                        <TabsContent value="overview" className="space-y-6">
                            {/* Status Cards */}
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Card className="shadow-sm">
                                    <CardHeader className="p-3 pb-1">
                                        <CardTitle className="text-xs font-medium text-muted-foreground uppercase">{t.deliveryStatus ?? 'Delivery Status'}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-3 pt-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-lg font-semibold capitalize">{selectedOrder.deliveryStatus.replace('_', ' ')}</span>
                                            <div className={cn("h-2.5 w-2.5 rounded-full", selectedOrder.deliveryStatus === 'delivered' ? 'bg-green-500' : 'bg-amber-500')} />
                                        </div>
                                        {selectedOrder.deliveryStatus === 'delivery_pending' && (
                                            <div className="grid grid-cols-2 gap-2 mt-3">
                                                <Button size="sm" variant="outline" disabled={loading} onClick={() => onResendEmail(selectedOrder.id)} className="h-8 text-xs gap-2">
                                                    <Mail className="h-3 w-3" /> {t.resendEmailShort ?? 'Resend Email'}
                                                </Button>
                                                <Button size="sm" variant="outline" disabled={loading} onClick={() => onResendWhatsApp(selectedOrder.id)} className="h-8 text-xs gap-2">
                                                    <MessageCircle className="h-3 w-3" /> {t.resendWhatsAppShort ?? 'Resend WA'}
                                                </Button>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                <Card className="shadow-sm">
                                    <CardHeader className="p-3 pb-1">
                                        <CardTitle className="text-xs font-medium text-muted-foreground uppercase">{t.generatedTrack ?? 'Generated Track'}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-3 pt-1">
                                        {(() => {
                                            const meta = selectedOrder.trackMetadata as any
                                            const tracks = Array.isArray(meta?.tracks) ? (meta.tracks as string[]).filter(Boolean) : []
                                            const links = tracks.length ? tracks : selectedOrder.trackUrl ? [selectedOrder.trackUrl] : []
                                            
                                            if (!links.length) return <span className="text-sm text-muted-foreground italic">{t.noTrackYet ?? 'No track generated yet'}</span>

                                            return (
                                                <div className="space-y-1">
                                                    {links.map((url, idx) => (
                                                        <a key={idx} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm font-medium text-primary hover:underline p-1.5 rounded-md hover:bg-primary/5 transition-colors">
                                                            <ShoppingBag className="h-3.5 w-3.5" />
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

                            {/* Timeline */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold">{t.activityLog ?? 'Activity Log'}</h3>
                                <div className="rounded-xl border bg-card p-0 overflow-hidden text-sm">
                                    <div className="max-h-[300px] overflow-y-auto divide-y">
                                        {(selectedOrder.events ?? []).map((ev: any) => (
                                            <div key={ev.id} className="p-3 flex gap-3 hover:bg-muted/30 transition-colors">
                                                <div className="flex flex-col items-center gap-1 min-w-[60px] text-[10px] text-muted-foreground font-mono pt-0.5">
                                                    <span>{new Date(ev.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                    <span>{new Date(ev.createdAt).toLocaleDateString([], {month: 'short', day:'numeric'})}</span>
                                                </div>
                                                <div className="flex-1 space-y-0.5">
                                                    <div className="font-medium text-foreground">{ev.type}</div>
                                                    {ev.message && <div className="text-muted-foreground text-xs">{ev.message}</div>}
                                                </div>
                                            </div>
                                        ))}
                                        {(selectedOrder.events ?? []).length === 0 && (
                                            <div className="p-4 text-center text-muted-foreground text-xs">No events recorded.</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        {/* --- USER INPUT TAB --- */}
                        <TabsContent value="userInput" className="space-y-4">
                             {selectedOrder.inputPayload ? (
                                <div className="grid gap-6 sm:grid-cols-2">
                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t.recipientName}</label>
                                            <div className="p-2.5 bg-muted/30 rounded-lg text-sm font-medium border">{selectedOrder.inputPayload.recipientName}</div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t.yourName}</label>
                                            <div className="p-2.5 bg-muted/30 rounded-lg text-sm border text-muted-foreground">{selectedOrder.inputPayload.yourName || '-'}</div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t.occasion}</label>
                                            <div className="p-2.5 bg-muted/30 rounded-lg text-sm border">{selectedOrder.inputPayload.occasion}</div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t.story}</label>
                                            <div className="p-2.5 bg-muted/30 rounded-lg text-sm border whitespace-pre-wrap min-h-[120px] leading-relaxed">
                                                {selectedOrder.inputPayload.story}
                                            </div>
                                        </div>
                                    </div>

                                    {selectedOrder.inputPayload.musicPreferences && (
                                        <div className="sm:col-span-2 space-y-3 pt-2 border-t">
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-primary">{t.musicPreferences}</h4>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                {Object.entries(
                                                  selectedOrder.inputPayload.musicPreferences as Record<string, unknown>,
                                                ).map(([key, val]) =>
                                                  val ? (
                                                    <div key={key} className="space-y-1">
                                                      <span className="text-[10px] font-medium text-muted-foreground uppercase">{key}</span>
                                                      <div className="text-sm font-medium capitalize border-b border-dashed pb-1">
                                                        {String(val)}
                                                      </div>
                                                    </div>
                                                  ) : null,
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                             ) : (
                                <div className="text-center py-12 text-muted-foreground">No input data found.</div>
                             )}
                        </TabsContent>

                        {/* --- DEBUG TAB --- */}
                        <TabsContent value="deliveryDebug" className="space-y-4">
                            <div className="rounded-xl border bg-muted/10 p-4 space-y-4">
                                 <div className="space-y-2">
                                     <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2"><Terminal className="h-3 w-3" /> Technical Metadata</h4>
                                     <div className="grid gap-2">
                                         <div className="flex justify-between py-1 border-b border-dashed">
                                             <span className="text-xs text-muted-foreground">Task ID</span>
                                             <span className="text-xs font-mono select-all">{(selectedOrder.trackMetadata as any)?.taskId ?? '-'}</span>
                                         </div>
                                         <div className="flex justify-between py-1 border-b border-dashed">
                                             <span className="text-xs text-muted-foreground">Model</span>
                                             <span className="text-xs font-mono">{(selectedOrder.trackMetadata as any)?.model ?? '-'}</span>
                                         </div>
                                     </div>
                                 </div>

                                 <div className="space-y-2">
                                     <h4 className="text-xs font-bold uppercase tracking-wider">Generated Lyrics Prompt</h4>
                                     <pre className="text-[10px] bg-black/5 p-3 rounded-lg whitespace-pre-wrap font-mono border">
                                         {selectedOrder.lyricsText ?? '-'}
                                     </pre>
                                 </div>

                                 <div className="space-y-2">
                                     <h4 className="text-xs font-bold uppercase tracking-wider">Full Metadata JSON</h4>
                                     <pre className="text-[9px] bg-black/80 text-green-400 p-3 rounded-lg overflow-x-auto font-mono">
                                         {JSON.stringify(selectedOrder.trackMetadata, null, 2)}
                                     </pre>
                                 </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4 opacity-50">
               <ShoppingBag className="h-12 w-12" />
               <p className="text-sm">{t.selectOrder}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

