import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Save } from 'lucide-react'
import type { Settings } from '@/features/admin/types'

interface Props {
  settings: Settings
  saveSettings: (partial: Partial<Settings>) => Promise<Settings | null>
  loading: boolean
}

export function MetaPixelCard({ settings, saveSettings, loading }: Props) {
  const [pixelId, setPixelId] = useState(settings.metaPixelId ?? '')
  const [wishlistId, setWishlistId] = useState(settings.metaPixelWishlistId ?? '')
  const [step1Script, setStep1Script] = useState(settings.metaPixelStep1Script ?? '')
  const [step4Script, setStep4Script] = useState(settings.metaPixelStep4Script ?? '')
  const [confirmScript, setConfirmScript] = useState(settings.metaPixelConfirmScript ?? '')
  const [capiEnabled, setCapiEnabled] = useState(settings.metaCapiEnabled ?? false)
  const [capiToken, setCapiToken] = useState('')
  const [capiTestCode, setCapiTestCode] = useState(settings.metaCapiTestEventCode ?? '')
  const [saving, setSaving] = useState(false)

  const dirty =
    pixelId !== (settings.metaPixelId ?? '') ||
    wishlistId !== (settings.metaPixelWishlistId ?? '') ||
    step1Script !== (settings.metaPixelStep1Script ?? '') ||
    step4Script !== (settings.metaPixelStep4Script ?? '') ||
    confirmScript !== (settings.metaPixelConfirmScript ?? '') ||
    capiEnabled !== (settings.metaCapiEnabled ?? false) ||
    capiToken.trim() !== '' ||
    capiTestCode !== (settings.metaCapiTestEventCode ?? '')

  async function handleSave() {
    setSaving(true)
    try {
      const payload: any = {
        metaPixelId: pixelId.trim() || null,
        metaPixelWishlistId: wishlistId.trim() || null,
        metaPixelStep1Script: step1Script.trim() || null,
        metaPixelStep4Script: step4Script.trim() || null,
        metaPixelConfirmScript: confirmScript.trim() || null,
        metaCapiEnabled: capiEnabled,
        metaCapiTestEventCode: capiTestCode.trim() || null,
      }
      if (capiToken.trim()) {
        payload.metaCapiAccessToken = capiToken.trim()
      }
      await saveSettings(payload)
      setCapiToken('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="h-full shadow-sm">
      <CardHeader className="p-3 pb-2 bg-muted/5">
        <CardTitle className="text-sm font-semibold">Meta Pixel</CardTitle>
        <CardDescription className="text-[10px] line-clamp-2">
          Facebook / Meta Pixel IDs for tracking page views and conversions across all themes.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 space-y-3 text-xs">
        <div className="space-y-0.5">
          <div className="text-[10px] font-medium text-muted-foreground">Pixel ID (PageView)</div>
          <Input
            className="h-7 text-xs"
            placeholder="e.g. 928174156542569"
            value={pixelId}
            onChange={(e) => setPixelId(e.target.value)}
          />
        </div>
        <div className="space-y-0.5">
          <div className="text-[10px] font-medium text-muted-foreground">Wishlist Pixel ID</div>
          <Input
            className="h-7 text-xs"
            placeholder="e.g. 1234505681452683"
            value={wishlistId}
            onChange={(e) => setWishlistId(e.target.value)}
          />
        </div>

        <div className="pt-2 border-t space-y-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Custom Event Scripts</div>
          <div className="space-y-1">
            <div className="text-[10px] font-medium text-muted-foreground">Script — Config Step 1</div>
            <Textarea
              className="text-xs font-mono min-h-[60px]"
              placeholder={"fbq('track', 'ViewContent', {\n  content_type: 'product'\n});"}
              value={step1Script}
              onChange={(e) => setStep1Script(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">Fires when user reaches step 1 of the song configurator.</p>
          </div>
          <div className="space-y-1">
            <div className="text-[10px] font-medium text-muted-foreground">Script — Checkout (Step 4)</div>
            <Textarea
              className="text-xs font-mono min-h-[60px]"
              placeholder={"fbq('track', 'InitiateCheckout', {\n  value: 497000,\n  currency: 'IDR'\n});"}
              value={step4Script}
              onChange={(e) => setStep4Script(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">Fires when user reaches the checkout step.</p>
          </div>
          <div className="space-y-1">
            <div className="text-[10px] font-medium text-muted-foreground">Script — Payment Confirmed</div>
            <Textarea
              className="text-xs font-mono min-h-[60px]"
              placeholder={"fbq('track', 'Purchase', {\n  value: 497000,\n  currency: 'IDR'\n});"}
              value={confirmScript}
              onChange={(e) => setConfirmScript(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">Fires on the payment confirmation page when the processing animation starts.</p>
          </div>
        </div>

        <div className="pt-2 border-t space-y-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Conversions API (Server-side)</div>
          <div className="flex items-center gap-2">
            <Switch
              id="capi-enabled"
              checked={capiEnabled}
              onCheckedChange={setCapiEnabled}
            />
            <Label htmlFor="capi-enabled" className="text-xs cursor-pointer">Enable server-side CAPI events</Label>
          </div>
          <div className="space-y-0.5">
            <div className="text-[10px] font-medium text-muted-foreground">
              Access Token{settings.hasMetaCapiToken ? ' (token set — paste to replace)' : ''}
            </div>
            <Input
              className="h-7 text-xs font-mono"
              type="password"
              placeholder={settings.hasMetaCapiToken ? '••••••••••••••••' : 'EAAxxxxxxxxxxxxxxxxx…'}
              value={capiToken}
              onChange={(e) => setCapiToken(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="space-y-0.5">
            <div className="text-[10px] font-medium text-muted-foreground">Test Event Code (optional)</div>
            <Input
              className="h-7 text-xs font-mono"
              placeholder="e.g. TEST12345"
              value={capiTestCode}
              onChange={(e) => setCapiTestCode(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">Use this to validate events in Meta Events Manager without affecting production reporting.</p>
          </div>
        </div>

        <Button
          size="sm"
          className="h-7 text-xs gap-1"
          disabled={saving || loading || !dirty}
          onClick={handleSave}
        >
          <Save className="h-3 w-3" />
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </CardContent>
    </Card>
  )
}
