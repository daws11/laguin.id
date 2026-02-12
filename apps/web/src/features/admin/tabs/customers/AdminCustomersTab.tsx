import { useMemo, useState } from 'react'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { CustomerDetail, CustomerListItem } from '@/features/admin/types'
import { Search, User, Phone, Package, Calendar } from 'lucide-react'

export function AdminCustomersTab({
  t,
  customers,
  selectedCustomer,
  onSelectCustomer,
  onOpenCustomer,
  onOpenOrder,
}: {
  t: any
  customers: CustomerListItem[]
  selectedCustomer: CustomerDetail | null
  onSelectCustomer: (c: CustomerDetail | null) => void
  onOpenCustomer: (id: string) => void
  onOpenOrder: (id: string) => void
}) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return customers
    return customers.filter((c) => {
      const hay = `${c.name} ${c.whatsappNumber} ${c.email ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [customers, query])

  return (
    <Card className="h-full shadow-sm md:col-span-2 lg:col-span-3 flex flex-col overflow-hidden">
      <CardHeader className="p-4 pb-2 bg-muted/5 shrink-0 border-b">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">{t.customers}</CardTitle>
            <CardDescription className="text-[10px]">{t.customerTap}</CardDescription>
          </div>
          <Badge variant="outline" className="h-6">
            {filtered.length} / {customers.length}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1 min-h-0 flex flex-col md:flex-row">
        {/* List Sidebar */}
        <aside className="w-full md:w-[320px] bg-muted/10 border-b md:border-b-0 md:border-r flex flex-col shrink-0">
           <div className="p-3 border-b bg-background/50">
             <div className="relative">
               <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
               <Input
                 value={query}
                 onChange={(e) => setQuery(e.target.value)}
                 placeholder="Search name, phone..."
                 className="h-9 pl-9 text-xs"
               />
             </div>
           </div>
           
           <div className="flex-1 overflow-y-auto p-2 space-y-1">
             {filtered.map((c) => (
               <button
                 key={c.id}
                 className={cn(
                   'w-full rounded-lg border p-3 text-left text-sm transition-all duration-200 group relative',
                   selectedCustomer?.id === c.id 
                     ? 'bg-background border-primary shadow-sm ring-1 ring-primary/10' 
                     : 'bg-background hover:bg-muted/50 hover:border-primary/30 border-transparent shadow-sm'
                 )}
                 onClick={() => onOpenCustomer(c.id)}
               >
                 <div className="flex items-center justify-between mb-1">
                   <div className="font-semibold text-foreground truncate flex items-center gap-1.5">
                     {c.name}
                   </div>
                   <Badge variant="secondary" className="text-[9px] h-4 px-1">
                     {c.orderCount} {t.orderCount}
                   </Badge>
                 </div>
                 
                 <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1.5 font-mono">
                   <Phone className="h-3 w-3" />
                   {c.whatsappNumber}
                 </div>

                 <div className="text-[10px] flex items-center gap-1.5 pt-1.5 border-t border-dashed">
                   <span className={cn(
                     "w-1.5 h-1.5 rounded-full",
                     c.latestOrderStatus === 'completed' ? "bg-green-500" : 
                     c.latestOrderStatus === 'failed' ? "bg-red-500" : "bg-amber-500"
                   )} />
                   <span className="text-muted-foreground">Latest:</span>
                   <span className="font-medium text-foreground">{c.latestOrderStatus ?? '-'}</span>
                 </div>
               </button>
             ))}
             
             {filtered.length === 0 && (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  No customers found.
                </div>
             )}
           </div>
        </aside>

        {/* Detail Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-background">
          {selectedCustomer ? (
            <div className="space-y-6 max-w-2xl animate-in fade-in slide-in-from-right-4 duration-300">
               <div className="flex items-center justify-between pb-4 border-b">
                 <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                      {selectedCustomer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold tracking-tight">{selectedCustomer.name}</h2>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-mono">{selectedCustomer.id}</span>
                      </div>
                    </div>
                 </div>
                 <div className="hidden md:block">
                    <Button variant="outline" size="sm" onClick={() => onSelectCustomer(null)}>Close</Button>
                 </div>
               </div>

               <div className="grid gap-4 sm:grid-cols-2">
                  <Card className="shadow-sm">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contact Info</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 space-y-3">
                       <div className="flex items-center gap-3">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono text-sm">{selectedCustomer.whatsappNumber}</span>
                       </div>
                       {/* Add Email here if available in detail */}
                    </CardContent>
                  </Card>
                  
                  <Card className="shadow-sm">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Summary</CardTitle>
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
                             <span className="font-mono text-xs font-medium text-primary group-hover:underline">{o.id}</span>
                             <Badge variant={o.status === 'completed' ? 'secondary' : o.status === 'failed' ? 'destructive' : 'outline'} className="text-[10px] h-5">
                               {o.status}
                             </Badge>
                           </div>
                           <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {new Date(o.createdAt).toLocaleString()}
                           </div>
                        </div>
                        
                        <div className="text-right">
                           <div className="text-xs font-medium">
                             {o.deliveryStatus}
                           </div>
                           {o.status === 'failed' && (
                             <div className="text-[10px] text-destructive max-w-[200px] truncate">
                               {o.errorMessage}
                             </div>
                           )}
                        </div>
                      </div>
                    ))}
                    {(selectedCustomer.orders ?? []).length === 0 && (
                      <div className="p-8 text-center text-xs text-muted-foreground">
                        No orders recorded.
                      </div>
                    )}
                  </div>
               </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4 opacity-50">
               <User className="h-12 w-12" />
               <p className="text-sm">{t.selectCustomer}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

