import { useEffect, useMemo, useRef, useState } from 'react'
import { Settings as SettingsIcon, MessageSquare, Users, ShoppingBag } from 'lucide-react'

import { AdminApp } from '@/features/admin/AdminApp'
import * as adminApi from '@/features/admin/api'
import { translations as importedTranslations, type AdminLang } from '@/features/admin/i18n'
import { tokenStorage } from '@/features/admin/storage'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

import type { CustomerDetail, CustomerListItem, DraftDetail, OrderDetail, OrderListItem, PromptTemplate, PublicSiteDraft, Settings } from '@/features/admin/types'
import { buildDraftFromSettings, buildPublicSiteConfigPayload } from '@/features/admin/publicSiteDraft'
import { AdminLayout } from '@/features/admin/components/AdminLayout'
import { PublicSiteConfigSection } from '@/features/admin/tabs/settings/PublicSiteConfigSection'
import { AdminPromptsTab } from '@/features/admin/tabs/prompts/AdminPromptsTab'
import { AdminCustomersTab } from '@/features/admin/tabs/customers/AdminCustomersTab'
import { AdminOrdersTab } from '@/features/admin/tabs/orders/AdminOrdersTab'
import { AdminSettingsTab } from '@/features/admin/tabs/settings/AdminSettingsTab'

const translations = importedTranslations
/*
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
    emailOtpEnabled: 'Verifikasi OTP email',
    agreementEnabled: 'Agreement di checkout',
    deliveryDelay: 'Penundaan pengiriman (jam) (saat instan NONAKTIF)',
    whatsappGateway: 'WhatsApp Gateway',
    whatsappGatewayDesc:
      'Pilih provider WhatsApp dan konfigurasi template reminder (tanpa variable) yang mengingatkan bahwa lagu sudah dikirim ke email.',
    publicSite: 'Landing & Toast',
    publicSiteDesc: 'Konten landing page (route /) dan toast aktivitas (format JSON).',
    landingJson: 'Landing JSON',
    toastJson: 'Toast JSON',
    publicSiteUpdateHelp: 'Edit JSON lalu klik Update. Kosongkan untuk {}.',
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
    resendDelivery: 'Resend email + WhatsApp',
    resendEmail: 'Resend email',
    resendWhatsApp: 'Resend WhatsApp',
    deliveryDebug: 'Detail Pengiriman',
    contact: 'Kontak',
    email: 'Email',
    phone: 'Nomor WhatsApp',
    sunoRequest: 'Prompt ke Suno/Kie.ai',
    sunoAuditPrompt: 'Audit prompt (music template)',
    lyricsSent: 'Lyrics (prompt)',
    styleSent: 'Style',
    titleSent: 'Title',
    modelSent: 'Model',
    taskId: 'Task ID',
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
    failedResendDelivery: 'Gagal resend pengiriman',
    failedResendEmail: 'Gagal resend email',
    failedResendWhatsApp: 'Gagal resend WhatsApp',
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
    emailOtpEnabled: 'Email OTP verification',
    agreementEnabled: 'Checkout agreement',
    deliveryDelay: 'Delivery delay (hours) (when instant is OFF)',
    whatsappGateway: 'WhatsApp Gateway',
    whatsappGatewayDesc:
      'Select WhatsApp provider and configure a reminder template (no variables) that confirms the song has been sent to the user email.',
    publicSite: 'Landing & Toast',
    publicSiteDesc: 'Landing page content (route /) and activity toast (JSON).',
    landingJson: 'Landing JSON',
    toastJson: 'Toast JSON',
    publicSiteUpdateHelp: 'Edit JSON then click Update. Leave blank for {}.',
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
    resendDelivery: 'Resend email + WhatsApp',
    resendEmail: 'Resend email',
    resendWhatsApp: 'Resend WhatsApp',
    deliveryDebug: 'Delivery Details',
    contact: 'Contact',
    email: 'Email',
    phone: 'WhatsApp number',
    sunoRequest: 'Prompt sent to Suno/Kie.ai',
    sunoAuditPrompt: 'Audit prompt (music template)',
    lyricsSent: 'Lyrics (prompt)',
    styleSent: 'Style',
    titleSent: 'Title',
    modelSent: 'Model',
    taskId: 'Task ID',
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
    failedResendDelivery: 'Failed to resend delivery',
    failedResendEmail: 'Failed to resend email',
    failedResendWhatsApp: 'Failed to resend WhatsApp',
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
*/

// (types + public site draft helpers + token storage moved to `features/admin/*`)

function AdminRouteLegacy() {
  const storage = useMemo(() => tokenStorage(), [])
  const [token, setToken] = useState<string | null>(() => storage.get())

  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [loadingAuth, setLoadingAuth] = useState(false)

    const [tab, setTab] = useState<'settings' | 'prompts' | 'customers' | 'orders'>('settings')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [lang, setLang] = useState<AdminLang>('id')
  
  const t = translations[lang] as any

  const [settings, setSettings] = useState<Settings | null>(null)
  const [publicSiteDraft, setPublicSiteDraft] = useState<PublicSiteDraft>(() => buildDraftFromSettings(null))
  const [publicCfgError, setPublicCfgError] = useState<string | null>(null)
  const [publicCfgSavedAt, setPublicCfgSavedAt] = useState<string | null>(null)
  const [publicCfgBaseline, setPublicCfgBaseline] = useState<string>(() =>
    JSON.stringify(buildPublicSiteConfigPayload(buildDraftFromSettings(null))),
  )
  const lastLoadedSettingsIdRef = useRef<string | null>(null)
  const [templates, setTemplates] = useState<PromptTemplate[]>([])
  const [customers, setCustomers] = useState<CustomerListItem[]>([])
  const [orders, setOrders] = useState<OrderListItem[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<(CustomerDetail | DraftDetail) | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const publicCfgCurrent = useMemo(
    () => JSON.stringify(buildPublicSiteConfigPayload(publicSiteDraft)),
    [publicSiteDraft],
  )
  const publicCfgIsDirty = publicCfgCurrent !== publicCfgBaseline

  async function login() {
    setLoadingAuth(true)
    setAuthError(null)
    try {
      const res = await adminApi.adminLogin(password)
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
    const s = await adminApi.adminGetSettings(token)
    setSettings(s)
  }

  async function refreshTemplates() {
    if (!token) return
    const items = await adminApi.adminGetPromptTemplates(token)
    setTemplates(items)
  }

  async function refreshCustomers() {
    if (!token) return
    const items = await adminApi.adminGetCustomers(token)
    // Backward compatibility: older API might not send `kind`.
    setCustomers(items.map((c: any) => ({ kind: c?.kind ?? 'customer', ...c })))
  }

  async function refreshOrders() {
    if (!token) return
    const items = await adminApi.adminGetOrders(token)
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

  useEffect(() => {
    if (!settings) return
    if (lastLoadedSettingsIdRef.current === settings.id) return
    lastLoadedSettingsIdRef.current = settings.id
    const draft = buildDraftFromSettings(settings)
    setPublicSiteDraft(draft)
    setPublicCfgError(null)
    setPublicCfgSavedAt(null)
    setPublicCfgBaseline(JSON.stringify(buildPublicSiteConfigPayload(draft)))
  }, [settings])

  async function saveSettings(
    partial: Partial<Settings> & { openaiApiKey?: string; kaiAiApiKey?: string; ycloudApiKey?: string },
  ) {
    if (!token) return null
    setError(null)
    setLoading(true)
    try {
      const updated = await adminApi.adminSaveSettings(token, partial)
      setSettings(updated)
      return updated
    } catch (e: any) {
      setError(e?.message ?? t.failedSaveSettings)
      return null
    } finally {
      setLoading(false)
    }
  }

  async function savePublicSiteConfig() {
    if (!token) return
    setPublicCfgError(null)
    const publicSiteConfig = buildPublicSiteConfigPayload(publicSiteDraft)
    const updated = await saveSettings({ publicSiteConfig: publicSiteConfig as any })
    if (updated) {
      setPublicCfgSavedAt(new Date().toLocaleTimeString())
      setPublicCfgBaseline(JSON.stringify(publicSiteConfig))
    }
  }

  async function savePromptTemplate(id: string, templateText: string) {
    if (!token) return
    setError(null)
    setLoading(true)
    try {
      await adminApi.adminUpdatePromptTemplate(token, id, { templateText })
      await refreshTemplates()
      setTab('prompts')
    } catch (e: any) {
      setError(e?.message ?? (t.failedSaveTemplate ?? t.failedSaveSettings ?? 'Failed to save template'))
    } finally {
      setLoading(false)
    }
  }

  async function openCustomer(id: string) {
    if (!token) return
    setError(null)
    setLoading(true)
    try {
      if (id.startsWith('draft:')) {
        const draftId = id.slice('draft:'.length)
        const draft = await adminApi.adminGetOrderDraft(token, draftId)
        setSelectedCustomer(draft)
      } else {
        const detail = await adminApi.adminGetCustomer(token, id)
        setSelectedCustomer({ kind: 'customer', ...detail })
      }
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
      const detail = await adminApi.adminGetOrder(token, id)
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
      await adminApi.adminRetryOrder(token, id)
      await refreshOrders()
      await openOrder(id)
    } catch (e: any) {
      setError(e?.message ?? t.failedRetryOrder)
    } finally {
      setLoading(false)
    }
  }

  async function resendEmail(id: string) {
    if (!token) return
    setError(null)
    setLoading(true)
    try {
      await adminApi.adminResendEmail(token, id)
      await refreshOrders()
      await openOrder(id)
    } catch (e: any) {
      setError(e?.message ?? t.failedResendEmail)
    } finally {
      setLoading(false)
    }
  }

  async function resendWhatsApp(id: string) {
    if (!token) return
    setError(null)
    setLoading(true)
    try {
      await adminApi.adminResendWhatsApp(token, id)
      await refreshOrders()
      await openOrder(id)
    } catch (e: any) {
      setError(e?.message ?? t.failedResendWhatsApp)
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

  return (
    <AdminLayout
      brandLabel={t.adminPanel}
      title={t[tab as keyof typeof t] || tab}
      isLoading={loading}
      loadingLabel={t.loading}
      error={error}
      navItems={[
        { value: 'settings', icon: SettingsIcon, label: t.settings },
        { value: 'prompts', icon: MessageSquare, label: t.prompts },
        { value: 'customers', icon: Users, label: t.customers },
        { value: 'orders', icon: ShoppingBag, label: t.orders },
      ]}
      activeNav={tab}
      onSelectNav={(v) => {
        setTab(v)
        setIsSidebarOpen(false)
      }}
      lang={lang}
      setLang={setLang}
      switchToEnglishLabel={t.switchToEnglish}
      switchToIndonesianLabel={t.switchToIndonesian}
      logoutLabel={t.logout}
      onLogout={logout}
      isSidebarOpen={isSidebarOpen}
      setIsSidebarOpen={setIsSidebarOpen}
      isCollapsed={isCollapsed}
      setIsCollapsed={setIsCollapsed}
    >
      {tab === 'settings' && (
        <AdminSettingsTab>
          <div className="grid gap-2 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-start h-[calc(100vh-140px)]">
              {/* Card: Public Site Config (Landing + Toast) */}
              {settings ? (
                <PublicSiteConfigSection
                  draft={publicSiteDraft}
                  setDraft={setPublicSiteDraft}
                  onSave={savePublicSiteConfig}
                  isDirty={publicCfgIsDirty}
                  savedAt={publicCfgSavedAt}
                  error={publicCfgError}
                  setError={setPublicCfgError}
                  loading={loading}
                  token={token}
                  t={t}
                  // Extra Props for integrated sections
                  settings={settings}
                  setSettings={setSettings}
                  saveSettings={saveSettings}
                />
              ) : (
                <Card className="h-full shadow-sm md:col-span-2 lg:col-span-3 flex items-center justify-center p-6">
                   <p className="text-muted-foreground">{loading ? t.loadingShort : t.noSettings}</p>
                </Card>
              )}
          </div>
        </AdminSettingsTab>
      )}

      {tab === 'prompts' && (
        <AdminSettingsTab>
          <div className="h-[calc(100vh-140px)]">
            <AdminPromptsTab
              t={t}
              templates={templates}
              loading={loading}
              onSaveTemplate={(id, templateText) => void savePromptTemplate(id, templateText)}
            />
          </div>
        </AdminSettingsTab>
      )}

      {tab === 'customers' && (
        <AdminSettingsTab>
          <div className="h-[calc(100vh-140px)]">
            <AdminCustomersTab
              t={t}
              customers={customers}
              selectedCustomer={selectedCustomer}
              onSelectCustomer={setSelectedCustomer}
              onOpenCustomer={(id) => void openCustomer(id)}
              onOpenOrder={(id) => void openOrder(id)}
            />
          </div>
        </AdminSettingsTab>
      )}

      {tab === 'orders' && (
        <AdminSettingsTab>
          <div className="h-[calc(100vh-140px)]">
            <AdminOrdersTab
              t={t}
              orders={orders}
              selectedOrder={selectedOrder}
              onSelectOrder={setSelectedOrder}
              onOpenOrder={(id) => void openOrder(id)}
              onRetryOrder={(id) => void retryOrder(id)}
              onResendEmail={(id) => void resendEmail(id)}
              onResendWhatsApp={(id) => void resendWhatsApp(id)}
              loading={loading}
            />
          </div>
        </AdminSettingsTab>
      )}
    </AdminLayout>
  )
}

export function AdminRoute() {
  return (
    <AdminApp>
      <AdminRouteLegacy />
    </AdminApp>
  )
}
