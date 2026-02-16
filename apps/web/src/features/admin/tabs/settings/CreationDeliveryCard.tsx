import { useState } from 'react'
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
  const h = settings?.deliveryDelayHours ?? 24
  const [unit, setUnit] = useState<'hours' | 'days'>(h >= 24 && h % 24 === 0 ? 'days' : 'hours')
  const displayValue = unit === 'days' ? h / 24 : h

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
              <div className="flex gap-1.5">
                <Input
                  type="number"
                  min={0}
                  className="h-7 text-xs flex-1"
                  value={displayValue}
                  onChange={(e) => {
                    const val = Number(e.target.value)
                    const hours = unit === 'days' ? val * 24 : val
                    setSettings((s) => (s ? { ...s, deliveryDelayHours: hours } : s))
                  }}
                />
                <select
                  className="h-7 rounded-md border border-input bg-background px-2 text-xs"
                  value={unit}
                  onChange={(e) => {
                    const newUnit = e.target.value as 'hours' | 'days'
                    const curH = settings.deliveryDelayHours ?? 24
                    let newHours = curH
                    if (unit === 'hours' && newUnit === 'days') newHours = Math.max(24, Math.round(curH / 24) * 24)
                    setUnit(newUnit)
                    setSettings((s) => (s ? { ...s, deliveryDelayHours: newHours } : s))
                  }}
                >
                  <option value="hours">Jam</option>
                  <option value="days">Hari</option>
                </select>
              </div>
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
