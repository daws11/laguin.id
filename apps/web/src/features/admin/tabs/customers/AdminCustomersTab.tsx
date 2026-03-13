import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { CustomerDetail, CustomerListItem } from '@/features/admin/types'
import { adminGetCustomers } from '@/features/admin/api'
import {
  Search,
  ChevronDown,
  ChevronUp,
  Eye,
  Phone,
  Package,
  Calendar,
  X,
  Trash2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function kindColor(kind: string) {
  if (kind === 'draft') return 'bg-sky-50 text-sky-700 border-sky-200'
  return 'bg-emerald-50 text-emerald-700 border-emerald-200'
}

function statusColor(status: string) {
  const s = (status ?? '').toLowerCase()
  if (s === 'completed' || s === 'delivered' || s === 'paid')
    return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (s === 'processing' || s === 'delivery_scheduled')
    return 'bg-amber-50 text-amber-700 border-amber-200'
  if (s === 'created' || s === 'free' || s === 'pending' || s === 'delivery_pending' || s === 'draft')
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

type SortField = 'createdAt' | 'name' | 'kind'
type SortDir = 'asc' | 'desc'

const PAGE_SIZE = 100

export function AdminCustomersTab({
  t,
  token,
  selectedCustomer,
  onSelectCustomer,
  onOpenCustomer,
  onOpenOrder,
  onBulkDelete,
  loading: _loading,
  refreshTrigger = 0,
}: {
  t: any
  token: string
  selectedCustomer: (CustomerDetail | any) | null
  onSelectCustomer: (c: (CustomerDetail | any) | null) => void
  onOpenCustomer: (id: string) => void
  onOpenOrder: (id: string) => void
  onBulkDelete: (ids: string[]) => Promise<void>
  loading?: boolean
  refreshTrigger?: number
}) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [kindFilter, setKindFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [page, setPage] = useState(1)

  // Server-fetched state
  const [customers, setCustomers] = useState<CustomerListItem[]>([])
  const [total, setTotal] = useState(0)
  const [fetchLoading, setFetchLoading] = useState(false)

  // Debounce search
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query)
      setPage(1)
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  useEffect(() => { setPage(1) }, [kindFilter, sortField, sortDir])

  // Fetch from server
  useEffect(() => {
    if (!token) return
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('pageSize', String(PAGE_SIZE))
    if (debouncedQuery) params.set('search', debouncedQuery)
    if (kindFilter !== 'all') params.set('kind', kindFilter)
    params.set('sortField', sortField)
    params.set('sortDir', sortDir)

    setFetchLoading(true)
    adminGetCustomers(token, params)
      .then((res) => {
        setCustomers(res.items.map((c: any) => ({ kind: c?.kind ?? 'customer', ...c })))
        setTotal(res.total)
      })
      .catch(() => {})
      .finally(() => setFetchLoading(false))
  }, [token, page, debouncedQuery, kindFilter, sortField, sortDir, refreshTrigger])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)

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

  const stepLabel = (step: number | null | undefined) => {
    const s = typeof step === 'number' && Number.isFinite(step) ? step : 0
    if (s === 0) return t.step0 ?? 'Step 0'
    if (s === 1) return t.step1 ?? 'Step 1'
    if (s === 2) return t.step2 ?? 'Step 2'
    if (s === 3) return t.step3 ?? 'Step 3'
    if (s === 4) return t.step4 ?? 'Step 4'
    return `${t.step ?? 'Step'} ${s}`
  }

  if (selectedCustomer) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="outline" size="sm" onClick={() => onSelectCustomer(null)} className="gap-2">
            <X className="h-3.5 w-3.5" /> {t.backToCustomers ?? 'Back to Customers'}
          </Button>
          <span className="text-sm text-muted-foreground font-mono">
            {(selectedCustomer as any)?.kind === 'draft' ? (selectedCustomer as any).id : selectedCustomer.id}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {(selectedCustomer as any)?.kind === 'draft' ? (
            <div className="space-y-4 max-w-2xl">
              <div className="flex items-center justify-between pb-4 border-b">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">
                    {(selectedCustomer as any).name ?? (t.draftRegistration ?? 'Draft registration')}
                  </h2>
                  <div className="text-xs text-muted-foreground">
                    {t.stoppedAt ?? 'Stopped at'}:{' '}
                    <span className="font-medium text-foreground">{stepLabel((selectedCustomer as any).step)}</span>{' '}
                    ({(t.step ?? 'Step').toLowerCase()} {(selectedCustomer as any).step ?? 0})
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="shadow-sm">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {t.contact ?? 'Contact'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-3">
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="font-mono text-sm">{(selectedCustomer as any).whatsappNumber ?? '-'}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Email: <span className="font-medium text-foreground">{(selectedCustomer as any).email ?? '-'}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-sm">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {t.draftMeta ?? 'Draft meta'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-1 text-xs text-muted-foreground">
                    <div>ID: <span className="font-mono text-foreground">{(selectedCustomer as any).id}</span></div>
                    <div>
                      {t.updated ?? 'Updated'}:{' '}
                      <span className="text-foreground">
                        {(selectedCustomer as any).updatedAt ? new Date((selectedCustomer as any).updatedAt).toLocaleString() : '-'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="shadow-sm">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t.inputSnapshot ?? 'Input snapshot'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <pre className="text-[11px] whitespace-pre-wrap break-words rounded-md bg-muted/30 p-3 border">
                    {JSON.stringify((selectedCustomer as any).formValues ?? {}, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="space-y-6 max-w-2xl">
              <div className="flex items-center justify-between pb-4 border-b">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                    {selectedCustomer.name?.charAt(0)?.toUpperCase() ?? '?'}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight">{selectedCustomer.name}</h2>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono">{selectedCustomer.id}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="shadow-sm">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Contact Info
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-3">
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="font-mono text-sm">{selectedCustomer.whatsappNumber ?? '-'}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-sm">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 flex gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{selectedCustomer.orders?.length ?? 0}</div>
                      <div className="text-[10px] text-muted-foreground uppercase">Total Orders</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Package className="h-4 w-4" /> Order History
                </h3>
                <div className="rounded-xl border bg-card divide-y">
                  {(selectedCustomer.orders ?? []).map((o: any) => (
                    <div
                      key={o.id}
                      className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors cursor-pointer group"
                      onClick={() => onOpenOrder(o.id)}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-medium text-primary group-hover:underline">
                            {o.id}
                          </span>
                          <Badge
                            variant={
                              o.status === 'completed'
                                ? 'secondary'
                                : o.status === 'failed'
                                  ? 'destructive'
                                  : 'outline'
                            }
                            className="text-[10px] h-5"
                          >
                            {o.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(o.createdAt).toLocaleString()}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-medium">{o.deliveryStatus}</div>
                        {o.status === 'failed' && (
                          <div className="text-[10px] text-destructive max-w-[200px] truncate">
                            {o.errorMessage}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {(selectedCustomer.orders ?? []).length === 0 && (
                    <div className="p-8 text-center text-xs text-muted-foreground">No orders recorded.</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t.customers}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {fetchLoading ? 'Loading…' : `${total} customer${total !== 1 ? 's' : ''}${totalPages > 1 ? ` · Page ${safePage} of ${totalPages}` : ''}`}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchCustomersPlaceholder ?? 'Search by name, phone, or email...'}
            className="pl-9 h-9"
          />
        </div>

        <div className="flex gap-1.5">
          {(['all', 'customer', 'draft'] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKindFilter(k)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors border',
                kindFilter === k
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:bg-muted'
              )}
            >
              {k === 'all' ? 'All' : k === 'customer' ? 'Customers' : 'Drafts'}
            </button>
          ))}
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-3 px-4 py-2.5 rounded-lg border border-red-200 bg-red-50">
          <span className="text-sm font-medium text-red-800">
            {selected.size} item{selected.size > 1 ? 's' : ''} selected
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
              <span className="text-xs text-red-700 font-medium">Are you sure? This will also delete their orders.</span>
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
                    checked={customers.length > 0 && customers.every((c) => selected.has(c.id))}
                    ref={(el) => {
                      if (el) el.indeterminate = customers.some((c) => selected.has(c.id)) && !customers.every((c) => selected.has(c.id))
                    }}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelected(new Set([...selected, ...customers.map((c) => c.id)]))
                      } else {
                        const next = new Set(selected)
                        customers.forEach((c) => next.delete(c.id))
                        setSelected(next)
                      }
                    }}
                  />
                </th>
                <th
                  className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider cursor-pointer select-none"
                  onClick={() => toggleSort('name')}
                >
                  <span className="inline-flex items-center gap-1">
                    Name <SortIcon field="name" />
                  </span>
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  WhatsApp
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Email
                </th>
                <th
                  className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider cursor-pointer select-none"
                  onClick={() => toggleSort('kind')}
                >
                  <span className="inline-flex items-center gap-1">
                    Type <SortIcon field="kind" />
                  </span>
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Orders
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Latest Status
                </th>
                <th
                  className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider cursor-pointer select-none"
                  onClick={() => toggleSort('createdAt')}
                >
                  <span className="inline-flex items-center gap-1">
                    Date <SortIcon field="createdAt" />
                  </span>
                </th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {customers.map((c) => (
                <tr
                  key={c.id}
                  className={cn(
                    'hover:bg-muted/30 transition-colors group',
                    selected.has(c.id) && 'bg-primary/5'
                  )}
                >
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                      checked={selected.has(c.id)}
                      onChange={(e) => {
                        const next = new Set(selected)
                        if (e.target.checked) next.add(c.id)
                        else next.delete(c.id)
                        setSelected(next)
                      }}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{c.name}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-muted-foreground">{c.whatsappNumber || '-'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-muted-foreground">{c.email || '-'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border capitalize',
                        kindColor(c.kind)
                      )}
                    >
                      {c.kind === 'draft' ? 'Draft' : 'Customer'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {c.kind === 'draft' ? (
                      <span className="text-xs text-muted-foreground">{stepLabel((c as any).draftStep)}</span>
                    ) : (
                      <span className="text-xs font-medium">{c.orderCount}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {c.latestOrderStatus ? (
                      <StatusBadge value={c.latestOrderStatus} />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-muted-foreground">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="View customer"
                        onClick={() => onOpenCustomer(c.id)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && !fetchLoading && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    {t.noCustomersFound ?? 'No customers found.'}
                  </td>
                </tr>
              )}
              {fetchLoading && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Loading…
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
                className="px-3 py-1.5 rounded-md text-xs font-medium border bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                disabled={safePage >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 rounded-md text-xs font-medium border bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
