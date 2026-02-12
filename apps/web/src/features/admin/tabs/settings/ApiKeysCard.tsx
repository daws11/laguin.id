import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { Settings } from '@/features/admin/types'

interface Props {
  settings: Settings | null
  saveSettings: (
    partial: Partial<Settings> & { openaiApiKey?: string; kaiAiApiKey?: string; ycloudApiKey?: string },
  ) => Promise<Settings | null>
  t: any
}

export function ApiKeysCard({ settings, saveSettings, t }: Props) {
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
      <CardContent className="p-3 space-y-2 text-xs">
        {settings ? (
          <>
            <div className="space-y-0.5">
              <div className="text-[10px] font-medium text-muted-foreground">OpenAI API Key</div>
              <Input
                className="h-7 text-xs"
                placeholder={t.setOpenai}
                type="password"
                onBlur={(e) => {
                  const v = e.target.value.trim()
                  if (v) void saveSettings({ openaiApiKey: v })
                }}
              />
            </div>
            <div className="space-y-0.5">
              <div className="text-[10px] font-medium text-muted-foreground">kai.ai API Key</div>
              <Input
                className="h-7 text-xs"
                placeholder={t.setKaiai}
                type="password"
                onBlur={(e) => {
                  const v = e.target.value.trim()
                  if (v) void saveSettings({ kaiAiApiKey: v })
                }}
              />
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
