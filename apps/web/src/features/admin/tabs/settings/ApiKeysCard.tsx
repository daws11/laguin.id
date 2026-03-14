import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Save, Check, Loader2 } from 'lucide-react'
import type { Settings } from '@/features/admin/types'

interface Props {
  settings: Settings | null
  saveSettings: (
    partial: Partial<Settings> & { openaiApiKey?: string; kaiAiApiKey?: string; ycloudApiKey?: string; openaiModel?: string | null },
  ) => Promise<Settings | null>
  t: any
}

export function ApiKeysCard({ settings, saveSettings, t }: Props) {
  const [openaiKey, setOpenaiKey] = useState('')
  const [kaiaiKey, setKaiaiKey] = useState('')
  const [model, setModel] = useState(settings?.openaiModel ?? '')
  const existingDomain = settings?.kieAiCallbackUrl
    ? settings.kieAiCallbackUrl.replace(/\/api\/kie\/callback$/, '')
    : ''
  const [callbackDomain, setCallbackDomain] = useState(existingDomain)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const callbackDomainChanged = callbackDomain !== existingDomain
  const dirty = openaiKey.trim().length > 0 || kaiaiKey.trim().length > 0 || model !== (settings?.openaiModel ?? '') || callbackDomainChanged

  async function handleSave() {
    if (!dirty) return
    setSaving(true)
    try {
      const payload: Record<string, string | null> = {}
      if (openaiKey.trim()) payload.openaiApiKey = openaiKey.trim()
      if (kaiaiKey.trim()) payload.kaiAiApiKey = kaiaiKey.trim()
      if (model !== (settings?.openaiModel ?? '')) {
        payload.openaiModel = model.trim() || null
      }
      if (callbackDomainChanged) {
        const domain = callbackDomain.trim().replace(/\/+$/, '')
        payload.siteUrl = domain || null
      }
      await saveSettings(payload as any)
      setOpenaiKey('')
      setKaiaiKey('')
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="h-full shadow-sm">
      <CardHeader className="p-3 pb-2 bg-muted/5">
        <CardTitle className="text-sm font-semibold">{t.apiKeys}</CardTitle>
        <CardDescription className="text-[10px] line-clamp-1">
          {settings
            ? t.apiKeysDesc
                .replace('{openai}', settings.hasOpenaiKey ? t.present : t.missing)
                .replace('{kaiai}', settings.hasKaiAiKey ? t.present : t.missing)
            : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 space-y-3 text-xs">
        {settings ? (
          <>
            <div className="space-y-0.5">
              <div className="text-[10px] font-medium text-muted-foreground">
                OpenRouter API Key {settings.hasOpenaiKey && <span className="text-green-600">(tersimpan)</span>}
              </div>
              <Input
                className="h-7 text-xs"
                placeholder={settings.hasOpenaiKey ? '••••••••••••••••' : 'sk-or-...'}
                type="password"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
              />
            </div>
            <div className="space-y-0.5">
              <div className="text-[10px] font-medium text-muted-foreground">
                Model
              </div>
              <Input
                className="h-7 text-xs"
                placeholder="openai/gpt-4o-mini"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              />
              <div className="text-[10px] text-muted-foreground">
                Contoh: openai/gpt-4o-mini, anthropic/claude-3.5-sonnet, google/gemini-2.0-flash
              </div>
            </div>
            <div className="space-y-0.5">
              <div className="text-[10px] font-medium text-muted-foreground">
                kie.ai API Key {settings.hasKaiAiKey && <span className="text-green-600">(tersimpan)</span>}
              </div>
              <Input
                className="h-7 text-xs"
                placeholder={settings.hasKaiAiKey ? '••••••••••••••••' : t.setKaiai}
                type="password"
                value={kaiaiKey}
                onChange={(e) => setKaiaiKey(e.target.value)}
              />
            </div>
            <div className="space-y-0.5">
              <div className="text-[10px] font-medium text-muted-foreground">
                kie.ai Callback URL
              </div>
              <div className="flex items-center gap-0">
                <Input
                  className="h-7 text-xs rounded-r-none border-r-0"
                  placeholder="https://yourdomain.com"
                  value={callbackDomain}
                  onChange={(e) => setCallbackDomain(e.target.value)}
                />
                <div className="h-7 flex items-center px-2 bg-muted/50 border border-input rounded-r-md text-[10px] text-muted-foreground whitespace-nowrap">
                  /api/kie/callback
                </div>
              </div>
              {callbackDomain.trim() && (
                <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                  {callbackDomain.trim().replace(/\/+$/, '')}/api/kie/callback
                </div>
              )}
            </div>
            <Button
              size="sm"
              className="h-7 text-xs gap-1"
              disabled={saving || !dirty}
              onClick={handleSave}
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : saved ? <Check className="h-3 w-3" /> : <Save className="h-3 w-3" />}
              {saved ? 'Tersimpan' : 'Simpan'}
            </Button>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
