import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, Pencil, Trash2, Shield, User } from 'lucide-react'
import * as adminApi from '@/features/admin/api'
import type { AdminUserItem } from '@/features/admin/api'

const SECTION_SLUGS = [
  'orders',
  'funnel',
  'customers',
  'settings',
  'prompts',
  'themes',
  'testimonials',
  'discounts',
] as const

const SECTION_LABELS: Record<string, string> = {
  orders: 'Orders',
  funnel: 'Funnel',
  customers: 'Customers',
  settings: 'Settings',
  prompts: 'Prompts',
  themes: 'Themes',
  testimonials: 'Testimonials',
  discounts: 'Discounts',
}

type Props = {
  token: string
  t: any
  currentUserId: string
}

type FormState = {
  username: string
  password: string
  role: 'admin' | 'user'
  permissions: string[]
}

const emptyForm: FormState = {
  username: '',
  password: '',
  role: 'user',
  permissions: [],
}

export function AdminUsersTab({ token, t, currentUserId }: Props) {
  const [users, setUsers] = useState<AdminUserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await adminApi.adminGetUsers(token)
      setUsers(data)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setShowForm(true)
    setError(null)
  }

  function openEdit(user: AdminUserItem) {
    setEditingId(user.id)
    setForm({
      username: user.username,
      password: '',
      role: user.role,
      permissions: Array.isArray(user.permissions) ? (user.permissions as string[]) : [],
    })
    setShowForm(true)
    setError(null)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
    setError(null)
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      if (editingId) {
        const body: any = { role: form.role, permissions: form.permissions }
        if (form.username) body.username = form.username
        if (form.password) body.password = form.password
        await adminApi.adminUpdateUser(token, editingId, body)
      } else {
        if (!form.username || !form.password) {
          setError('Username and password are required.')
          setSaving(false)
          return
        }
        await adminApi.adminCreateUser(token, {
          username: form.username,
          password: form.password,
          role: form.role,
          permissions: form.role === 'admin' ? [] : form.permissions,
        })
      }
      closeForm()
      await load()
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save user')
    } finally {
      setSaving(false)
    }
  }

  async function deleteUser(id: string) {
    if (id === currentUserId) {
      setError(t.cannotDeleteSelf ?? 'Cannot delete your own account.')
      return
    }
    if (!confirm(t.confirmDeleteUser ?? 'Are you sure you want to delete this user?')) return
    setSaving(true)
    setError(null)
    try {
      await adminApi.adminDeleteUser(token, id)
      await load()
    } catch (e: any) {
      setError(e?.message ?? 'Failed to delete user')
    } finally {
      setSaving(false)
    }
  }

  function togglePermission(slug: string) {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(slug)
        ? f.permissions.filter((p) => p !== slug)
        : [...f.permissions, slug],
    }))
  }

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t.users ?? 'Users'}</h2>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          {t.createUser ?? 'Create User'}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {showForm && (
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">
              {editingId ? (t.editUser ?? 'Edit User') : (t.createUser ?? 'Create User')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t.username ?? 'Username'}</label>
              <Input
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                placeholder="username"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                {t.password ?? 'Password'}{editingId ? ' (leave blank to keep current)' : ''}
              </label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder={editingId ? '••••••' : 'min 6 characters'}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t.role ?? 'Role'}</label>
              <select
                className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as 'admin' | 'user' }))}
              >
                <option value="admin">{t.adminRole ?? 'Admin'}</option>
                <option value="user">{t.userRole ?? 'User'}</option>
              </select>
            </div>
            {form.role === 'user' && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t.permissions ?? 'Permissions'}</label>
                <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                  {SECTION_SLUGS.map((slug) => (
                    <label
                      key={slug}
                      className="flex items-center gap-2 rounded border p-2 bg-background cursor-pointer hover:bg-muted/40 transition-colors text-sm"
                    >
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary"
                        checked={form.permissions.includes(slug)}
                        onChange={() => togglePermission(slug)}
                      />
                      <span>{SECTION_LABELS[slug] ?? slug}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button size="sm" onClick={() => void save()} disabled={saving}>
                {saving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                {t.saveUser ?? 'Save'}
              </Button>
              <Button size="sm" variant="outline" onClick={closeForm}>
                {t.cancel ?? 'Cancel'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {users.map((user) => (
          <Card key={user.id}>
            <CardContent className="p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex-shrink-0">
                  {user.role === 'admin' ? (
                    <Shield className="h-5 w-5 text-amber-600" />
                  ) : (
                    <User className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{user.username}</span>
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                      {user.role === 'admin' ? (t.adminRole ?? 'Admin') : (t.userRole ?? 'User')}
                    </Badge>
                  </div>
                  {user.role === 'user' && Array.isArray(user.permissions) && user.permissions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(user.permissions as string[]).map((p) => (
                        <Badge key={p} variant="outline" className="text-[10px] px-1 py-0">
                          {SECTION_LABELS[p] ?? p}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {user.role === 'user' && (!Array.isArray(user.permissions) || user.permissions.length === 0) && (
                    <span className="text-[10px] text-muted-foreground">No permissions</span>
                  )}
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(user)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                {user.id !== currentUserId && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => void deleteUser(user.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {users.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground text-center py-4">{t.noUsers ?? 'No users yet.'}</p>
        )}
      </div>
    </div>
  )
}
