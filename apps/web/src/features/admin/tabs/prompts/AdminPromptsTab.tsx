import { SupportedPlaceholders, validatePlaceholders } from 'shared'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { PromptTemplate } from '@/features/admin/types'
import { cn } from '@/lib/utils'
import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle, FileCode } from 'lucide-react'

type PromptType = 'lyrics' | 'mood_description' | 'music'

const PromptTypeMeta: Record<PromptType, { label: string; description: string }> = {
  lyrics: {
    label: 'Lyrics',
    description: 'Prompt untuk menghasilkan lirik berdasarkan input user.',
  },
  mood_description: {
    label: 'Mood Description',
    description: 'Prompt untuk membuat deskripsi mood/style dari lirik.',
  },
  music: {
    label: 'Music',
    description: 'Prompt audit/debug untuk style musik (dipakai untuk metadata).',
  },
}

export function AdminPromptsTab({
  t,
  templates,
  loading,
  onSaveTemplate,
}: {
  t: any
  templates: PromptTemplate[]
  loading: boolean
  onSaveTemplate: (id: string, templateText: string) => Promise<void> | void
}) {
  const activeTemplates = useMemo(() => {
    const byType: Partial<Record<PromptType, PromptTemplate>> = {}
    ;(['lyrics', 'mood_description', 'music'] as const).forEach((type) => {
      const candidates = templates
        .filter((x) => x.type === type && x.isActive)
        .sort((a, b) => (b.version ?? 0) - (a.version ?? 0))
      byType[type] = candidates[0]
    })
    return byType as Record<PromptType, PromptTemplate | undefined>
  }, [templates])

  const [drafts, setDrafts] = useState<Record<PromptType, string>>({
    lyrics: '',
    mood_description: '',
    music: '',
  })
  const [dirty, setDirty] = useState<Record<PromptType, boolean>>({
    lyrics: false,
    mood_description: false,
    music: false,
  })
  const [saving, setSaving] = useState<Record<PromptType, boolean>>({
    lyrics: false,
    mood_description: false,
    music: false,
  })
  const [savedAt, setSavedAt] = useState<Record<PromptType, string | null>>({
    lyrics: null,
    mood_description: null,
    music: null,
  })
  const [selectedType, setSelectedType] = useState<PromptType>('lyrics')

  useEffect(() => {
    ;(['lyrics', 'mood_description', 'music'] as const).forEach((type) => {
      const active = activeTemplates[type]
      if (!active) return
      if (dirty[type]) return
      setDrafts((prev) => (prev[type] === active.templateText ? prev : { ...prev, [type]: active.templateText }))
    })
  }, [activeTemplates, dirty])

  async function handleSave(type: PromptType) {
    const active = activeTemplates[type]
    if (!active) return
    setSaving((prev) => ({ ...prev, [type]: true }))
    try {
      await onSaveTemplate(active.id, drafts[type])
      setDirty((prev) => ({ ...prev, [type]: false }))
      setSavedAt((prev) => ({ ...prev, [type]: new Date().toLocaleTimeString() }))
    } finally {
      setSaving((prev) => ({ ...prev, [type]: false }))
    }
  }

  return (
    <Card className="h-full shadow-sm md:col-span-2 lg:col-span-3 flex flex-col overflow-hidden">
      <CardHeader className="p-4 pb-2 bg-muted/5 shrink-0 border-b">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">{t.prompts}</CardTitle>
            <CardDescription className="text-[10px]">Kelola template prompt untuk generasi lirik dan musik.</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1 min-h-0 flex flex-col md:flex-row">
        <aside className="w-full md:w-[220px] bg-muted/10 border-b md:border-b-0 md:border-r flex flex-col gap-1 p-2 overflow-y-auto shrink-0">
          <div className="px-2 py-1.5 mt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 border-t pt-3">
            Helpers
          </div>
          <div className="px-2 space-y-2">
             <div className="text-[10px] text-muted-foreground">
               Available Placeholders:
             </div>
             <div className="flex flex-wrap gap-1">
               {SupportedPlaceholders.map((p) => (
                 <Badge key={p} variant="outline" className="text-[9px] px-1 py-0 h-4 bg-background font-mono text-muted-foreground border-muted-foreground/30">
                   [{p}]
                 </Badge>
               ))}
             </div>
          </div>
        </aside>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-background">
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="pb-2 border-b">
              <h3 className="text-base font-semibold">Active Prompts</h3>
              <p className="text-xs text-muted-foreground">Edit prompt aktif untuk setiap tipe (tanpa versi & tanpa template list).</p>
            </div>

            <Tabs value={selectedType} onValueChange={(v) => setSelectedType(v as PromptType)} className="w-full">
              <TabsList className="w-full justify-start flex-wrap h-auto">
                {(['lyrics', 'mood_description', 'music'] as const).map((type) => {
                  const meta = PromptTypeMeta[type]
                  return (
                    <TabsTrigger key={type} value={type} className="text-xs">
                      <span className="flex items-center gap-2">
                        <span>{meta.label}</span>
                        {dirty[type] ? <span className="h-2 w-2 rounded-full bg-primary" /> : null}
                      </span>
                    </TabsTrigger>
                  )
                })}
              </TabsList>

              {(['lyrics', 'mood_description', 'music'] as const).map((type) => {
                const meta = PromptTypeMeta[type]
                const active = activeTemplates[type]
                const text = drafts[type]
                const v = validatePlaceholders(text)
                const hasInvalid = v.unknown.length > 0
                const canSave =
                  !!active &&
                  dirty[type] &&
                  !saving[type] &&
                  !loading &&
                  text.trim().length > 0

                return (
                  <TabsContent key={type} value={type} className="mt-4">
                    <div className="rounded-xl border bg-card shadow-sm overflow-hidden flex flex-col">
                      <div className="p-3 border-b bg-muted/10">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <FileCode className="h-4 w-4 text-muted-foreground" />
                              <div className="text-sm font-semibold">{meta.label}</div>
                              <Badge variant="default" className="text-[10px] h-5 px-1.5">{t.active}</Badge>
                            </div>
                            <div className="text-[10px] text-muted-foreground">{meta.description}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">
                              {active ? `id: ${active.id.slice(0, 8)}` : (t.noActiveTemplate ?? 'no active template found')}
                            </div>
                          </div>
                          <div className="text-right space-y-1">
                            {savedAt[type] ? (
                              <div className="text-[10px] text-muted-foreground">saved at {savedAt[type]}</div>
                            ) : (
                              <div className="text-[10px] text-muted-foreground">&nbsp;</div>
                            )}
                            <div className="text-[10px]">
                              {hasInvalid ? (
                                <span className="inline-flex items-center gap-1 text-destructive font-medium">
                                  <AlertCircle className="h-3 w-3" />
                                  Invalid: {v.unknown.join(', ')}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-green-600 font-medium">
                                  <CheckCircle className="h-3 w-3" /> Valid
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-3 flex-1 flex flex-col gap-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            {t.templateText}
                          </label>
                          <Textarea
                            value={text}
                            onChange={(e) => {
                              const next = e.target.value
                              setDrafts((prev) => ({ ...prev, [type]: next }))
                              setDirty((prev) => ({ ...prev, [type]: true }))
                              setSavedAt((prev) => ({ ...prev, [type]: null }))
                            }}
                            className={cn(
                              'font-mono text-xs leading-relaxed h-[42vh] min-h-[260px] resize-y',
                              hasInvalid ? 'border-destructive/50 focus-visible:ring-destructive/30' : '',
                            )}
                            placeholder="Write your prompt template here..."
                            disabled={!active || saving[type] || loading}
                          />
                        </div>

                        <div className="mt-auto flex items-center justify-between gap-2">
                          <div className="text-[10px] text-muted-foreground">
                            {dirty[type] ? (t.unsavedChanges ?? 'unsaved changes') : ' '}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => void handleSave(type)}
                            disabled={!canSave}
                            className="min-w-[96px]"
                          >
                            {saving[type] || loading ? (t.saving ?? 'Saving…') : (t.save ?? 'Save')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                )
              })}
            </Tabs>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

