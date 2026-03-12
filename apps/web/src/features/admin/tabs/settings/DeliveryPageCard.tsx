import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Save } from 'lucide-react'
import type { Settings } from '@/features/admin/types'

interface DeliveryPageCardProps {
  settings: Settings
  saveSettings: (partial: Partial<Settings>) => Promise<Settings | null>
  loading: boolean
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
}

export function DeliveryPageCard({ settings, saveSettings, loading }: DeliveryPageCardProps) {
  const psc = (settings.publicSiteConfig && typeof settings.publicSiteConfig === 'object' ? settings.publicSiteConfig : {}) as Record<string, any>
  const saved: DeliveryPageConfig = psc.deliveryPage ?? {}

  const [form, setForm] = useState<DeliveryPageConfig>({ ...saved })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const updatedPsc = { ...psc, deliveryPage: form }
      await saveSettings({ publicSiteConfig: updatedPsc } as any)
    } finally {
      setSaving(false)
    }
  }

  const fields: { key: keyof DeliveryPageConfig; label: string; placeholder: string; multiline?: boolean }[] = [
    { key: 'pageTitle', label: 'Page Title', placeholder: 'Your Personalized Song' },
    { key: 'headerText', label: 'Header Subtitle', placeholder: 'A special song for {recipientName}' },
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
