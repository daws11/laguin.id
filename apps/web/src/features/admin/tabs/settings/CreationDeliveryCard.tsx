import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Settings } from '@/features/admin/types'

interface Props {
  settings: Settings | null
  setSettings: React.Dispatch<React.SetStateAction<Settings | null>>
  saveSettings: (partial: Partial<Settings>) => Promise<Settings | null>
  loading: boolean
  t: Record<string, string>
}

export function CreationDeliveryCard({ settings, setSettings, saveSettings, loading, t }: Props) {
  return (
    <Card className="h-full shadow-sm">
      <CardHeader className="p-3 pb-2 bg-muted/5">
        <CardTitle className="text-sm font-semibold">{t.creationDelivery}</CardTitle>
        <CardDescription className="text-[10px] line-clamp-1">{t.creationDeliveryDesc}</CardDescription>
      </CardHeader>
      <CardContent className="p-3 space-y-2 text-xs">
        {settings ? (
          <>
            <label className="flex items-center justify-between gap-2 rounded border p-1.5 bg-background cursor-pointer hover:bg-muted/40 transition-colors">
              <span className="font-medium">{t.instantEnabled}</span>
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary"
                checked={settings.instantEnabled}
                onChange={(e) => setSettings((s) => (s ? { ...s, instantEnabled: e.target.checked } : s))}
              />
            </label>
            <label className="flex items-center justify-between gap-2 rounded border p-1.5 bg-background cursor-pointer hover:bg-muted/40 transition-colors">
              <span className="font-medium">{t.emailOtpEnabled}</span>
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary"
                checked={settings.emailOtpEnabled ?? true}
                onChange={(e) => setSettings((s) => (s ? { ...s, emailOtpEnabled: e.target.checked } : s))}
              />
            </label>
            <label className="flex items-center justify-between gap-2 rounded border p-1.5 bg-background cursor-pointer hover:bg-muted/40 transition-colors">
              <span className="font-medium">{t.agreementEnabled}</span>
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary"
                checked={settings.agreementEnabled ?? false}
                onChange={(e) => setSettings((s) => (s ? { ...s, agreementEnabled: e.target.checked } : s))}
              />
            </label>
            <label className="flex items-center justify-between gap-2 rounded border p-1.5 bg-background cursor-pointer hover:bg-muted/40 transition-colors">
              <span className="font-medium">{t.manualConfirmationEnabled}</span>
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary"
                checked={settings.manualConfirmationEnabled ?? false}
                onChange={(e) =>
                  setSettings((s) => (s ? { ...s, manualConfirmationEnabled: e.target.checked } : s))
                }
              />
            </label>
            <div className="space-y-0.5">
              <div className="text-[10px] font-medium text-muted-foreground">{t.deliveryDelay}</div>
              <Input
                type="number"
                className="h-7 text-xs"
                value={settings.deliveryDelayHours ?? 24}
                onChange={(e) =>
                  setSettings((s) => (s ? { ...s, deliveryDelayHours: Number(e.target.value) } : s))
                }
              />
            </div>
            <Button
              className="w-full h-7 text-xs mt-1"
              disabled={loading}
              onClick={() =>
                void saveSettings({
                  instantEnabled: settings.instantEnabled,
                  emailOtpEnabled: settings.emailOtpEnabled ?? true,
                  agreementEnabled: settings.agreementEnabled ?? false,
                  manualConfirmationEnabled: settings.manualConfirmationEnabled ?? false,
                  deliveryDelayHours: settings.deliveryDelayHours ?? 24,
                })
              }
            >
              {t.updateSettings}
            </Button>
          </>
        ) : (
          <p className="text-muted-foreground">{loading ? t.loadingShort : t.noSettings}</p>
        )}
      </CardContent>
    </Card>
  )
}
