import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Settings } from '@/features/admin/types'
import { Smartphone, Key, BarChart3, CreditCard, Settings2, Mail } from 'lucide-react'
import { WhatsappGatewayCard } from './WhatsappGatewayCard'
import { ApiKeysCard } from './ApiKeysCard'
import { MetaPixelCard } from './MetaPixelCard'
import { XenditCard } from './XenditCard'
import { EmailSettingsCard } from './EmailSettingsCard'

interface SystemSettingsSectionProps {
  settings: Settings
  setSettings: React.Dispatch<React.SetStateAction<Settings | null>>
  saveSettings: (partial: Partial<Settings> & { openaiApiKey?: string; kaiAiApiKey?: string; ycloudApiKey?: string }) => Promise<Settings | null>
  loading: boolean
  t: any
}

export function SystemSettingsSection({
  settings,
  setSettings,
  saveSettings,
  loading,
  t,
}: SystemSettingsSectionProps) {
  const [activeTab, setActiveTab] = useState('email')

  const menuItems = [
    { id: 'email', label: 'Email', icon: Mail, group: 'System' },
    { id: 'whatsapp-gateway', label: t.whatsappGateway ?? 'WhatsApp Gateway', icon: Smartphone, group: 'System' },
    { id: 'api-keys', label: t.apiKeys ?? 'API Keys', icon: Key, group: 'System' },
    { id: 'meta-pixel', label: 'Meta Pixel', icon: BarChart3, group: 'System' },
    { id: 'xendit', label: 'Xendit Payment', icon: CreditCard, group: 'System' },
    { id: 'order-rules', label: 'Order Rules', icon: Settings2, group: 'System' },
  ]

  const SidebarItem = ({ item }: { item: typeof menuItems[0] }) => (
    <Button
      variant={activeTab === item.id ? 'secondary' : 'ghost'}
      className={cn(
        "w-full justify-start gap-2 h-9 px-2 text-sm",
        activeTab === item.id ? "font-medium" : "text-muted-foreground"
      )}
      onClick={() => setActiveTab(item.id)}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {item.label}
    </Button>
  )

  const groups = Array.from(new Set(menuItems.map(item => item.group)))

  return (
    <Card className="h-full shadow-sm flex flex-col overflow-hidden">
      <CardHeader className="p-4 pb-2 bg-muted/5 shrink-0 border-b">
        <CardTitle className="text-sm font-semibold">{t.settings}</CardTitle>
      </CardHeader>

      <CardContent className="p-0 flex-1 min-h-0 flex flex-col md:flex-row">
        <aside className="w-full md:w-[220px] bg-muted/10 border-b md:border-b-0 md:border-r flex flex-col gap-1 p-2 overflow-y-auto">
          {groups.map(group => (
            <div key={group} className="mb-2">
              <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                {group}
              </div>
              {menuItems.filter(m => m.group === group).map(item => <SidebarItem key={item.id} item={item} />)}
            </div>
          ))}
        </aside>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-background">
          {activeTab === 'email' && (
            <div className="animate-in fade-in duration-300 h-full">
              <EmailSettingsCard
                settings={settings}
                setSettings={setSettings}
                saveSettings={saveSettings}
                loading={loading}
                t={t}
              />
            </div>
          )}

          {activeTab === 'whatsapp-gateway' && (
            <div className="animate-in fade-in duration-300 h-full">
              <WhatsappGatewayCard
                settings={settings}
                setSettings={setSettings}
                saveSettings={saveSettings}
                loading={loading}
                t={t}
              />
            </div>
          )}

          {activeTab === 'api-keys' && (
            <div className="animate-in fade-in duration-300 h-full">
              <ApiKeysCard
                settings={settings}
                saveSettings={saveSettings}
                t={t}
              />
            </div>
          )}

          {activeTab === 'meta-pixel' && (
            <div className="animate-in fade-in duration-300 h-full">
              <MetaPixelCard
                settings={settings}
                saveSettings={saveSettings}
                loading={loading}
              />
            </div>
          )}

          {activeTab === 'xendit' && (
            <div className="animate-in fade-in duration-300 h-full">
              <XenditCard
                settings={settings}
                saveSettings={saveSettings}
                loading={loading}
              />
            </div>
          )}

          {activeTab === 'order-rules' && (
            <div className="animate-in fade-in duration-300 h-full">
              <Card className="h-full shadow-sm">
                <CardHeader className="p-3 pb-2 bg-muted/5">
                  <CardTitle className="text-sm font-semibold">Order Rules</CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-4 text-xs">
                  <div className="flex items-center justify-between gap-4 py-2">
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium">Allow multiple orders per WhatsApp number</div>
                      <div className="text-xs text-muted-foreground">
                        When enabled, the same WhatsApp number can be used to place more than one order.
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={settings.allowMultipleOrdersPerWhatsapp}
                      onClick={() => {
                        const next = !settings.allowMultipleOrdersPerWhatsapp
                        setSettings((prev) => prev ? { ...prev, allowMultipleOrdersPerWhatsapp: next } : prev)
                        saveSettings({ allowMultipleOrdersPerWhatsapp: next })
                      }}
                      className={cn(
                        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                        settings.allowMultipleOrdersPerWhatsapp ? 'bg-primary' : 'bg-input'
                      )}
                    >
                      <span
                        className={cn(
                          'pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform',
                          settings.allowMultipleOrdersPerWhatsapp ? 'translate-x-5' : 'translate-x-0'
                        )}
                      />
                    </button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
