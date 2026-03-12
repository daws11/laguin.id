import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Settings } from '@/features/admin/types'

interface Props {
  settings: Settings | null
  setSettings: React.Dispatch<React.SetStateAction<Settings | null>>
  saveSettings: (
    partial: Partial<Settings> & {
      openaiApiKey?: string
      kaiAiApiKey?: string
      ycloudApiKey?: string
      ycloudWebhookSecret?: string
    },
  ) => Promise<Settings | null>
  loading: boolean
  t: any
}

export function WhatsappGatewayCard({ settings, setSettings, saveSettings, loading, t }: Props) {
  const [copied, setCopied] = useState(false)

  function copyWebhookUrl() {
    const url = settings?.ycloudWebhookUrl
    if (!url) return
    const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`
    void navigator.clipboard.writeText(fullUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <Card className="h-full shadow-sm">
      <CardHeader className="p-3 pb-2 bg-muted/5">
        <CardTitle className="text-sm font-semibold">{t.whatsappGateway}</CardTitle>
        <CardDescription className="text-[10px] line-clamp-1">{t.whatsappGatewayDesc}</CardDescription>
      </CardHeader>
      <CardContent className="p-3 space-y-2 text-xs">
        {settings ? (
          <>
            <div className="space-y-0.5">
              <div className="text-[10px] font-medium text-muted-foreground">{t.provider}</div>
              <select
                className="w-full rounded border bg-background px-2 py-1 text-xs h-7 focus:outline-none focus:ring-1 focus:ring-ring"
                value={settings.whatsappProvider}
                onChange={(e) => setSettings((s) => (s ? { ...s, whatsappProvider: e.target.value } : s))}
              >
                <option value="mock">mock</option>
                <option value="ycloud">ycloud</option>
              </select>
            </div>

            {settings.whatsappProvider === 'ycloud' && (
              <div className="space-y-1.5 pt-1.5 border-t">
                {/* API Key */}
                <div className="text-[10px] text-muted-foreground">
                  {t.ycloudKeyStatus.replace('{status}', settings.hasYcloudKey ? t.present : t.missing)}
                </div>
                <Input
                  className="h-7 text-xs"
                  placeholder={t.ycloudFrom}
                  value={settings.ycloudFrom ?? ''}
                  onChange={(e) => setSettings((s) => (s ? { ...s, ycloudFrom: e.target.value } : s))}
                />
                <Input
                  className="h-7 text-xs"
                  placeholder={t.ycloudTemplateName}
                  value={settings.ycloudTemplateName ?? ''}
                  onChange={(e) =>
                    setSettings((s) => (s ? { ...s, ycloudTemplateName: e.target.value } : s))
                  }
                />
                <Input
                  className="h-7 text-xs"
                  placeholder={t.ycloudTemplateLang}
                  value={settings.ycloudTemplateLangCode ?? ''}
                  onChange={(e) =>
                    setSettings((s) => (s ? { ...s, ycloudTemplateLangCode: e.target.value } : s))
                  }
                />
                <div className="text-[10px] font-medium text-muted-foreground">
                  API Key {settings.hasYcloudKey && <span className="text-green-600">(tersimpan)</span>}
                </div>
                <Input
                  className="h-7 text-xs"
                  placeholder={settings.hasYcloudKey ? '••••••••••••••••' : t.ycloudApiKey}
                  type="password"
                  onBlur={(e) => {
                    const v = e.target.value.trim()
                    if (v) void saveSettings({ ycloudApiKey: v })
                  }}
                />

                {/* Separator */}
                <div className="border-t pt-1.5 space-y-1.5">
                  {/* Site URL */}
                  <div className="text-[10px] font-medium text-muted-foreground">
                    {t.siteUrlLabel}
                    <span className="ml-1 font-normal text-muted-foreground/70">{t.siteUrlHelp}</span>
                  </div>
                  <Input
                    className="h-7 text-xs"
                    placeholder={t.siteUrlPlaceholder}
                    value={settings.siteUrl ?? ''}
                    onChange={(e) => setSettings((s) => (s ? { ...s, siteUrl: e.target.value } : s))}
                  />

                  {/* Webhook Secret */}
                  <div className="text-[10px] font-medium text-muted-foreground">
                    {t.ycloudWebhookSecretLabel}{' '}
                    {settings.hasYcloudWebhookSecret && (
                      <span className="text-green-600">(tersimpan)</span>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {t.ycloudWebhookSecretStatus.replace(
                      '{status}',
                      settings.hasYcloudWebhookSecret ? t.present : t.missing,
                    )}
                  </div>
                  <Input
                    className="h-7 text-xs"
                    placeholder={
                      settings.hasYcloudWebhookSecret
                        ? '••••••••••••••••'
                        : t.ycloudWebhookSecretPlaceholder
                    }
                    type="password"
                    onBlur={(e) => {
                      const v = e.target.value.trim()
                      if (v) void saveSettings({ ycloudWebhookSecret: v })
                    }}
                  />

                  {/* Webhook URL */}
                  {settings.ycloudWebhookUrl && (
                    <>
                      <div className="text-[10px] font-medium text-muted-foreground">
                        {t.ycloudWebhookUrlLabel}
                      </div>
                      <div className="flex items-center gap-1">
                        <Input
                          className="h-7 text-xs font-mono bg-muted/30"
                          readOnly
                          value={
                            settings.ycloudWebhookUrl.startsWith('http')
                              ? settings.ycloudWebhookUrl
                              : `${window.location.origin}${settings.ycloudWebhookUrl}`
                          }
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-[10px] shrink-0"
                          onClick={copyWebhookUrl}
                        >
                          {copied ? t.copied : 'Copy'}
                        </Button>
                      </div>
                      {settings.hasYcloudWebhookSecret && (
                        <div className="text-[10px] text-muted-foreground">
                          Tambahkan{' '}
                          <code className="bg-muted px-0.5 rounded">?token=&#x3C;webhook_secret&#x3E;</code>{' '}
                          ke URL di atas saat mengonfigurasi di YCloud.
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            <Button
              className="w-full h-7 text-xs mt-1"
              disabled={loading}
              onClick={() =>
                void saveSettings({
                  whatsappProvider: settings.whatsappProvider,
                  ycloudFrom: settings.ycloudFrom ?? undefined,
                  ycloudTemplateName: settings.ycloudTemplateName ?? undefined,
                  ycloudTemplateLangCode: settings.ycloudTemplateLangCode ?? undefined,
                  siteUrl: settings.siteUrl ?? undefined,
                })
              }
            >
              {t.updateSettings}
            </Button>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
