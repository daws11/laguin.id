import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Check, Loader2, ListRestart } from 'lucide-react'
import type { Settings } from '@/features/admin/types'
import { apiGet } from '@/lib/http'
import { format } from 'date-fns'

interface Props {
  settings: Settings | null
  saveSettings: (
    partial: Partial<Settings> & { xenditSecretKey?: string; xenditWebhookToken?: string | null },
  ) => Promise<Settings | null>
  loading: boolean
}

export function XenditCard({ settings, saveSettings, loading }: Props) {
  const [secretKey, setSecretKey] = useState('')
  const [webhookToken, setWebhookToken] = useState(settings?.xenditWebhookToken ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [logs, setLogs] = useState<any[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)

  const fetchLogs = async () => {
    setLoadingLogs(true)
    try {
      const res = await apiGet<{ logs: any[] }>('/api/admin/xendit/webhook-logs')
      setLogs(res.logs)
    } catch (e) {
      console.error('Failed to fetch logs', e)
    } finally {
      setLoadingLogs(false)
    }
  }

  useEffect(() => {
    if (settings) {
      fetchLogs()
    }
  }, [settings])

  async function handleSave() {
    setSaving(true)
    const payload: Record<string, unknown> = {}
    if (secretKey.trim()) payload.xenditSecretKey = secretKey.trim()
    payload.xenditWebhookToken = webhookToken.trim() || null
    await saveSettings(payload as any)
    setSecretKey('')
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <Card className="h-full shadow-sm">
      <CardHeader className="p-3 pb-2 bg-muted/5">
        <CardTitle className="text-sm font-semibold">Xendit Payment Gateway</CardTitle>
        <CardDescription className="text-[10px] line-clamp-2">
          {settings?.hasXenditKey
            ? 'Secret key sudah tersimpan. Masukkan key baru untuk mengganti.'
            : 'Masukkan Xendit Secret Key untuk mengaktifkan pembayaran otomatis.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 space-y-3 text-xs">
        {settings ? (
          <>
            <div className="space-y-0.5">
              <div className="text-[10px] font-medium text-muted-foreground">
                Secret Key {settings.hasXenditKey && <span className="text-green-600">(tersimpan)</span>}
              </div>
              <Input
                className="h-7 text-xs"
                placeholder={settings.hasXenditKey ? '••••••••••••••••' : 'xnd_production_...'}
                type="password"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
              />
            </div>
            <div className="space-y-0.5">
              <div className="text-[10px] font-medium text-muted-foreground">Webhook Verification Token</div>
              <Input
                className="h-7 text-xs"
                placeholder="Token dari dashboard Xendit (opsional)"
                value={webhookToken}
                onChange={(e) => setWebhookToken(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                URL Callback untuk diatur di dashboard Xendit:<br />
                <code className="bg-muted px-1 rounded select-all font-mono">https://{window.location.host}/api/xendit/callback</code>
                <br />
                Bisa ditemukan di Xendit Dashboard → Settings → Callbacks
              </p>
            </div>
            <Button
              size="sm"
              className="h-7 text-xs"
              disabled={saving || loading || (!secretKey.trim() && webhookToken === (settings.xenditWebhookToken ?? ''))}
              onClick={handleSave}
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : saved ? <Check className="h-3 w-3 mr-1" /> : null}
              {saved ? 'Tersimpan' : 'Simpan'}
            </Button>

            <div className="pt-4 border-t space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Recent Webhook Logs</div>
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={fetchLogs} disabled={loadingLogs}>
                  <ListRestart className={cn("h-3 w-3", loadingLogs && "animate-spin")} />
                </Button>
              </div>
              
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                {logs.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground italic py-2 text-center">No logs yet.</p>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="text-[10px] p-1.5 rounded bg-muted/30 border border-muted flex flex-col gap-0.5">
                      <div className="flex justify-between items-center">
                        <span className={cn(
                          "font-bold uppercase px-1 rounded",
                          log.status === 'PAID' ? "text-green-600 bg-green-50" : 
                          log.status === 'EXPIRED' ? "text-red-600 bg-red-50" : "text-blue-600 bg-blue-50"
                        )}>
                          {log.status || 'WEBHOOK'}
                        </span>
                        <span className="text-muted-foreground">{format(new Date(log.receivedAt), 'HH:mm:ss')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-700 truncate max-w-[120px]">
                          {log.order?.customer?.name || log.orderId || 'Unknown'}
                        </span>
                        {log.amount && <span className="font-bold">Rp {log.amount.toLocaleString()}</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ')
}
