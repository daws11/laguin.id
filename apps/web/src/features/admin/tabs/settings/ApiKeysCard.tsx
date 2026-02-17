import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Save, Check, Loader2 } from 'lucide-react'
import type { Settings } from '@/features/admin/types'

interface Props {
  settings: Settings | null
  saveSettings: (
    partial: Partial<Settings> & { openaiApiKey?: string; kaiAiApiKey?: string; ycloudApiKey?: string },
  ) => Promise<Settings | null>
  t: any
}

export function ApiKeysCard({ settings, saveSettings, t }: Props) {
  const [openaiKey, setOpenaiKey] = useState('')
  const [kaiaiKey, setKaiaiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const dirty = openaiKey.trim().length > 0 || kaiaiKey.trim().length > 0

  async function handleSave() {
    if (!dirty) return
    setSaving(true)
    try {
      const payload: Record<string, string> = {}
      if (openaiKey.trim()) payload.openaiApiKey = openaiKey.trim()
      if (kaiaiKey.trim()) payload.kaiAiApiKey = kaiaiKey.trim()
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
                OpenAI API Key {settings.hasOpenaiKey && <span className="text-green-600">(tersimpan)</span>}
              </div>
              <Input
                className="h-7 text-xs"
                placeholder={settings.hasOpenaiKey ? '••••••••••••••••' : t.setOpenai}
                type="password"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
              />
            </div>
            <div className="space-y-0.5">
              <div className="text-[10px] font-medium text-muted-foreground">
                kai.ai API Key {settings.hasKaiAiKey && <span className="text-green-600">(tersimpan)</span>}
              </div>
              <Input
                className="h-7 text-xs"
                placeholder={settings.hasKaiAiKey ? '••••••••••••••••' : t.setKaiai}
                type="password"
                value={kaiaiKey}
                onChange={(e) => setKaiaiKey(e.target.value)}
              />
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
