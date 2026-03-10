import { useCallback, useEffect, useMemo, useState } from 'react'
import * as adminApi from '@/features/admin/api'
import type { ThemeItem } from '@/features/admin/api'
import type { PublicSiteDraft } from '@/features/admin/types'
import { buildDraftFromSettings, buildPublicSiteConfigPayload } from '@/features/admin/publicSiteDraft'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LandingContentConfigSection } from '@/features/admin/tabs/settings/LandingContentConfigSection'
import { ArrowLeft, Sparkles, Loader2 } from 'lucide-react'

function buildDraftFromThemeSettings(settings: any): PublicSiteDraft {
  const fakeSettings = { publicSiteConfig: settings } as any
  return buildDraftFromSettings(fakeSettings)
}

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

  const [themeDraft, setThemeDraft] = useState<PublicSiteDraft>(() => buildDraftFromThemeSettings({}))
  const [themeDraftBaseline, setThemeDraftBaseline] = useState<string>('')
  const [themeSavedAt, setThemeSavedAt] = useState<string | null>(null)
  const [themeError, setThemeError] = useState<string | null>(null)

  const [aiPrompt, setAiPrompt] = useState('')
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  const themeDraftCurrent = useMemo(
    () => JSON.stringify(buildPublicSiteConfigPayload(themeDraft)),
    [themeDraft],
  )
  const themeDraftIsDirty = themeDraftCurrent !== themeDraftBaseline

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
    setError(null)
  }

  function startEdit(theme: ThemeItem) {
    setEditing(theme)
    setCreating(false)
    setFormName(theme.name)
    setFormSlug(theme.slug)
    setFormActive(theme.isActive)
    const draft = buildDraftFromThemeSettings(theme.settings ?? {})
    setThemeDraft(draft)
    setThemeDraftBaseline(JSON.stringify(buildPublicSiteConfigPayload(draft)))
    setThemeSavedAt(null)
    setThemeError(null)
    setError(null)
  }

  function cancelForm() {
    setEditing(null)
    setCreating(false)
    setError(null)
    setThemeError(null)
  }

  async function handleCreateSubmit() {
    setError(null)
    setLoading(true)
    try {
      const created = await adminApi.adminCreateTheme(token, { slug: formSlug, name: formName, isActive: formActive, settings: {} })
      await refresh()
      const freshThemes = await adminApi.adminGetThemes(token)
      const freshTheme = freshThemes.find((th: ThemeItem) => th.slug === created.slug)
      if (freshTheme) {
        startEdit(freshTheme)
      } else {
        cancelForm()
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to create theme')
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveTheme() {
    if (!editing) return
    setThemeError(null)
    setLoading(true)
    try {
      const payload = buildPublicSiteConfigPayload(themeDraft)
      await adminApi.adminUpdateTheme(token, editing.slug, { name: formName, isActive: formActive, settings: payload })
      setThemeSavedAt(new Date().toLocaleTimeString())
      setThemeDraftBaseline(JSON.stringify(payload))
      await refresh()
    } catch (e: any) {
      setThemeError(e?.message ?? 'Failed to save theme')
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

  async function handleDuplicate(slug: string) {
    setError(null)
    setLoading(true)
    try {
      await adminApi.adminDuplicateTheme(token, slug)
      await refresh()
    } catch (e: any) {
      setError(e?.message ?? 'Failed to duplicate theme')
    } finally {
      setLoading(false)
    }
  }

  async function handleAiGenerate() {
    if (!aiPrompt.trim() || aiGenerating) return
    setAiGenerating(true)
    setAiError(null)
    try {
      const res = await adminApi.adminAiGenerateTheme(token, aiPrompt.trim())
      if (res?.settings && typeof res.settings === 'object') {
        const currentDraft = themeDraft
        const aiDraft = buildDraftFromThemeSettings(res.settings)
        setThemeDraft({
          ...aiDraft,
          logoUrl: currentDraft.logoUrl,
          landing: {
            ...aiDraft.landing,
            heroMedia: currentDraft.landing.heroMedia,
            heroOverlay: {
              ...aiDraft.landing.heroOverlay,
              authorAvatarUrl: currentDraft.landing.heroOverlay.authorAvatarUrl,
            },
            heroPlayer: {
              ...aiDraft.landing.heroPlayer,
              enabled: currentDraft.landing.heroPlayer.enabled,
              audioUrl: currentDraft.landing.heroPlayer.audioUrl,
              authorAvatarUrl: currentDraft.landing.heroPlayer.authorAvatarUrl,
            },
            audioSamples: {
              nowPlaying: {
                ...aiDraft.landing.audioSamples.nowPlaying,
                audioUrl: currentDraft.landing.audioSamples.nowPlaying.audioUrl,
              },
              playlist: aiDraft.landing.audioSamples.playlist.map((p, i) => ({
                ...p,
                audioUrl: currentDraft.landing.audioSamples.playlist[i]?.audioUrl ?? '',
              })),
            },
          },
          promoBanner: {
            ...aiDraft.promoBanner,
            enabled: currentDraft.promoBanner.enabled,
          },
          activityToast: {
            ...aiDraft.activityToast,
            enabled: currentDraft.activityToast.enabled,
            intervalMs: currentDraft.activityToast.intervalMs,
            durationMs: currentDraft.activityToast.durationMs,
          },
          reviews: {
            ...aiDraft.reviews,
            items: aiDraft.reviews.items.map((item, i) => ({
              ...item,
              authorAvatarUrl: currentDraft.reviews.items[i]?.authorAvatarUrl ?? item.authorAvatarUrl,
            })),
          },
          creationDelivery: currentDraft.creationDelivery,
          configSteps: {
            ...aiDraft.configSteps,
            step0: {
              ...aiDraft.configSteps.step0,
              enabled: currentDraft.configSteps.step0.enabled,
            },
          },
        })
      } else {
        setAiError('AI returned an unexpected response format.')
      }
    } catch (e: any) {
      setAiError(e?.message ?? 'Failed to generate content with AI.')
    } finally {
      setAiGenerating(false)
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

  if (editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={cancelForm} className="gap-1">
            <ArrowLeft className="h-4 w-4" />
            {t.allThemes ?? 'All Themes'}
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">{formName || editing.name}</h3>
            <p className="text-sm text-muted-foreground">/{editing.slug}</p>
          </div>
        </div>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{t.themeName ?? 'Name'}</label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Mother's Day" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{t.themeSlug ?? 'Slug (URL path)'}</label>
                <Input value={formSlug} disabled className="bg-muted/30" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={formActive} onChange={(e) => setFormActive(e.target.checked)} id="theme-active-edit" />
              <label htmlFor="theme-active-edit" className="text-sm">{t.themeActive ?? 'Active'}</label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">AI Content Generator</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Describe the theme and the AI will fill in all text fields (headlines, reviews, config steps, etc). Prices, toggles, and uploaded files won't be changed.
            </p>
            <div className="flex gap-2">
              <Input
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g. Landing page for Mother's Day in Indonesia, warm and emotional tone"
                disabled={aiGenerating}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAiGenerate() } }}
              />
              <Button
                onClick={handleAiGenerate}
                disabled={aiGenerating || !aiPrompt.trim()}
                size="sm"
                className="shrink-0 gap-1.5"
              >
                {aiGenerating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    Generate
                  </>
                )}
              </Button>
            </div>
            {aiError && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">{aiError}</div>
            )}
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>
        )}

        <div className="h-[calc(100vh-380px)]">
          <LandingContentConfigSection
            draft={themeDraft}
            setDraft={setThemeDraft}
            onSave={handleSaveTheme}
            isDirty={themeDraftIsDirty || formName !== editing.name || formActive !== editing.isActive}
            savedAt={themeSavedAt}
            error={themeError}
            setError={setThemeError}
            loading={loading}
            token={token}
            t={t}
          />
        </div>
      </div>
    )
  }

  if (creating) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={cancelForm} className="gap-1">
            <ArrowLeft className="h-4 w-4" />
            {t.allThemes ?? 'All Themes'}
          </Button>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>
        )}

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base">{t.createTheme ?? 'Create Theme'}</CardTitle>
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
              />
              {formSlug && <p className="text-xs text-muted-foreground">URL: /{formSlug}</p>}
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={formActive} onChange={(e) => setFormActive(e.target.checked)} id="theme-active-create" />
              <label htmlFor="theme-active-create" className="text-sm">{t.themeActive ?? 'Active'}</label>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateSubmit} disabled={loading || !formName || !formSlug} size="sm">
                {loading ? (t.saving ?? 'Saving...') : (t.createTheme ?? 'Create Theme')}
              </Button>
              <Button variant="outline" onClick={cancelForm} size="sm">{t.cancel ?? 'Cancel'}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t.themes ?? 'Themes'}</h3>
          <p className="text-sm text-muted-foreground">{t.themesDesc ?? 'Manage themed landing pages and config flows.'}</p>
        </div>
        <Button onClick={startCreate} size="sm">{t.createTheme ?? 'Create Theme'}</Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>
      )}

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
              <Button variant="ghost" size="sm" onClick={() => handleDuplicate(theme.slug)} disabled={loading} className="text-xs">
                Duplicate
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
    </div>
  )
}
