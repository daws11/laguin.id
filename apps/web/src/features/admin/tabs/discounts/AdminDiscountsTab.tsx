import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, Pencil, Trash2, Pause, Play } from 'lucide-react'
import * as adminApi from '@/features/admin/api'
import type { DiscountCodeItem } from '@/features/admin/api'

type Props = {
  token: string
  t: any
}

const fmtCurrency = (amt: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amt)

const fmtDate = (d: string | null) => {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

type FormState = {
  code: string
  fixedAmount: string
  templateSlugs: string
  startsAt: string
  endsAt: string
  maxUsesPerPhone: string
  status: 'active' | 'paused'
}

const emptyForm: FormState = {
  code: '',
  fixedAmount: '',
  templateSlugs: '',
  startsAt: '',
  endsAt: '',
  maxUsesPerPhone: '',
  status: 'active',
}

function toFormState(item: DiscountCodeItem): FormState {
  return {
    code: item.code,
    fixedAmount: String(item.fixedAmount),
    templateSlugs: Array.isArray(item.templateSlugs) ? item.templateSlugs.join(', ') : '',
    startsAt: item.startsAt ? item.startsAt.slice(0, 16) : '',
    endsAt: item.endsAt ? item.endsAt.slice(0, 16) : '',
    maxUsesPerPhone: item.maxUsesPerPhone != null ? String(item.maxUsesPerPhone) : '',
    status: item.status,
  }
}

export function AdminDiscountsTab({ token, t }: Props) {
  const [codes, setCodes] = useState<DiscountCodeItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)

  async function loadCodes() {
    setLoading(true)
    setError(null)
    try {
      const data = await adminApi.adminGetDiscountCodes(token)
      setCodes(data)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load discount codes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadCodes()
  }, [token])

  function openCreateForm() {
    setEditingId(null)
    setForm(emptyForm)
    setShowForm(true)
    setError(null)
  }

  function openEditForm(item: DiscountCodeItem) {
    setEditingId(item.id)
    setForm(toFormState(item))
    setShowForm(true)
    setError(null)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
    setError(null)
  }

  async function handleSave() {
    setError(null)
    const code = form.code.trim()
    if (!code) { setError('Code is required'); return }
    const fixedAmount = parseInt(form.fixedAmount, 10)
    if (isNaN(fixedAmount) || fixedAmount < 0) { setError('Invalid amount'); return }

    const templateSlugs = form.templateSlugs.trim()
      ? form.templateSlugs.split(',').map(s => s.trim()).filter(Boolean)
      : null
    const startsAt = form.startsAt ? new Date(form.startsAt).toISOString() : null
    const endsAt = form.endsAt ? new Date(form.endsAt).toISOString() : null
    const maxUsesPerPhone = form.maxUsesPerPhone ? parseInt(form.maxUsesPerPhone, 10) : null

    setLoading(true)
    try {
      if (editingId) {
        await adminApi.adminUpdateDiscountCode(token, editingId, {
          code, fixedAmount, templateSlugs, startsAt, endsAt, maxUsesPerPhone, status: form.status,
        })
      } else {
        await adminApi.adminCreateDiscountCode(token, {
          code, fixedAmount, templateSlugs, startsAt, endsAt, maxUsesPerPhone, status: form.status,
        })
      }
      closeForm()
      await loadCodes()
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this discount code?')) return
    setLoading(true)
    try {
      await adminApi.adminDeleteDiscountCode(token, id)
      await loadCodes()
    } catch (e: any) {
      setError(e?.message ?? 'Failed to delete')
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleStatus(item: DiscountCodeItem) {
    const newStatus = item.status === 'active' ? 'paused' : 'active'
    setLoading(true)
    try {
      await adminApi.adminUpdateDiscountCode(token, item.id, { status: newStatus })
      await loadCodes()
    } catch (e: any) {
      setError(e?.message ?? 'Failed to update status')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 h-full overflow-auto p-1">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Discount Codes</h2>
        <Button size="sm" onClick={openCreateForm} disabled={loading}>
          <Plus className="h-4 w-4 mr-1" /> Create
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {showForm && (
        <Card className="shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">{editingId ? 'Edit Discount Code' : 'Create Discount Code'}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Code</label>
                <Input
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="e.g. HEMAT50"
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Discount Amount (Rp)</label>
                <Input
                  type="number"
                  value={form.fixedAmount}
                  onChange={e => setForm(f => ({ ...f, fixedAmount: e.target.value }))}
                  placeholder="e.g. 100000"
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Template Slugs (comma-separated, blank = all)</label>
                <Input
                  value={form.templateSlugs}
                  onChange={e => setForm(f => ({ ...f, templateSlugs: e.target.value }))}
                  placeholder="e.g. valentine, birthday"
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Max Uses Per Phone (blank = unlimited)</label>
                <Input
                  type="number"
                  value={form.maxUsesPerPhone}
                  onChange={e => setForm(f => ({ ...f, maxUsesPerPhone: e.target.value }))}
                  placeholder="e.g. 1"
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Starts At</label>
                <Input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Ends At</label>
                <Input
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={e => setForm(f => ({ ...f, endsAt: e.target.value }))}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as 'active' | 'paused' }))}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={closeForm}>Cancel</Button>
              <Button size="sm" onClick={() => void handleSave()} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                {editingId ? 'Update' : 'Create'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && !showForm && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && codes.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground text-center py-8">No discount codes yet.</p>
      )}

      {codes.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="p-2 font-medium">Code</th>
                <th className="p-2 font-medium">Amount</th>
                <th className="p-2 font-medium hidden sm:table-cell">Templates</th>
                <th className="p-2 font-medium hidden md:table-cell">Period</th>
                <th className="p-2 font-medium hidden sm:table-cell">Per Phone</th>
                <th className="p-2 font-medium">Status</th>
                <th className="p-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {codes.map(item => (
                <tr key={item.id} className="border-b hover:bg-muted/50">
                  <td className="p-2 font-mono font-semibold">{item.code}</td>
                  <td className="p-2">{fmtCurrency(item.fixedAmount)}</td>
                  <td className="p-2 hidden sm:table-cell text-xs text-muted-foreground">
                    {Array.isArray(item.templateSlugs) && item.templateSlugs.length > 0
                      ? item.templateSlugs.join(', ')
                      : 'All'}
                  </td>
                  <td className="p-2 hidden md:table-cell text-xs text-muted-foreground">
                    {fmtDate(item.startsAt)} — {fmtDate(item.endsAt)}
                  </td>
                  <td className="p-2 hidden sm:table-cell text-xs">
                    {item.maxUsesPerPhone ?? '∞'}
                  </td>
                  <td className="p-2">
                    <Badge variant={item.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
                      {item.status}
                    </Badge>
                  </td>
                  <td className="p-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => void handleToggleStatus(item)}
                        title={item.status === 'active' ? 'Pause' : 'Activate'}
                      >
                        {item.status === 'active' ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEditForm(item)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => void handleDelete(item.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
