import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Check, Loader2 } from 'lucide-react'
import type { Settings } from '@/features/admin/types'

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
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
