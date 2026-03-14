import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Settings } from '@/features/admin/types'
import { adminFetchYCloudTemplates, adminGetWhatsAppLogs, adminGetWhatsAppScheduled, type YCloudTemplate, type WhatsAppLogItem, type WhatsAppScheduledItem } from '@/features/admin/api'

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

type TabKey = 'connection' | 'delivery' | 'reminders' | 'logs'

export function WhatsappGatewayCard({ settings, setSettings, saveSettings, loading, t, token }: Props) {
  const [copied, setCopied] = useState(false)
  const [templates, setTemplates] = useState<YCloudTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [templatesFetched, setTemplatesFetched] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('connection')

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

  function handleTemplateSelect(compositeKey: string) {
    const [name, lang] = compositeKey.split('|')
    const tpl = templates.find((t) => t.name === name && t.language === lang)
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

  function handleReminderTemplateSelect(index: number, compositeKey: string) {
    const [name, lang] = compositeKey.split('|')
    const tpl = templates.find((t) => t.name === name && t.language === lang)
    if (!tpl || !settings) return
    const reminders = [...(settings.reminderTemplates ?? [])]
    reminders[index] = {
      ...reminders[index],
      templateName: tpl.name,
      templateLangCode: tpl.language,
    }
    setSettings((s) => (s ? { ...s, reminderTemplates: reminders } : s))
  }

  function addReminder() {
    if (!settings) return
    const reminders = [...(settings.reminderTemplates ?? [])]
    reminders.push({ label: '', delayMinutes: 60, templateName: '', templateLangCode: '' })
    setSettings((s) => (s ? { ...s, reminderTemplates: reminders } : s))
  }

  function removeReminder(index: number) {
    if (!settings) return
    const reminders = [...(settings.reminderTemplates ?? [])]
    reminders.splice(index, 1)
    setSettings((s) => (s ? { ...s, reminderTemplates: reminders } : s))
  }

  function updateReminder(index: number, field: string, value: string | number) {
    if (!settings) return
    const reminders = [...(settings.reminderTemplates ?? [])]
    reminders[index] = { ...reminders[index], [field]: value }
    setSettings((s) => (s ? { ...s, reminderTemplates: reminders } : s))
  }

  const [logItems, setLogItems] = useState<WhatsAppLogItem[]>([])
  const [logTotal, setLogTotal] = useState(0)
  const [logPage, setLogPage] = useState(1)
  const [logTypeFilter, setLogTypeFilter] = useState<string>('')
  const [logLoading, setLogLoading] = useState(false)
  const [scheduledItems, setScheduledItems] = useState<WhatsAppScheduledItem[]>([])
  const [scheduledLoading, setScheduledLoading] = useState(false)

  const fetchLogs = useCallback(async (page: number, typeFilter: string) => {
    if (!token) return
    setLogLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('pageSize', '15')
      if (typeFilter) params.set('type', typeFilter)
      const res = await adminGetWhatsAppLogs(token, params)
      if (res) {
        setLogItems(res.items)
        setLogTotal(res.total)
      }
    } catch {
    } finally {
      setLogLoading(false)
    }
  }, [token])

  const fetchScheduled = useCallback(async () => {
    if (!token) return
    setScheduledLoading(true)
    try {
      const res = await adminGetWhatsAppScheduled(token)
      if (res) {
        setScheduledItems(res.scheduled)
      }
    } catch {
    } finally {
      setScheduledLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (activeTab === 'logs') {
      void fetchLogs(logPage, logTypeFilter)
      void fetchScheduled()
    }
  }, [activeTab, logPage, logTypeFilter, fetchLogs, fetchScheduled])

  function maskPhone(phone: string): string {
    if (!phone || phone.length <= 4) return phone
    return '•'.repeat(phone.length - 4) + phone.slice(-4)
  }

  const hasButton = settings?.ycloudTemplateHasButton

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'connection', label: 'Connection' },
    { key: 'delivery', label: 'Delivery' },
    { key: 'reminders', label: 'Reminders' },
    { key: 'logs', label: 'Logs' },
  ]

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
              <>
                <div className="flex border-b">
                  {tabs.map((tab) => (
                    <button
                      key={tab.key}
                      className={`px-3 py-1.5 text-[10px] font-medium border-b-2 transition-colors ${
                        activeTab === tab.key
                          ? 'border-primary text-primary'
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                      onClick={() => setActiveTab(tab.key)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {activeTab === 'connection' && (
                  <div className="space-y-1.5 pt-1.5">
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

                    <div className="border-t pt-1.5 space-y-1.5">
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

                {activeTab === 'delivery' && (
                  <div className="space-y-1.5 pt-1.5">
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
                          value={settings.ycloudTemplateName && settings.ycloudTemplateLangCode ? `${settings.ycloudTemplateName}|${settings.ycloudTemplateLangCode}` : ''}
                          onChange={(e) => handleTemplateSelect(e.target.value)}
                        >
                          <option value="">-- Pilih template --</option>
                          {templates.map((tpl) => (
                            <option key={`${tpl.name}|${tpl.language}`} value={`${tpl.name}|${tpl.language}`}>
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
                      <>
                        <div className="text-[10px] text-muted-foreground bg-blue-50 border border-blue-200 rounded px-2 py-1.5">
                          Mode button reply: template dikirim tanpa variabel. Link dikirim otomatis saat pelanggan menekan tombol via webhook.
                        </div>

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
                  </div>
                )}

                {activeTab === 'reminders' && (
                  <div className="space-y-2 pt-1.5">
                    <div className="text-[10px] text-muted-foreground">
                      Configure interval reminders sent via YCloud templates to unconverted drafts after WhatsApp number capture.
                    </div>

                    {!templatesFetched && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-[10px]"
                        disabled={loadingTemplates || !settings.hasYcloudKey}
                        onClick={() => void fetchTemplates()}
                      >
                        {loadingTemplates ? 'Mengambil…' : 'Fetch Templates'}
                      </Button>
                    )}

                    {(settings.reminderTemplates ?? []).map((reminder, idx) => (
                      <div key={idx} className="border rounded p-2 space-y-1.5 bg-muted/10">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-medium">Reminder #{idx + 1}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 px-1 text-[10px] text-destructive hover:text-destructive"
                            onClick={() => removeReminder(idx)}
                          >
                            Remove
                          </Button>
                        </div>

                        <Input
                          className="h-7 text-xs"
                          placeholder="Label (e.g. Follow-up 1hr)"
                          value={reminder.label}
                          onChange={(e) => updateReminder(idx, 'label', e.target.value)}
                        />

                        <div className="flex gap-1.5 items-center">
                          <span className="text-[10px] text-muted-foreground shrink-0">Delay (min):</span>
                          <Input
                            className="h-7 text-xs w-24"
                            type="number"
                            min={1}
                            value={reminder.delayMinutes}
                            onChange={(e) => updateReminder(idx, 'delayMinutes', parseInt(e.target.value) || 1)}
                          />
                        </div>

                        {templates.length > 0 ? (
                          <select
                            className="w-full rounded border bg-background px-2 py-1 text-xs h-7 focus:outline-none focus:ring-1 focus:ring-ring"
                            value={reminder.templateName && reminder.templateLangCode ? `${reminder.templateName}|${reminder.templateLangCode}` : ''}
                            onChange={(e) => handleReminderTemplateSelect(idx, e.target.value)}
                          >
                            <option value="">-- Pilih template --</option>
                            {templates.map((tpl) => (
                              <option key={`${tpl.name}|${tpl.language}`} value={`${tpl.name}|${tpl.language}`}>
                                {tpl.name} ({tpl.language}) — {tpl.status}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <>
                            <Input
                              className="h-7 text-xs"
                              placeholder="Template name"
                              value={reminder.templateName}
                              onChange={(e) => updateReminder(idx, 'templateName', e.target.value)}
                            />
                            <Input
                              className="h-7 text-xs"
                              placeholder="Language code (e.g. id)"
                              value={reminder.templateLangCode}
                              onChange={(e) => updateReminder(idx, 'templateLangCode', e.target.value)}
                            />
                          </>
                        )}

                        {reminder.templateName && (
                          <div className="text-[10px] text-muted-foreground">
                            Template: <span className="font-medium">{reminder.templateName}</span> ({reminder.templateLangCode})
                          </div>
                        )}
                      </div>
                    ))}

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-7 text-[10px]"
                      onClick={addReminder}
                    >
                      + Add Reminder
                    </Button>
                  </div>
                )}

                {activeTab === 'logs' && (
                  <div className="space-y-3 pt-1.5">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-medium">Activity Log</span>
                        <div className="flex items-center gap-1.5">
                          <select
                            className="rounded border bg-background px-1.5 py-0.5 text-[10px] h-6 focus:outline-none focus:ring-1 focus:ring-ring"
                            value={logTypeFilter}
                            onChange={(e) => { setLogTypeFilter(e.target.value); setLogPage(1) }}
                          >
                            <option value="">All types</option>
                            <option value="delivery_sent">Delivery Sent</option>
                            <option value="delivery_failed">Delivery Failed</option>
                            <option value="reminder_sent">Reminder Sent</option>
                            <option value="reminder_failed">Reminder Failed</option>
                          </select>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-[10px]"
                            disabled={logLoading}
                            onClick={() => { void fetchLogs(logPage, logTypeFilter); void fetchScheduled() }}
                          >
                            {logLoading ? 'Loading…' : 'Refresh'}
                          </Button>
                        </div>
                      </div>

                      {logItems.length === 0 && !logLoading && (
                        <div className="text-[10px] text-muted-foreground py-2 text-center">No log entries found.</div>
                      )}

                      {logItems.length > 0 && (
                        <div className="border rounded overflow-hidden">
                          <table className="w-full text-[10px]">
                            <thead>
                              <tr className="bg-muted/30 border-b">
                                <th className="px-1.5 py-1 text-left font-medium">Time</th>
                                <th className="px-1.5 py-1 text-left font-medium">Type</th>
                                <th className="px-1.5 py-1 text-left font-medium">Phone</th>
                                <th className="px-1.5 py-1 text-left font-medium">Template</th>
                                <th className="px-1.5 py-1 text-left font-medium">Status</th>
                                <th className="px-1.5 py-1 text-left font-medium">Order</th>
                              </tr>
                            </thead>
                            <tbody>
                              {logItems.map((log) => (
                                <tr key={log.id} className="border-b last:border-b-0 hover:bg-muted/10">
                                  <td className="px-1.5 py-1 whitespace-nowrap">
                                    {new Date(log.createdAt).toLocaleString()}
                                  </td>
                                  <td className="px-1.5 py-1">
                                    <span className={`inline-block px-1 py-0.5 rounded text-[9px] font-medium ${
                                      log.type.startsWith('delivery') ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                                    }`}>
                                      {log.type.startsWith('delivery') ? 'Delivery' : 'Reminder'}
                                    </span>
                                  </td>
                                  <td className="px-1.5 py-1 font-mono">{maskPhone(log.phone)}</td>
                                  <td className="px-1.5 py-1 truncate max-w-[100px]" title={log.templateName}>
                                    {log.templateName}
                                  </td>
                                  <td className="px-1.5 py-1">
                                    <span className={`inline-block px-1 py-0.5 rounded text-[9px] font-medium ${
                                      log.status === 'Sent' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                    }`}>
                                      {log.status}
                                    </span>
                                    {log.error && (
                                      <span className="block text-[9px] text-destructive truncate max-w-[120px]" title={log.error}>
                                        {log.error}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-1.5 py-1">
                                    {log.orderId ? (
                                      <a
                                        href={`/admin?tab=orders&orderId=${encodeURIComponent(log.orderId)}`}
                                        className="font-mono text-[9px] text-blue-600 underline hover:text-blue-800"
                                        title={log.orderId}
                                      >
                                        {log.orderId.slice(0, 8)}…
                                      </a>
                                    ) : log.draftId ? (
                                      <span className="font-mono text-[9px] text-muted-foreground" title={`Draft: ${log.draftId}`}>
                                        draft
                                      </span>
                                    ) : '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {logTotal > 15 && (
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] text-muted-foreground">
                            Page {logPage} of {Math.ceil(logTotal / 15)} ({logTotal} total)
                          </span>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 px-2 text-[10px]"
                              disabled={logPage <= 1}
                              onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                            >
                              Prev
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 px-2 text-[10px]"
                              disabled={logPage >= Math.ceil(logTotal / 15)}
                              onClick={() => setLogPage((p) => p + 1)}
                            >
                              Next
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="border-t pt-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-medium">Scheduled Reminders</span>
                        {scheduledLoading && <span className="text-[10px] text-muted-foreground">Loading…</span>}
                      </div>

                      {scheduledItems.length === 0 && !scheduledLoading && (
                        <div className="text-[10px] text-muted-foreground py-2 text-center">No pending reminders.</div>
                      )}

                      {scheduledItems.length > 0 && (
                        <div className="space-y-1">
                          {scheduledItems.map((item, idx) => {
                            const isPast = new Date(item.estimatedSendTime).getTime() <= Date.now()
                            return (
                              <div key={idx} className="flex items-center justify-between border rounded px-2 py-1 bg-muted/10">
                                <div>
                                  <span className="font-mono text-[10px]">{maskPhone(item.phone)}</span>
                                  <span className="text-[10px] text-muted-foreground ml-1.5">{item.reminderLabel}</span>
                                </div>
                                <span className={`text-[10px] ${isPast ? 'text-orange-600 font-medium' : 'text-muted-foreground'}`}>
                                  {isPast ? 'Due now' : new Date(item.estimatedSendTime).toLocaleString()}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
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
                  reminderTemplates: settings.reminderTemplates ?? [],
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
