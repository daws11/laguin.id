import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Save, Upload, X, Image as ImageIcon } from 'lucide-react'
import { adminUpload } from '@/features/admin/api'
import type { Settings } from '@/features/admin/types'

interface DeliveryPageCardProps {
  settings: Settings
  saveSettings: (partial: Partial<Settings>) => Promise<Settings | null>
  loading: boolean
  token: string | null
}

type DeliveryPageConfig = {
  pageTitle?: string
  headerText?: string
  phonePromptText?: string
  processingMessage?: string
  downloadButtonText?: string
  lyricsButtonText?: string
  successMessage?: string
  accentColor?: string
  logoUrl?: string
  trackSubtitleText?: string
}

export function DeliveryPageCard({ settings, saveSettings, loading, token }: DeliveryPageCardProps) {
  const psc = (settings.publicSiteConfig && typeof settings.publicSiteConfig === 'object' ? settings.publicSiteConfig : {}) as Record<string, any>
  const saved: DeliveryPageConfig = psc.deliveryPage ?? {}

  const [form, setForm] = useState<DeliveryPageConfig>({ ...saved })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSave = async () => {
    setSaving(true)
    try {
      const updatedPsc = { ...psc, deliveryPage: form }
      await saveSettings({ publicSiteConfig: updatedPsc } as any)
    } finally {
      setSaving(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !token) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const result = await adminUpload(token, 'image', fd)
      if (result?.path) {
        setForm(prev => ({ ...prev, logoUrl: result.path }))
      }
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const fields: { key: keyof DeliveryPageConfig; label: string; placeholder: string; hint?: string; multiline?: boolean }[] = [
    { key: 'pageTitle', label: 'Page Title', placeholder: 'Your Personalized Song' },
    { key: 'headerText', label: 'Header Subtitle', placeholder: 'A special song for {recipientName}', hint: 'Use {recipientName} as a placeholder' },
    { key: 'trackSubtitleText', label: 'Track Subtitle Text', placeholder: 'Personalized for {recipientName}', hint: 'Text under each track title. Use {recipientName} as a placeholder' },
    { key: 'phonePromptText', label: 'Phone Prompt Text', placeholder: 'Enter your phone number to access your song' },
    { key: 'processingMessage', label: 'Processing Message', placeholder: 'Your song is being created!' },
    { key: 'successMessage', label: 'Success Message', placeholder: 'Your Song is Ready!' },
    { key: 'downloadButtonText', label: 'Download Button Text', placeholder: 'Download Song' },
    { key: 'lyricsButtonText', label: 'Lyrics Button Text', placeholder: 'Download .txt' },
    { key: 'accentColor', label: 'Accent Color', placeholder: '#E11D48' },
  ]

  return (
    <Card className="shadow-sm">
      <CardHeader className="p-3 pb-2 bg-muted/5">
        <CardTitle className="text-sm font-semibold">Delivery Page Settings</CardTitle>
        <p className="text-xs text-muted-foreground mt-0.5">
          Configure the public order delivery page at <code className="bg-muted px-1 py-0.5 rounded text-[11px]">/order/{'{{orderId}}'}</code>
        </p>
      </CardHeader>
      <CardContent className="p-3 space-y-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Page Logo</label>
          <div className="flex items-center gap-3">
            {form.logoUrl ? (
              <div className="relative">
                <img
                  src={form.logoUrl}
                  alt="Logo"
                  className="h-12 w-12 rounded-full object-cover border"
                />
                <button
                  onClick={() => setForm(prev => ({ ...prev, logoUrl: undefined }))}
                  className="absolute -top-1 -right-1 rounded-full bg-red-500 text-white p-0.5 hover:bg-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-3 w-3" />
                {uploading ? 'Uploading...' : form.logoUrl ? 'Change Logo' : 'Upload Logo'}
              </Button>
              <p className="text-[10px] text-muted-foreground mt-0.5">Replaces the default music icon</p>
            </div>
          </div>
        </div>

        {fields.map(f => (
          <div key={f.key} className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
            {f.multiline ? (
              <Textarea
                value={form[f.key] ?? ''}
                onChange={(e) => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="text-sm min-h-[60px]"
              />
            ) : (
              <Input
                value={form[f.key] ?? ''}
                onChange={(e) => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="text-sm h-8"
              />
            )}
            {f.hint && <p className="text-[10px] text-muted-foreground">{f.hint}</p>}
          </div>
        ))}
        <Button
          size="sm"
          className="gap-1.5 mt-2"
          disabled={saving || loading}
          onClick={handleSave}
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </CardContent>
    </Card>
  )
}
