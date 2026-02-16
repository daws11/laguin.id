import { useCallback, useEffect, useState } from 'react'
import * as adminApi from '@/features/admin/api'
import type { ThemeItem } from '@/features/admin/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function AdminThemesTab({ t, token, defaultThemeSlug, onDefaultThemeChange }: { 
  t: any
  token: string
  defaultThemeSlug: string | null
  onDefaultThemeChange: (slug: string) => void
}) {
  const [themes, setThemes] = useState<ThemeItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<ThemeItem | null>(null)
  const [creating, setCreating] = useState(false)
  
  const [formName, setFormName] = useState('')
  const [formSlug, setFormSlug] = useState('')
  const [formActive, setFormActive] = useState(true)
  const [formSettings, setFormSettings] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const items = await adminApi.adminGetThemes(token)
      setThemes(items)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load themes')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { refresh() }, [refresh])

  function startCreate() {
    setCreating(true)
    setEditing(null)
    setFormName('')
    setFormSlug('')
    setFormActive(true)
    setFormSettings('{}')
  }

  function startEdit(theme: ThemeItem) {
    setEditing(theme)
    setCreating(false)
    setFormName(theme.name)
    setFormSlug(theme.slug)
    setFormActive(theme.isActive)
    setFormSettings(JSON.stringify(theme.settings ?? {}, null, 2))
  }

  function cancelForm() {
    setEditing(null)
    setCreating(false)
    setError(null)
  }

  async function handleSave() {
    setError(null)
    setLoading(true)
    try {
      let settings: any = {}
      try { settings = JSON.parse(formSettings) } catch { setError('Invalid JSON in settings'); setLoading(false); return }
      
      if (creating) {
        await adminApi.adminCreateTheme(token, { slug: formSlug, name: formName, isActive: formActive, settings })
      } else if (editing) {
        await adminApi.adminUpdateTheme(token, editing.slug, { name: formName, isActive: formActive, settings })
      }
      cancelForm()
      await refresh()
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save theme')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(slug: string) {
    if (!confirm(`Delete theme "${slug}"?`)) return
    setError(null)
    setLoading(true)
    try {
      await adminApi.adminDeleteTheme(token, slug)
      await refresh()
    } catch (e: any) {
      setError(e?.message ?? 'Failed to delete theme')
    } finally {
      setLoading(false)
    }
  }

  async function handleSetDefault(slug: string) {
    setError(null)
    setLoading(true)
    try {
      onDefaultThemeChange(slug)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to set default')
    } finally {
      setLoading(false)
    }
  }

  const isFormOpen = creating || editing !== null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t.themes ?? 'Themes'}</h3>
          <p className="text-sm text-muted-foreground">{t.themesDesc ?? 'Manage themed landing pages and config flows.'}</p>
        </div>
        {!isFormOpen && (
          <Button onClick={startCreate} size="sm">{t.createTheme ?? 'Create Theme'}</Button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>
      )}

      {isFormOpen && (
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base">{creating ? (t.createTheme ?? 'Create Theme') : (t.editTheme ?? 'Edit Theme')}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{t.themeName ?? 'Name'}</label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Mother's Day" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{t.themeSlug ?? 'Slug (URL path)'}</label>
              <Input 
                value={formSlug} 
                onChange={(e) => setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} 
                placeholder="e.g. motherday" 
                disabled={!!editing}
              />
              {formSlug && <p className="text-xs text-muted-foreground">URL: /{formSlug}</p>}
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={formActive} onChange={(e) => setFormActive(e.target.checked)} id="theme-active" />
              <label htmlFor="theme-active" className="text-sm">{t.themeActive ?? 'Active'}</label>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{t.themeSettings ?? 'Settings (JSON)'}</label>
              <textarea
                value={formSettings}
                onChange={(e) => setFormSettings(e.target.value)}
                className="w-full h-48 rounded-md border bg-background px-3 py-2 text-sm font-mono shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500/40"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={loading || !formName || !formSlug} size="sm">
                {loading ? (t.saving ?? 'Saving...') : (t.save ?? 'Save')}
              </Button>
              <Button variant="outline" onClick={cancelForm} size="sm">{t.cancel ?? 'Cancel'}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!isFormOpen && (
        <div className="space-y-2">
          {themes.length === 0 && !loading && (
            <div className="rounded-lg border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
              {t.noThemes ?? 'No themes created yet.'}
            </div>
          )}
          {themes.map((theme) => (
            <div key={theme.id} className="flex items-center justify-between rounded-lg border bg-background p-3 hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{theme.name}</span>
                    <span className="text-xs text-muted-foreground">/{theme.slug}</span>
                    {theme.slug === defaultThemeSlug && (
                      <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700">
                        {t.defaultTheme ?? 'Default'}
                      </span>
                    )}
                    {!theme.isActive && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                        {t.inactive ?? 'Inactive'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {theme.slug !== defaultThemeSlug && (
                  <Button variant="ghost" size="sm" onClick={() => handleSetDefault(theme.slug)} className="text-xs">
                    {t.setAsDefault ?? 'Set Default'}
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => startEdit(theme)} className="text-xs">
                  {t.edit ?? 'Edit'}
                </Button>
                {theme.slug !== defaultThemeSlug && (
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(theme.slug)} className="text-xs text-destructive hover:text-destructive">
                    {t.delete ?? 'Delete'}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
