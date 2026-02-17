import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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
  const [saving, setSaving] = useState(false)

  const dirty =
    pixelId !== (settings.metaPixelId ?? '') ||
    wishlistId !== (settings.metaPixelWishlistId ?? '')

  async function handleSave() {
    setSaving(true)
    try {
      await saveSettings({
        metaPixelId: pixelId.trim() || null,
        metaPixelWishlistId: wishlistId.trim() || null,
      } as any)
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
