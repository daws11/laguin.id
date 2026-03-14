import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Check, Loader2 } from 'lucide-react'
import type { Settings } from '@/features/admin/types'

interface Props {
  settings: Settings | null
  saveSettings: (
    partial: Partial<Settings> & {
      s3Endpoint?: string | null
      s3Bucket?: string | null
      s3AccessKey?: string
      s3SecretKey?: string
      s3Region?: string | null
    },
  ) => Promise<Settings | null>
  loading: boolean
}

export function ObjectStorageCard({ settings, saveSettings, loading }: Props) {
  const [endpoint, setEndpoint] = useState(settings?.s3Endpoint ?? '')
  const [bucket, setBucket] = useState(settings?.s3Bucket ?? '')
  const [accessKey, setAccessKey] = useState('')
  const [secretKey, setSecretKey] = useState('')
  const [region, setRegion] = useState(settings?.s3Region ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const hasKeys = settings?.hasS3AccessKey && settings?.hasS3SecretKey
  const isConfigured = Boolean(settings?.s3Endpoint && settings?.s3Bucket && hasKeys)

  async function handleSave() {
    setSaving(true)
    const payload: Record<string, unknown> = {
      s3Endpoint: endpoint.trim() || null,
      s3Bucket: bucket.trim() || null,
      s3Region: region.trim() || null,
    }
    if (accessKey.trim()) payload.s3AccessKey = accessKey.trim()
    if (secretKey.trim()) payload.s3SecretKey = secretKey.trim()

    await saveSettings(payload as any)
    setAccessKey('')
    setSecretKey('')
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const hasChanges =
    endpoint !== (settings?.s3Endpoint ?? '') ||
    bucket !== (settings?.s3Bucket ?? '') ||
    region !== (settings?.s3Region ?? '') ||
    accessKey.trim() !== '' ||
    secretKey.trim() !== ''

  return (
    <Card className="h-full shadow-sm">
      <CardHeader className="p-3 pb-2 bg-muted/5">
        <CardTitle className="text-sm font-semibold">Object Storage (S3-compatible)</CardTitle>
        <CardDescription className="text-[10px] line-clamp-2">
          {isConfigured
            ? 'Storage is configured and active. Update any field to change.'
            : 'Configure S3-compatible storage (Cloudflare R2, AWS S3, MinIO, etc.) for file uploads.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 space-y-3 text-xs">
        {settings ? (
          <>
            {isConfigured && (
              <div className="flex items-center gap-1.5 text-[10px] text-green-600 bg-green-50 px-2 py-1.5 rounded border border-green-200">
                <Check className="h-3 w-3" />
                <span className="font-medium">Storage active</span>
              </div>
            )}

            <div className="space-y-0.5">
              <div className="text-[10px] font-medium text-muted-foreground">
                Endpoint URL
              </div>
              <Input
                className="h-7 text-xs font-mono"
                placeholder="https://abc123.r2.cloudflarestorage.com"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">
                For Cloudflare R2: <code className="bg-muted px-1 rounded">https://&lt;account_id&gt;.r2.cloudflarestorage.com</code>
              </p>
            </div>

            <div className="space-y-0.5">
              <div className="text-[10px] font-medium text-muted-foreground">
                Bucket Name
              </div>
              <Input
                className="h-7 text-xs"
                placeholder="my-bucket"
                value={bucket}
                onChange={(e) => setBucket(e.target.value)}
              />
            </div>

            <div className="space-y-0.5">
              <div className="text-[10px] font-medium text-muted-foreground">
                Access Key ID {settings.hasS3AccessKey && <span className="text-green-600">(tersimpan)</span>}
              </div>
              <Input
                className="h-7 text-xs"
                placeholder={settings.hasS3AccessKey ? '••••••••••••••••' : 'Access Key ID'}
                type="password"
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
              />
            </div>

            <div className="space-y-0.5">
              <div className="text-[10px] font-medium text-muted-foreground">
                Secret Access Key {settings.hasS3SecretKey && <span className="text-green-600">(tersimpan)</span>}
              </div>
              <Input
                className="h-7 text-xs"
                placeholder={settings.hasS3SecretKey ? '••••••••••••••••' : 'Secret Access Key'}
                type="password"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
              />
            </div>

            <div className="space-y-0.5">
              <div className="text-[10px] font-medium text-muted-foreground">
                Region <span className="text-muted-foreground/60">(optional)</span>
              </div>
              <Input
                className="h-7 text-xs"
                placeholder="auto"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">
                For Cloudflare R2, use <code className="bg-muted px-1 rounded">auto</code>. For AWS S3, use region like <code className="bg-muted px-1 rounded">ap-southeast-1</code>.
              </p>
            </div>

            <Button
              size="sm"
              className="h-7 text-xs"
              disabled={saving || loading || !hasChanges}
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
