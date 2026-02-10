import { useEffect, useMemo, useState } from 'react'
import { SupportedPlaceholders, validatePlaceholders } from 'shared'
import { LayoutDashboard, Settings as SettingsIcon, MessageSquare, Users, ShoppingBag, LogOut, Menu, ChevronLeft, ChevronRight } from 'lucide-react'

import { apiGet, apiPost, apiPut } from '@/lib/http'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const translations = {
  id: {
    adminPanel: 'Admin Panel',
    loginTitle: 'Admin',
    loginSubtitle: 'Masuk untuk mengelola sistem.',
    loginHeader: 'Masuk',
    loginDesc: 'Gunakan `ADMIN_PASSWORD` dari environment API.',
    loginButton: 'Masuk',
    loggingIn: 'Sedang masuk…',
    loginFailed: 'Login gagal',
    settings: 'Pengaturan',
    prompts: 'Prompts',
    customers: 'Pelanggan',
    orders: 'Pesanan',
    logout: 'Keluar',
    loading: 'Memuat data...',
    loadingShort: 'Memuat…',
    creationDelivery: 'Pembuatan & Pengiriman',
    creationDeliveryDesc: 'Mengontrol pengiriman WhatsApp instan vs tertunda.',
    instantEnabled: 'Pengiriman instan aktif',
    deliveryDelay: 'Penundaan pengiriman (jam) (saat instan NONAKTIF)',
    whatsappGateway: 'WhatsApp Gateway',
    whatsappGatewayDesc: 'Pilih provider WhatsApp dan konfigurasi template pengiriman link lagu.',
    provider: 'Provider',
    ycloudFrom: 'YCloud From (E.164, contoh: +628123...)',
    ycloudTemplateName: 'YCloud Template Name',
    ycloudTemplateLang: 'YCloud Template Language Code (contoh: id atau en_US)',
    ycloudApiKey: 'Set YCloud API key (disimpan terenkripsi)',
    ycloudKeyStatus: 'YCloud API key saat ini: {status}.',
    updateSettings: 'Update',
    apiKeys: 'API Keys',
    apiKeysDesc: 'Disimpan terenkripsi (kompatibel MVP). Saat ini: OpenAI={openai}, kai.ai={kaiai}.',
    present: 'ada',
    missing: 'hilang',
    setOpenai: 'Set OpenAI key (opsional)',
    setKaiai: 'Set kai.ai key (opsional)',
    supportedPlaceholders: 'Placeholder didukung',
    supportedPlaceholdersDesc: 'Gunakan ini dalam template prompt (cth. `[recipient_name]`).',
    createTemplate: 'Buat template prompt baru',
    createTemplateDesc: 'Membuat versi baru dan mengaktifkannya.',
    type: 'Tipe',
    templateText: 'Teks Template',
    createActivate: 'Buat & Aktifkan',
    templates: 'Template',
    installRecommended: 'Pasang template recommended',
    active: 'aktif',
    activate: 'Aktifkan',
    customerTap: 'Ketuk pelanggan untuk melihat detail.',
    orderCount: 'pesanan',
    latest: 'terakhir',
    customerDetails: 'Detail Pelanggan',
    closeDetails: 'Tutup Detail',
    selectCustomer: 'Pilih pelanggan untuk melihat detail',
    orderTap: 'Ketuk pesanan untuk melihat detail dan coba lagi.',
    delivery: 'pengiriman',
    orderDetails: 'Detail Pesanan',
    status: 'Status',
    songLink: 'Link Lagu',
    retryCreation: 'Coba lagi pembuatan',
    events: 'Events (terbaru di atas)',
    selectOrder: 'Pilih pesanan untuk melihat detail',
    failedLoadAdmin: 'Gagal memuat data admin',
    failedSaveSettings: 'Gagal menyimpan pengaturan',
    failedCreateTemplate: 'Gagal membuat template',
    failedActivateTemplate: 'Gagal mengaktifkan template',
    failedInstallRecommended: 'Gagal memasang template recommended',
    failedLoadCustomer: 'Gagal memuat pelanggan',
    failedLoadOrder: 'Gagal memuat pesanan',
    failedRetryOrder: 'Gagal mencoba ulang pesanan',
    noSettings: 'Tidak ada pengaturan dimuat.',
    error: 'Error',
    track: 'track',
    overview: 'Ringkasan',
    userInput: 'Input User',
    recipientName: 'Nama Penerima',
    yourName: 'Nama Kamu',
    occasion: 'Acara',
    story: 'Cerita',
    musicPreferences: 'Preferensi Musik',
    extraNotes: 'Catatan Tambahan',
    genre: 'Genre',
    mood: 'Mood',
    vibe: 'Vibe',
    tempo: 'Tempo',
    voiceStyle: 'Gaya Suara',
    language: 'Bahasa',
  },
  en: {
    adminPanel: 'Admin Panel',
    loginTitle: 'Admin',
    loginSubtitle: 'Login to manage the system.',
    loginHeader: 'Login',
    loginDesc: 'Use `ADMIN_PASSWORD` from API environment.',
    loginButton: 'Login',
    loggingIn: 'Logging in...',
    loginFailed: 'Login failed',
    settings: 'Settings',
    prompts: 'Prompts',
    customers: 'Customers',
    orders: 'Orders',
    logout: 'Logout',
    loading: 'Loading data...',
    loadingShort: 'Loading…',
    creationDelivery: 'Creation & Delivery',
    creationDeliveryDesc: 'Controls instant vs delayed WhatsApp delivery.',
    instantEnabled: 'Instant delivery enabled',
    deliveryDelay: 'Delivery delay (hours) (when instant is OFF)',
    whatsappGateway: 'WhatsApp Gateway',
    whatsappGatewayDesc: 'Select WhatsApp provider and configure the delivery template for the song link.',
    provider: 'Provider',
    ycloudFrom: 'YCloud From (E.164, e.g. +15551234567)',
    ycloudTemplateName: 'YCloud Template Name',
    ycloudTemplateLang: 'YCloud Template Language Code (e.g. id or en_US)',
    ycloudApiKey: 'Set YCloud API key (stored encrypted)',
    ycloudKeyStatus: 'Current YCloud API key: {status}.',
    updateSettings: 'Update',
    apiKeys: 'API Keys',
    apiKeysDesc: 'Stored encrypted (MVP compatible). Current: OpenAI={openai}, kai.ai={kaiai}.',
    present: 'present',
    missing: 'missing',
    setOpenai: 'Set OpenAI key (optional)',
    setKaiai: 'Set kai.ai key (optional)',
    supportedPlaceholders: 'Supported Placeholders',
    supportedPlaceholdersDesc: 'Use these in prompt templates (e.g. `[recipient_name]`).',
    createTemplate: 'Create new prompt template',
    createTemplateDesc: 'Creates a new version and activates it.',
    type: 'Type',
    templateText: 'Template Text',
    createActivate: 'Create & Activate',
    templates: 'Templates',
    installRecommended: 'Install recommended templates',
    active: 'active',
    activate: 'Activate',
    customerTap: 'Tap customer to view details.',
    orderCount: 'orders',
    latest: 'latest',
    customerDetails: 'Customer Details',
    closeDetails: 'Close Details',
    selectCustomer: 'Select customer to view details',
    orderTap: 'Tap order to view details and retry.',
    delivery: 'delivery',
    orderDetails: 'Order Details',
    status: 'Status',
    songLink: 'Song Link',
    retryCreation: 'Retry creation',
    events: 'Events (newest first)',
    selectOrder: 'Select order to view details',
    failedLoadAdmin: 'Failed to load admin data',
    failedSaveSettings: 'Failed to save settings',
    failedCreateTemplate: 'Failed to create template',
    failedActivateTemplate: 'Failed to activate template',
    failedInstallRecommended: 'Failed to install recommended templates',
    failedLoadCustomer: 'Failed to load customer',
    failedLoadOrder: 'Failed to load order',
    failedRetryOrder: 'Failed to retry order',
    noSettings: 'No settings loaded.',
    error: 'Error',
    track: 'track',
    overview: 'Overview',
    userInput: 'User Input',
    recipientName: 'Recipient Name',
    yourName: 'Your Name',
    occasion: 'Occasion',
    story: 'Story',
    musicPreferences: 'Music Preferences',
    extraNotes: 'Extra Notes',
    genre: 'Genre',
    mood: 'Mood',
    vibe: 'Vibe',
    tempo: 'Tempo',
    voiceStyle: 'Voice Style',
    language: 'Language',
  }
}

type PromptTemplate = {
  id: string
  type: 'lyrics' | 'mood_description' | 'music'
  templateText: string
  kaiSettings: unknown | null
  version: number
  isActive: boolean
  createdAt: string
  placeholderValidation?: ReturnType<typeof validatePlaceholders>
}

type Settings = {
  id: string
  instantEnabled: boolean
  deliveryDelayHours: number | null
  paymentsEnabled: boolean
  whatsappProvider: string
  whatsappConfig: unknown | null
  hasOpenaiKey: boolean
  hasKaiAiKey: boolean

  // YCloud WhatsApp gateway settings (safe fields only)
  ycloudFrom: string | null
  ycloudTemplateName: string | null
  ycloudTemplateLangCode: string | null
  hasYcloudKey: boolean
}

type CustomerListItem = {
  id: string
  name: string
  whatsappNumber: string
  email: string | null
  orderCount: number
  latestOrderStatus: string | null
  latestDeliveryStatus: string | null
  createdAt: string
}

type OrderListItem = {
  id: string
  status: string
  deliveryStatus: string
  paymentStatus: string
  createdAt: string
  trackUrl: string | null
  errorMessage: string | null
  customer: { id: string; name: string; whatsappNumber: string }
}

type OrderDetail = any
type CustomerDetail = any

function tokenStorage() {
  const key = 'admin_token'
  return {
    get: () => window.localStorage.getItem(key),
    set: (t: string) => window.localStorage.setItem(key, t),
    clear: () => window.localStorage.removeItem(key),
  }
}

export function AdminRoute() {
  const storage = useMemo(() => tokenStorage(), [])
  const [token, setToken] = useState<string | null>(() => storage.get())

  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [loadingAuth, setLoadingAuth] = useState(false)

    const [tab, setTab] = useState<'settings' | 'prompts' | 'customers' | 'orders'>('settings')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [lang, setLang] = useState<'id' | 'en'>('id')
  
  const t = translations[lang]

  const [settings, setSettings] = useState<Settings | null>(null)
  const [templates, setTemplates] = useState<PromptTemplate[]>([])
  const [customers, setCustomers] = useState<CustomerListItem[]>([])
  const [orders, setOrders] = useState<OrderListItem[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetail | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // create template form
  const [newType, setNewType] = useState<'lyrics' | 'mood_description' | 'music'>('lyrics')
  const [newTemplateText, setNewTemplateText] = useState('')

  async function login() {
    setLoadingAuth(true)
    setAuthError(null)
    try {
      const res = await apiPost<{ token: string }>('/api/admin/login', { password })
      storage.set(res.token)
      setToken(res.token)
    } catch (e: any) {
      setAuthError(e?.message ?? t.loginFailed)
    } finally {
      setLoadingAuth(false)
    }
  }

  async function logout() {
    storage.clear()
    setToken(null)
    setSettings(null)
    setTemplates([])
    setCustomers([])
    setOrders([])
    setSelectedCustomer(null)
    setSelectedOrder(null)
  }

  async function refreshSettings() {
    if (!token) return
    const s = await apiGet<Settings>('/api/admin/settings', { token })
    setSettings(s)
  }

  async function refreshTemplates() {
    if (!token) return
    const items = await apiGet<PromptTemplate[]>('/api/admin/prompt-templates', { token })
    setTemplates(items)
  }

  async function refreshCustomers() {
    if (!token) return
    const items = await apiGet<CustomerListItem[]>('/api/admin/customers', { token })
    setCustomers(items)
  }

  async function refreshOrders() {
    if (!token) return
    const items = await apiGet<OrderListItem[]>('/api/admin/orders', { token })
    setOrders(items)
  }

  useEffect(() => {
    if (!token) return
    setLoading(true)
    setError(null)
    Promise.all([refreshSettings(), refreshTemplates(), refreshCustomers(), refreshOrders()])
      .catch((e) => setError(e?.message ?? t.failedLoadAdmin))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function saveSettings(
    partial: Partial<Settings> & { openaiApiKey?: string; kaiAiApiKey?: string; ycloudApiKey?: string },
  ) {
    if (!token) return
    setError(null)
    setLoading(true)
    try {
      const updated = await apiPut<Settings>('/api/admin/settings', partial, { token })
      setSettings(updated)
    } catch (e: any) {
      setError(e?.message ?? t.failedSaveSettings)
    } finally {
      setLoading(false)
    }
  }

  async function createTemplate() {
    if (!token) return
    setError(null)
    setLoading(true)
    try {
      await apiPost('/api/admin/prompt-templates', { type: newType, templateText: newTemplateText, makeActive: true }, { token })
      setNewTemplateText('')
      await refreshTemplates()
      setTab('prompts')
    } catch (e: any) {
      setError(e?.message ?? t.failedCreateTemplate)
    } finally {
      setLoading(false)
    }
  }

  async function activateTemplate(id: string) {
    if (!token) return
    setError(null)
    setLoading(true)
    try {
      await apiPost(`/api/admin/prompt-templates/${encodeURIComponent(id)}/activate`, {}, { token })
      await refreshTemplates()
    } catch (e: any) {
      setError(e?.message ?? t.failedActivateTemplate)
    } finally {
      setLoading(false)
    }
  }

  async function installRecommendedTemplates() {
    if (!token) return
    setError(null)
    setLoading(true)
    try {
      await apiPost('/api/admin/prompt-templates/recommended', {}, { token })
      await refreshTemplates()
      setTab('prompts')
    } catch (e: any) {
      setError(e?.message ?? t.failedInstallRecommended)
    } finally {
      setLoading(false)
    }
  }

  async function openCustomer(id: string) {
    if (!token) return
    setError(null)
    setLoading(true)
    try {
      const detail = await apiGet<CustomerDetail>(`/api/admin/customers/${encodeURIComponent(id)}`, { token })
      setSelectedCustomer(detail)
      setTab('customers')
    } catch (e: any) {
      setError(e?.message ?? t.failedLoadCustomer)
    } finally {
      setLoading(false)
    }
  }

  async function openOrder(id: string) {
    if (!token) return
    setError(null)
    setLoading(true)
    try {
      const detail = await apiGet<OrderDetail>(`/api/admin/orders/${encodeURIComponent(id)}`, { token })
      setSelectedOrder(detail)
      setTab('orders')
    } catch (e: any) {
      setError(e?.message ?? t.failedLoadOrder)
    } finally {
      setLoading(false)
    }
  }

  async function retryOrder(id: string) {
    if (!token) return
    setError(null)
    setLoading(true)
    try {
      await apiPost(`/api/admin/orders/${encodeURIComponent(id)}/retry`, {}, { token })
      await refreshOrders()
      await openOrder(id)
    } catch (e: any) {
      setError(e?.message ?? t.failedRetryOrder)
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t.loginTitle}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t.loginSubtitle}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={lang === 'id' ? 'default' : 'outline'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setLang('id')}
            >
              ID
            </Button>
            <Button
              variant={lang === 'en' ? 'default' : 'outline'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setLang('en')}
            >
              EN
            </Button>
          </div>
        </div>

        <Card className="mt-8">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base">{t.loginHeader}</CardTitle>
            <CardDescription>{t.loginDesc}</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="ADMIN_PASSWORD"
            />
            <Button className="w-full" onClick={() => void login()} disabled={loadingAuth}>
              {loadingAuth ? t.loggingIn : t.loginButton}
            </Button>
            {authError ? <p className="text-sm text-destructive">{authError}</p> : null}
          </CardContent>
        </Card>
      </div>
    )
  }

  const SidebarItem = ({
    value,
    icon: Icon,
    label,
  }: {
    value: typeof tab
    icon: any
    label: string
  }) => (
    <Button
      variant={tab === value ? 'secondary' : 'ghost'}
      className={cn(
        "w-full justify-start gap-2 h-9 px-2",
        isCollapsed ? "justify-center px-0" : ""
      )}
      onClick={() => {
        setTab(value)
        setIsSidebarOpen(false)
      }}
      title={isCollapsed ? label : undefined}
    >
      <Icon className="h-4 w-4" />
      {!isCollapsed && label}
    </Button>
  )

  return (
    <div className="flex h-screen w-full bg-background flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="flex h-14 items-center justify-between border-b px-4 md:hidden">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            <Menu className="h-5 w-5" />
          </Button>
          <span className="ml-4 font-semibold">{t.adminPanel}</span>
        </div>
      </header>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden" 
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex-col border-r bg-background p-4 transition-all duration-300 ease-in-out md:static md:flex md:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        isCollapsed ? "w-16 items-center" : "w-56"
      )}>
        <div className={cn("flex items-center gap-2 font-semibold tracking-tight", isCollapsed && "justify-center")}>
          <LayoutDashboard className="h-6 w-6" />
          {!isCollapsed && <span>{t.adminPanel}</span>}
        </div>
        
        <div className="mt-4 flex flex-1 flex-col gap-1 w-full">
          <SidebarItem value="settings" icon={SettingsIcon} label={t.settings} />
          <SidebarItem value="prompts" icon={MessageSquare} label={t.prompts} />
          <SidebarItem value="customers" icon={Users} label={t.customers} />
          <SidebarItem value="orders" icon={ShoppingBag} label={t.orders} />
        </div>

        <div className="mt-auto flex flex-col gap-2 w-full">
          {!isCollapsed && (
            <div className="flex gap-2 justify-center mb-2">
              <Button
                variant={lang === 'id' ? 'secondary' : 'ghost'}
                size="sm"
                className="flex-1 text-xs"
                onClick={() => setLang('id')}
              >
                ID
              </Button>
              <Button
                variant={lang === 'en' ? 'secondary' : 'ghost'}
                size="sm"
                className="flex-1 text-xs"
                onClick={() => setLang('en')}
              >
                EN
              </Button>
            </div>
          )}
          {isCollapsed && (
             <Button
               variant="ghost"
               size="icon"
               className="w-full"
               onClick={() => setLang(lang === 'id' ? 'en' : 'id')}
               title={lang === 'id' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}
             >
                <span className="text-xs font-bold">{lang.toUpperCase()}</span>
             </Button>
          )}

          <Button 
            variant="outline" 
            className={cn("justify-start gap-2 text-muted-foreground", isCollapsed && "justify-center px-0")} 
            onClick={logout}
            title={isCollapsed ? t.logout : undefined}
          >
            <LogOut className="h-4 w-4" />
            {!isCollapsed && t.logout}
          </Button>

          <Button
            variant="ghost"
            className={cn("hidden md:flex justify-center", !isCollapsed && "self-end")}
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-2 md:p-4 bg-muted/10">
        <div className="mx-auto w-full space-y-4">
          <div className="flex items-center justify-between px-1">
             <h2 className="text-xl font-bold tracking-tight capitalize">{t[tab as keyof typeof t] || tab}</h2>
             {loading && <p className="text-xs text-muted-foreground">{t.loading}</p>}
          </div>

          {error ? <p className="text-xs text-destructive px-1">{error}</p> : null}

          {tab === 'settings' && (
            <div className="grid gap-2 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-start">
              {/* Card 1: Creation & Delivery */}
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

              {/* Card 2: WhatsApp Gateway */}
              <Card className="h-full shadow-sm">
                <CardHeader className="p-3 pb-2 bg-muted/5">
                  <CardTitle className="text-sm font-semibold">{t.whatsappGateway}</CardTitle>
                  <CardDescription className="text-[10px] line-clamp-1">{t.whatsappGatewayDesc}</CardDescription>
                </CardHeader>
                <CardContent className="p-3 space-y-2 text-xs">
                  {settings ? (
                    <>
                      <div className="space-y-0.5">
                        <div className="text-[10px] font-medium text-muted-foreground">{t.provider}</div>
                        <select
                          className="w-full rounded border bg-background px-2 py-1 text-xs h-7 focus:outline-none focus:ring-1 focus:ring-ring"
                          value={settings.whatsappProvider}
                          onChange={(e) => setSettings((s) => (s ? { ...s, whatsappProvider: e.target.value } : s))}
                        >
                          <option value="mock">mock</option>
                          <option value="ycloud">ycloud</option>
                        </select>
                      </div>

                      {settings.whatsappProvider === 'ycloud' && (
                        <div className="space-y-1.5 pt-1.5 border-t">
                          <div className="text-[10px] text-muted-foreground">
                            {t.ycloudKeyStatus.replace('{status}', settings.hasYcloudKey ? t.present : t.missing)}
                          </div>
                          <Input
                            className="h-7 text-xs"
                            placeholder={t.ycloudFrom}
                            value={settings.ycloudFrom ?? ''}
                            onChange={(e) => setSettings((s) => (s ? { ...s, ycloudFrom: e.target.value } : s))}
                          />
                          <Input
                            className="h-7 text-xs"
                            placeholder={t.ycloudTemplateName}
                            value={settings.ycloudTemplateName ?? ''}
                            onChange={(e) =>
                              setSettings((s) => (s ? { ...s, ycloudTemplateName: e.target.value } : s))
                            }
                          />
                          <Input
                            className="h-7 text-xs"
                            placeholder={t.ycloudTemplateLang}
                            value={settings.ycloudTemplateLangCode ?? ''}
                            onChange={(e) =>
                              setSettings((s) => (s ? { ...s, ycloudTemplateLangCode: e.target.value } : s))
                            }
                          />
                          <Input
                            className="h-7 text-xs"
                            placeholder={t.ycloudApiKey}
                            type="password"
                            onBlur={(e) => {
                              const v = e.target.value.trim()
                              if (v) void saveSettings({ ycloudApiKey: v })
                            }}
                          />
                        </div>
                      )}

                      <Button
                        className="w-full h-7 text-xs mt-1"
                        disabled={loading}
                        onClick={() =>
                          void saveSettings({
                            whatsappProvider: settings.whatsappProvider,
                            ycloudFrom: settings.ycloudFrom ?? undefined,
                            ycloudTemplateName: settings.ycloudTemplateName ?? undefined,
                            ycloudTemplateLangCode: settings.ycloudTemplateLangCode ?? undefined,
                          })
                        }
                      >
                        {t.updateSettings}
                      </Button>
                    </>
                  ) : null}
                </CardContent>
              </Card>

              {/* Card 3: API Keys */}
              <Card className="h-full shadow-sm">
                <CardHeader className="p-3 pb-2 bg-muted/5">
                  <CardTitle className="text-sm font-semibold">{t.apiKeys}</CardTitle>
                  <CardDescription className="text-[10px] line-clamp-1">
                    {settings
                      ? t.apiKeysDesc
                          .replace('{openai}', settings.hasOpenaiKey ? t.present : t.missing)
                          .replace('{kaiai}', settings.hasKaiAiKey ? t.present : t.missing)
                      : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3 space-y-2 text-xs">
                  {settings ? (
                    <>
                      <div className="space-y-0.5">
                        <div className="text-[10px] font-medium text-muted-foreground">OpenAI API Key</div>
                        <Input
                          className="h-7 text-xs"
                          placeholder={t.setOpenai}
                          type="password"
                          onBlur={(e) => {
                            const v = e.target.value.trim()
                            if (v) void saveSettings({ openaiApiKey: v })
                          }}
                        />
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-[10px] font-medium text-muted-foreground">kai.ai API Key</div>
                        <Input
                          className="h-7 text-xs"
                          placeholder={t.setKaiai}
                          type="password"
                          onBlur={(e) => {
                            const v = e.target.value.trim()
                            if (v) void saveSettings({ kaiAiApiKey: v })
                          }}
                        />
                      </div>
                    </>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          )}

          {tab === 'prompts' && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-base">{t.supportedPlaceholders}</CardTitle>
                    <CardDescription>{t.supportedPlaceholdersDesc}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 flex flex-wrap gap-2">
                    {SupportedPlaceholders.map((p) => (
                      <Badge key={p} variant="secondary">
                        [{p}]
                      </Badge>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-base">{t.createTemplate}</CardTitle>
                    <CardDescription>{t.createTemplateDesc}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-3">
                    <label className="text-sm">
                      <div className="mb-1 font-medium">{t.type}</div>
                      <select
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        value={newType}
                        onChange={(e) => setNewType(e.target.value as any)}
                      >
                        <option value="lyrics">lyrics</option>
                        <option value="mood_description">mood_description</option>
                        <option value="music">music</option>
                      </select>
                    </label>
                    <label className="text-sm">
                      <div className="mb-1 font-medium">{t.templateText}</div>
                      <Textarea value={newTemplateText} onChange={(e) => setNewTemplateText(e.target.value)} rows={4} />
                    </label>
                    <Button className="w-full" onClick={() => void createTemplate()} disabled={!newTemplateText || loading}>
                      {t.createActivate}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-base">{t.templates}</CardTitle>
                    <Button size="sm" variant="secondary" onClick={() => void installRecommendedTemplates()} disabled={loading}>
                      {t.installRecommended}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3">
                  {templates.map((t_item) => {
                    const v = t_item.placeholderValidation ?? validatePlaceholders(t_item.templateText)
                    return (
                      <div key={t_item.id} className="rounded-md border p-2 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-medium">
                            {t_item.type} v{t_item.version} {t_item.isActive ? <Badge variant="secondary">{t.active}</Badge> : null}
                          </div>
                          <div className="flex items-center gap-2">
                            {v.unknown.length ? (
                              <span className="text-xs text-destructive">unknown: {v.unknown.join(', ')}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">ok</span>
                            )}
                            {!t_item.isActive ? (
                              <Button size="sm" variant="secondary" onClick={() => void activateTemplate(t_item.id)}>
                                {t.activate}
                              </Button>
                            ) : null}
                          </div>
                        </div>
                        <pre className="mt-2 max-h-48 overflow-auto rounded bg-muted p-2 text-xs leading-snug">
                          {t_item.templateText}
                        </pre>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            </div>
          )}

          {tab === 'customers' && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card className={selectedCustomer ? 'hidden md:block' : ''}>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-base">{t.customers}</CardTitle>
                    <CardDescription>{t.customerTap}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-2">
                    {customers.map((c) => (
                      <button
                        key={c.id}
                        className={cn(
                          "w-full rounded-md border p-2 text-left text-sm hover:bg-muted transition-colors",
                          selectedCustomer?.id === c.id ? "bg-muted border-primary" : ""
                        )}
                        onClick={() => void openCustomer(c.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{c.name}</div>
                          <div className="text-xs text-muted-foreground">{c.orderCount} {t.orderCount}</div>
                        </div>
                        <div className="text-xs text-muted-foreground">{c.whatsappNumber}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {t.latest}: {c.latestOrderStatus ?? '-'} / {c.latestDeliveryStatus ?? '-'}
                        </div>
                      </button>
                    ))}
                  </CardContent>
                </Card>

                {selectedCustomer ? (
                  <Card>
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-base">{t.customerDetails}</CardTitle>
                      <CardDescription>{selectedCustomer.name}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 space-y-3 text-sm">
                      <div className="rounded-md border p-2">
                        <div className="text-muted-foreground">WhatsApp</div>
                        <div className="font-medium">{selectedCustomer.whatsappNumber}</div>
                      </div>
                      <div className="space-y-2">
                        <div className="font-medium">{t.orders}</div>
                        {(selectedCustomer.orders ?? []).map((o: any) => (
                          <button
                            key={o.id}
                            className="w-full rounded-md border p-2 text-left hover:bg-muted transition-colors"
                            onClick={() => void openOrder(o.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="font-medium">{o.id}</div>
                              <div className="text-xs text-muted-foreground">{o.status}</div>
                            </div>
                            {o.status === 'failed' ? (
                              <div className="mt-1 text-xs text-destructive">{t.error}: {o.errorMessage ?? '-'}</div>
                            ) : (
                              <div className="text-xs text-muted-foreground">{o.deliveryStatus}</div>
                            )}
                          </button>
                        ))}
                      </div>
                      <Button variant="outline" className="w-full md:hidden" onClick={() => setSelectedCustomer(null)}>
                        {t.closeDetails}
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                   <div className="hidden items-center justify-center rounded-lg border border-dashed p-4 text-center text-muted-foreground md:flex">
                     {t.selectCustomer}
                   </div>
                )}
              </div>
            </div>
          )}

          {tab === 'orders' && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card className={selectedOrder ? 'hidden md:block' : ''}>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-base">{t.orders}</CardTitle>
                    <CardDescription>{t.orderTap}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-2">
                    {orders.map((o) => (
                      <button
                        key={o.id}
                        className={cn(
                          "w-full rounded-md border p-2 text-left text-sm hover:bg-muted transition-colors",
                          selectedOrder?.id === o.id ? "bg-muted border-primary" : ""
                        )}
                        onClick={() => void openOrder(o.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{o.customer.name}</div>
                          <div className="text-xs text-muted-foreground">{o.status}</div>
                        </div>
                        <div className="text-xs text-muted-foreground">{o.id}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {t.delivery}: {o.status === 'failed' ? '-' : o.deliveryStatus} {o.trackUrl ? `• ${t.track}` : ''}{' '}
                          {o.errorMessage ? `• ${t.error.toLowerCase()}` : ''}
                        </div>
                      </button>
                    ))}
                  </CardContent>
                </Card>

                {selectedOrder ? (
                  <Card>
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-base">{t.orderDetails}</CardTitle>
                      <CardDescription>{selectedOrder.id}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 space-y-3 text-sm">
                      <Tabs defaultValue="userInput" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="userInput">{t.userInput}</TabsTrigger>
                          <TabsTrigger value="overview">{t.overview}</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="overview" className="space-y-3">
                          <div className="grid gap-2 rounded-md border p-2 mt-2">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">{t.status}</span>
                              <span className="font-medium">{selectedOrder.status}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">{t.delivery}</span>
                              <span className="font-medium">{selectedOrder.deliveryStatus}</span>
                            </div>
                            {selectedOrder.trackUrl ? (
                              <a className="text-sm underline" href={selectedOrder.trackUrl}>
                                {t.songLink}
                              </a>
                            ) : null}
                            {selectedOrder.errorMessage ? (
                              <div className="text-destructive">{t.error}: {selectedOrder.errorMessage}</div>
                            ) : null}
                          </div>

                          <Button variant="secondary" className="w-full" onClick={() => void retryOrder(selectedOrder.id)}>
                            {t.retryCreation}
                          </Button>

                          <div className="space-y-2">
                            <div className="font-medium">{t.events}</div>
                            <div className="max-h-64 overflow-auto rounded-md border bg-muted p-2 text-xs leading-snug">
                              {(selectedOrder.events ?? []).map((ev: any) => (
                                <div key={ev.id}>
                                  <span className="text-muted-foreground">
                                    {new Date(ev.createdAt).toLocaleString()} •
                                  </span>{' '}
                                  <span className="font-medium">{ev.type}</span>
                                  {ev.message ? ` — ${ev.message}` : ''}
                                </div>
                              ))}
                            </div>
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="userInput" className="space-y-3 mt-2">
                          {selectedOrder.inputPayload ? (
                            <div className="grid gap-4">
                              <div className="space-y-1">
                                <span className="text-xs font-medium text-muted-foreground uppercase">{t.recipientName}</span>
                                <div className="text-sm border rounded-md p-2 bg-muted/20">{selectedOrder.inputPayload.recipientName}</div>
                              </div>
                              <div className="space-y-1">
                                <span className="text-xs font-medium text-muted-foreground uppercase">{t.yourName}</span>
                                <div className="text-sm border rounded-md p-2 bg-muted/20">{selectedOrder.inputPayload.yourName || '-'}</div>
                              </div>
                              <div className="space-y-1">
                                <span className="text-xs font-medium text-muted-foreground uppercase">{t.occasion}</span>
                                <div className="text-sm border rounded-md p-2 bg-muted/20">{selectedOrder.inputPayload.occasion}</div>
                              </div>
                              <div className="space-y-1">
                                <span className="text-xs font-medium text-muted-foreground uppercase">{t.story}</span>
                                <div className="text-sm border rounded-md p-2 bg-muted/20 whitespace-pre-wrap">{selectedOrder.inputPayload.story}</div>
                              </div>
                              
                              {selectedOrder.inputPayload.musicPreferences && (
                                <div className="space-y-2 pt-2">
                                  <span className="text-xs font-medium text-muted-foreground uppercase border-b pb-1 block">{t.musicPreferences}</span>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                      <span className="text-[10px] text-muted-foreground uppercase">{t.genre}</span>
                                      <div className="text-sm font-medium">{selectedOrder.inputPayload.musicPreferences.genre || '-'}</div>
                                    </div>
                                    <div className="space-y-1">
                                      <span className="text-[10px] text-muted-foreground uppercase">{t.mood}</span>
                                      <div className="text-sm font-medium">{selectedOrder.inputPayload.musicPreferences.mood || '-'}</div>
                                    </div>
                                    <div className="space-y-1">
                                      <span className="text-[10px] text-muted-foreground uppercase">{t.vibe}</span>
                                      <div className="text-sm font-medium">{selectedOrder.inputPayload.musicPreferences.vibe || '-'}</div>
                                    </div>
                                    <div className="space-y-1">
                                      <span className="text-[10px] text-muted-foreground uppercase">{t.tempo}</span>
                                      <div className="text-sm font-medium">{selectedOrder.inputPayload.musicPreferences.tempo || '-'}</div>
                                    </div>
                                    <div className="space-y-1">
                                      <span className="text-[10px] text-muted-foreground uppercase">{t.voiceStyle}</span>
                                      <div className="text-sm font-medium">{selectedOrder.inputPayload.musicPreferences.voiceStyle || '-'}</div>
                                    </div>
                                    <div className="space-y-1">
                                      <span className="text-[10px] text-muted-foreground uppercase">{t.language}</span>
                                      <div className="text-sm font-medium">{selectedOrder.inputPayload.musicPreferences.language || '-'}</div>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {selectedOrder.inputPayload.extraNotes && (
                                <div className="space-y-1">
                                  <span className="text-xs font-medium text-muted-foreground uppercase">{t.extraNotes}</span>
                                  <div className="text-sm border rounded-md p-2 bg-muted/20 whitespace-pre-wrap">{selectedOrder.inputPayload.extraNotes}</div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-muted-foreground text-center py-8 text-sm">No input data available</div>
                          )}
                        </TabsContent>
                      </Tabs>

                      <Button variant="outline" className="w-full md:hidden" onClick={() => setSelectedOrder(null)}>
                        {t.closeDetails}
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="hidden items-center justify-center rounded-lg border border-dashed p-4 text-center text-muted-foreground md:flex">
                    {t.selectOrder}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
