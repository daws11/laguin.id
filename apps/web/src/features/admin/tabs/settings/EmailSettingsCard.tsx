import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Settings } from '@/features/admin/types'

interface Props {
  settings: Settings | null
  setSettings: React.Dispatch<React.SetStateAction<Settings | null>>
  saveSettings: (
    partial: Partial<Settings> & { smtpPass?: string; resendApiKey?: string },
  ) => Promise<Settings | null>
  loading: boolean
  t: any
}

export function EmailSettingsCard({ settings, setSettings, saveSettings, loading, t }: Props) {
  if (!settings) return null

  return (
    <Card className="h-full shadow-sm">
      <CardHeader className="p-3 pb-2 bg-muted/5">
        <CardTitle className="text-sm font-semibold">Email Settings</CardTitle>
        <CardDescription className="text-[10px] line-clamp-2">Configure email delivery for order confirmations, OTP, and notifications.</CardDescription>
      </CardHeader>
      <CardContent className="p-3 space-y-3 text-xs">
        <div className="space-y-0.5">
          <div className="text-[10px] font-medium text-muted-foreground">Email Provider</div>
          <select
            className="w-full rounded border bg-background px-2 py-1 text-xs h-7 focus:outline-none focus:ring-1 focus:ring-ring"
            value={settings.emailProvider}
            onChange={(e) => setSettings((s) => (s ? { ...s, emailProvider: e.target.value } : s))}
          >
            <option value="smtp">SMTP</option>
            <option value="resend">Resend</option>
          </select>
        </div>

        {settings.emailProvider === 'smtp' && (
          <div className="space-y-1.5 pt-1.5 border-t">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">SMTP Configuration</div>

            <div className="space-y-0.5">
              <div className="text-[10px] font-medium text-muted-foreground">Host</div>
              <Input
                className="h-7 text-xs"
                placeholder="smtp.gmail.com"
                value={settings.smtpHost ?? ''}
                onChange={(e) => setSettings((s) => (s ? { ...s, smtpHost: e.target.value || null } : s))}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-0.5">
                <div className="text-[10px] font-medium text-muted-foreground">Port</div>
                <Input
                  className="h-7 text-xs"
                  type="number"
                  placeholder="587"
                  value={settings.smtpPort ?? ''}
                  onChange={(e) => setSettings((s) => (s ? { ...s, smtpPort: e.target.value ? Number(e.target.value) : null } : s))}
                />
              </div>
              <div className="space-y-0.5">
                <div className="text-[10px] font-medium text-muted-foreground">SSL/TLS</div>
                <label className="flex items-center gap-2 h-7 px-2 rounded border bg-background cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-3 w-3"
                    checked={settings.smtpSecure}
                    onChange={(e) => setSettings((s) => (s ? { ...s, smtpSecure: e.target.checked } : s))}
                  />
                  <span className="text-[10px]">Secure</span>
                </label>
              </div>
            </div>

            <div className="space-y-0.5">
              <div className="text-[10px] font-medium text-muted-foreground">Username</div>
              <Input
                className="h-7 text-xs"
                placeholder="user@gmail.com"
                value={settings.smtpUser ?? ''}
                onChange={(e) => setSettings((s) => (s ? { ...s, smtpUser: e.target.value || null } : s))}
              />
            </div>

            <div className="space-y-0.5">
              <div className="text-[10px] font-medium text-muted-foreground">
                Password {settings.hasSmtpPass && <span className="text-green-600">(saved)</span>}
              </div>
              <Input
                className="h-7 text-xs"
                type="password"
                placeholder={settings.hasSmtpPass ? '••••••••••••••••' : 'Enter SMTP password'}
                onBlur={(e) => {
                  const v = e.target.value.trim()
                  if (v) void saveSettings({ smtpPass: v } as any)
                }}
              />
            </div>

            <div className="space-y-0.5">
              <div className="text-[10px] font-medium text-muted-foreground">From Address</div>
              <Input
                className="h-7 text-xs"
                placeholder="no-reply@yourdomain.com"
                value={settings.smtpFrom ?? ''}
                onChange={(e) => setSettings((s) => (s ? { ...s, smtpFrom: e.target.value || null } : s))}
              />
            </div>
          </div>
        )}

        {settings.emailProvider === 'resend' && (
          <div className="space-y-1.5 pt-1.5 border-t">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Resend Configuration</div>

            <div className="space-y-0.5">
              <div className="text-[10px] font-medium text-muted-foreground">
                API Key {settings.hasResendKey && <span className="text-green-600">(saved)</span>}
              </div>
              <Input
                className="h-7 text-xs"
                type="password"
                placeholder={settings.hasResendKey ? '••••••••••••••••' : 'Enter Resend API key'}
                onBlur={(e) => {
                  const v = e.target.value.trim()
                  if (v) void saveSettings({ resendApiKey: v } as any)
                }}
              />
            </div>

            <div className="space-y-0.5">
              <div className="text-[10px] font-medium text-muted-foreground">From Address</div>
              <Input
                className="h-7 text-xs"
                placeholder="hello@yourdomain.com"
                value={settings.resendFrom ?? ''}
                onChange={(e) => setSettings((s) => (s ? { ...s, resendFrom: e.target.value || null } : s))}
              />
            </div>
          </div>
        )}

        <Button
          className="w-full h-7 text-xs mt-1"
          disabled={loading}
          onClick={() =>
            void saveSettings({
              emailProvider: settings.emailProvider,
              smtpHost: settings.smtpHost,
              smtpPort: settings.smtpPort,
              smtpSecure: settings.smtpSecure,
              smtpUser: settings.smtpUser,
              smtpFrom: settings.smtpFrom,
              resendFrom: settings.resendFrom,
            } as any)
          }
        >
          {t.updateSettings}
        </Button>
      </CardContent>
    </Card>
  )
}
