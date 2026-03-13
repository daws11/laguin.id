import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Settings } from '@/features/admin/types'
import { adminFetchYCloudTemplates, type YCloudTemplate } from '@/features/admin/api'

interface Props {
  settings: Settings | null
  setSettings: React.Dispatch<React.SetStateAction<Settings | null>>
  saveSettings: (
    partial: Partial<Settings> & {
      openaiApiKey?: string
      kaiAiApiKey?: string
      ycloudApiKey?: string
      ycloudWebhookSecret?: string
      ycloudLinkMessage?: string | null
    },
  ) => Promise<Settings | null>
  loading: boolean
  t: any
  token: string | null
}

export function WhatsappGatewayCard({ settings, setSettings, saveSettings, loading, t, token }: Props) {
  const [copied, setCopied] = useState(false)
  const [templates, setTemplates] = useState<YCloudTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [templatesFetched, setTemplatesFetched] = useState(false)

  function copyWebhookUrl() {
    const url = settings?.ycloudWebhookUrl
    if (!url) return
    const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`
    void navigator.clipboard.writeText(fullUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  async function fetchTemplates() {
    if (!token) return
    setLoadingTemplates(true)
    setFetchError(null)
    try {
      const res = await adminFetchYCloudTemplates(token)
      if (res && 'templates' in res) {
        setTemplates(res.templates)
        setTemplatesFetched(true)
      } else {
        setFetchError('Gagal mengambil template.')
      }
    } catch (err: any) {
      setFetchError(err?.message ?? 'Gagal mengambil template.')
    } finally {
      setLoadingTemplates(false)
    }
  }

  function handleTemplateSelect(name: string) {
    const tpl = templates.find((t) => t.name === name)
    if (!tpl) return
    setSettings((s) =>
      s
        ? {
            ...s,
            ycloudTemplateName: tpl.name,
            ycloudTemplateLangCode: tpl.language,
            ycloudTemplateHasButton: tpl.hasButton,
          }
        : s,
    )
  }

  const hasButton = settings?.ycloudTemplateHasButton

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

                <Input
                  className="h-7 text-xs"
                  placeholder={t.ycloudFrom}
                  value={settings.ycloudFrom ?? ''}
                  onChange={(e) => setSettings((s) => (s ? { ...s, ycloudFrom: e.target.value } : s))}
                />

                {/* Template Selection */}
                <div className="border-t pt-1.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-medium text-muted-foreground">Template WA</div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-[10px]"
                      disabled={loadingTemplates || !settings.hasYcloudKey}
                      onClick={() => void fetchTemplates()}
                    >
                      {loadingTemplates ? 'Mengambil…' : templatesFetched ? 'Refresh' : 'Fetch Templates'}
                    </Button>
                  </div>

                  {fetchError && (
                    <div className="text-[10px] text-destructive bg-destructive/10 rounded px-2 py-1">{fetchError}</div>
                  )}

                  {templatesFetched && templates.length === 0 && (
                    <div className="text-[10px] text-muted-foreground">Tidak ada template ditemukan.</div>
                  )}

                  {templates.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[10px] text-muted-foreground">Pilih template (auto-detect button):</div>
                      <select
                        className="w-full rounded border bg-background px-2 py-1 text-xs h-7 focus:outline-none focus:ring-1 focus:ring-ring"
                        value={settings.ycloudTemplateName ?? ''}
                        onChange={(e) => handleTemplateSelect(e.target.value)}
                      >
                        <option value="">-- Pilih template --</option>
                        {templates.map((tpl) => (
                          <option key={`${tpl.name}-${tpl.language}`} value={tpl.name}>
                            {tpl.name} ({tpl.language}) — {tpl.status}
                            {tpl.hasButton ? ' 🔘' : ''}
                          </option>
                        ))}
                      </select>
                      {settings.ycloudTemplateName && (() => {
                        const sel = templates.find((t) => t.name === settings.ycloudTemplateName)
                        return sel ? (
                          <div className="text-[10px] text-muted-foreground bg-muted/30 rounded px-2 py-1">
                            {sel.hasButton ? (
                              <>
                                <span className="text-blue-600 font-medium">Button template</span>
                                {sel.buttons.length > 0 && (
                                  <> — tombol: {sel.buttons.map((b) => `"${b.text}"`).join(', ')}</>
                                )}
                              </>
                            ) : (
                              <>
                                <span className="text-orange-600 font-medium">Direct-link template</span>
                                {sel.bodyText && (
                                  <div className="mt-0.5 text-[9px] text-muted-foreground/70 truncate">{sel.bodyText}</div>
                                )}
                              </>
                            )}
                          </div>
                        ) : null
                      })()}
                    </div>
                  )}

                  {/* Manual name/lang inputs (always shown as fallback) */}
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

                  {/* Has-button checkbox */}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="accent-primary w-3 h-3"
                      checked={hasButton === true}
                      onChange={(e) =>
                        setSettings((s) => (s ? { ...s, ycloudTemplateHasButton: e.target.checked } : s))
                      }
                    />
                    <span className="text-[10px]">
                      Template punya tombol (kirim link via webhook reply)
                    </span>
                  </label>

                  {hasButton === false && (
                    <div className="text-[10px] text-muted-foreground bg-orange-50 border border-orange-200 rounded px-2 py-1.5">
                      Mode direct-link: link pengiriman akan dikirim sebagai variabel <code className="bg-muted px-0.5 rounded">{'{1}'}</code> di body template.
                    </div>
                  )}

                  {hasButton === true && (
                    <div className="text-[10px] text-muted-foreground bg-blue-50 border border-blue-200 rounded px-2 py-1.5">
                      Mode button reply: template dikirim tanpa variabel. Link dikirim otomatis saat pelanggan menekan tombol via webhook.
                    </div>
                  )}
                </div>

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

                  {/* Link Reply Message — only shown when templateHasButton=true */}
                  {hasButton === true && (
                    <>
                      <div className="text-[10px] font-medium text-muted-foreground pt-1">
                        Pesan Balasan Link
                        <span className="ml-1 font-normal text-muted-foreground/70">
                          Gunakan <code className="bg-muted px-0.5 rounded">{'{link}'}</code> dan{' '}
                          <code className="bg-muted px-0.5 rounded">{'{name}'}</code>.
                        </span>
                      </div>
                      <textarea
                        className="w-full rounded border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                        rows={5}
                        placeholder={`Silakan klik tautan di bawah ini untuk mengakses hasilnya:\n🔗  {link}\n\nSelamat menikmati karya spesial ini! ✨`}
                        value={settings.ycloudLinkMessage ?? ''}
                        onChange={(e) => setSettings((s) => (s ? { ...s, ycloudLinkMessage: e.target.value } : s))}
                      />
                    </>
                  )}

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
                        <div className="text-[10px] text-green-600">
                          Token webhook sudah disertakan dalam URL di atas.
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
                  ycloudTemplateHasButton: settings.ycloudTemplateHasButton,
                  siteUrl: settings.siteUrl ?? undefined,
                  ycloudLinkMessage: settings.ycloudLinkMessage ?? null,
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
