import { useEffect, useMemo, useState } from 'react'
import { Settings as SettingsIcon, MessageSquare, Users, ShoppingBag, BarChart3, Palette, Video, Tag, Shield } from 'lucide-react'

import { AdminApp } from '@/features/admin/AdminApp'
import * as adminApi from '@/features/admin/api'
import { translations as importedTranslations, type AdminLang } from '@/features/admin/i18n'
import { tokenStorage, type StoredUser } from '@/features/admin/storage'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

import type { CustomerDetail, DraftDetail, OrderDetail, PromptTemplate, Settings } from '@/features/admin/types'
import { AdminLayout } from '@/features/admin/components/AdminLayout'
import { SystemSettingsSection } from '@/features/admin/tabs/settings/SystemSettingsSection'
import { AdminPromptsTab } from '@/features/admin/tabs/prompts/AdminPromptsTab'
import { AdminCustomersTab } from '@/features/admin/tabs/customers/AdminCustomersTab'
import { AdminOrdersTab } from '@/features/admin/tabs/orders/AdminOrdersTab'
import { AdminSettingsTab } from '@/features/admin/tabs/settings/AdminSettingsTab'
import { AdminFunnelTab } from '@/features/admin/tabs/funnel/AdminFunnelTab'
import { AdminThemesTab } from '@/features/admin/tabs/themes/AdminThemesTab'
import { AdminTestimonialsTab } from '@/features/admin/tabs/testimonials/AdminTestimonialsTab'
import { AdminDiscountsTab } from '@/features/admin/tabs/discounts/AdminDiscountsTab'
import { AdminUsersTab } from '@/features/admin/tabs/users/AdminUsersTab'

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
    ycloudWebhookSecretLabel: 'Webhook Secret',
    ycloudWebhookSecretPlaceholder: 'Set webhook secret (disimpan terenkripsi)',
    ycloudWebhookSecretStatus: 'Webhook secret saat ini: {status}.',
    ycloudWebhookUrlLabel: 'Webhook URL (konfigurasikan di YCloud)',
    siteUrlLabel: 'Site URL',
    siteUrlPlaceholder: 'contoh: https://laguin.id',
    siteUrlHelp: 'Digunakan untuk membangun link pengiriman di WhatsApp.',
    copied: 'Disalin!',
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
    backToOrders: 'Kembali ke Pesanan',
    noEventsRecorded: 'Tidak ada event tercatat.',
    noInputData: 'Tidak ada data input.',
    searchPlaceholder: 'Cari berdasarkan nama, ID, atau telepon...',
    orderDetailsTitle: 'Detail Pesanan',
    deliveryStatus: 'Status Pengiriman',
    generatedTrack: 'Track Dibuat',
    noTrackYet: 'Belum ada track.',
    resendEmailShort: 'Resend Email',
    resendWhatsAppShort: 'Resend WA',
    activityLog: 'Riwayat Aktivitas',
    noOrdersFound: 'Tidak ada pesanan ditemukan.',
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
    ycloudWebhookSecretLabel: 'Webhook Secret',
    ycloudWebhookSecretPlaceholder: 'Set webhook secret (stored encrypted)',
    ycloudWebhookSecretStatus: 'Current webhook secret: {status}.',
    ycloudWebhookUrlLabel: 'Webhook URL (configure in YCloud)',
    siteUrlLabel: 'Site URL',
    siteUrlPlaceholder: 'e.g. https://laguin.id',
    siteUrlHelp: 'Used to build delivery links in WhatsApp messages.',
    copied: 'Copied!',
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
    backToOrders: 'Back to Orders',
    noEventsRecorded: 'No events recorded.',
    noInputData: 'No input data found.',
    searchPlaceholder: 'Search by name, ID, or phone...',
    orderDetailsTitle: 'Order Details',
    deliveryStatus: 'Delivery Status',
    generatedTrack: 'Generated Track',
    noTrackYet: 'No track generated yet',
    resendEmailShort: 'Resend Email',
    resendWhatsAppShort: 'Resend WA',
    activityLog: 'Activity Log',
    noOrdersFound: 'No orders found.',
  }
}
*/

// (types + public site draft helpers + token storage moved to `features/admin/*`)

function AdminRouteLegacy() {
  const storage = useMemo(() => tokenStorage(), [])
  const [token, setToken] = useState<string | null>(() => storage.get())

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [loadingAuth, setLoadingAuth] = useState(false)
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(() => storage.getUser())

    const [tab, setTab] = useState<'settings' | 'prompts' | 'customers' | 'orders' | 'funnel' | 'themes' | 'testimonials' | 'discounts' | 'users'>('orders')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [lang, setLang] = useState<AdminLang>('en')
  
  const t = translations[lang] as any

  const [settings, setSettings] = useState<Settings | null>(null)
  const [templates, setTemplates] = useState<PromptTemplate[]>([])
  const [ordersRefreshTrigger, setOrdersRefreshTrigger] = useState(0)
  const [customersRefreshTrigger, setCustomersRefreshTrigger] = useState(0)
  const [selectedCustomer, setSelectedCustomer] = useState<(CustomerDetail | DraftDetail) | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function login() {
    setLoadingAuth(true)
    setAuthError(null)
    try {
      const res = await adminApi.adminLogin(username, password)
      storage.set(res.token)
      const me = await adminApi.adminGetMe(res.token)
      const user: StoredUser = {
        userId: me.userId,
        username: me.username,
        role: me.role as 'admin' | 'user',
        permissions: me.permissions,
      }
      storage.setUser(user)
      setCurrentUser(user)
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
    setCurrentUser(null)
    setSettings(null)
    setTemplates([])
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

  useEffect(() => {
    if (!token) return
    setLoading(true)
    setError(null)
    Promise.all([refreshSettings(), refreshTemplates()])
      .catch((e) => setError(e?.message ?? t.failedLoadAdmin))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function saveSettings(
    partial: Partial<Settings> & { openaiApiKey?: string; kaiAiApiKey?: string; ycloudApiKey?: string; ycloudWebhookSecret?: string },
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

  async function loadDefaultPrompts() {
    if (!token) return
    setError(null)
    setLoading(true)
    try {
      await adminApi.adminInstallRecommendedTemplates(token)
      await refreshTemplates()
    } catch (e: any) {
      setError(e?.message ?? (t.failedInstallRecommended ?? 'Failed to load default templates'))
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
      setOrdersRefreshTrigger((n) => n + 1)
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
      setOrdersRefreshTrigger((n) => n + 1)
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
      setOrdersRefreshTrigger((n) => n + 1)
      await openOrder(id)
    } catch (e: any) {
      setError(e?.message ?? t.failedResendWhatsApp)
    } finally {
      setLoading(false)
    }
  }

  async function markDelivered(id: string) {
    if (!token) return
    setError(null)
    setLoading(true)
    try {
      const updated = await adminApi.adminMarkDelivered(token, id)
      setSelectedOrder(updated)
      setOrdersRefreshTrigger((n) => n + 1)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to mark as delivered')
    } finally {
      setLoading(false)
    }
  }

  async function bulkDeleteOrders(ids: string[]) {
    if (!token) return
    setError(null)
    setLoading(true)
    try {
      await adminApi.adminBulkDeleteOrders(token, ids)
      setSelectedOrder(null)
      setOrdersRefreshTrigger((n) => n + 1)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to delete orders')
    } finally {
      setLoading(false)
    }
  }

  async function bulkClearTracks(ids: string[]) {
    if (!token) return
    setError(null)
    setLoading(true)
    try {
      await adminApi.adminBulkClearTracks(token, ids)
      setOrdersRefreshTrigger((n) => n + 1)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to clear tracks')
    } finally {
      setLoading(false)
    }
  }

  async function bulkResendWhatsApp(ids: string[]) {
    if (!token) return
    setError(null)
    setLoading(true)
    try {
      await adminApi.adminBulkResendWhatsApp(token, ids)
      setOrdersRefreshTrigger((n) => n + 1)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to resend WhatsApp messages')
    } finally {
      setLoading(false)
    }
  }

  async function bulkDeleteCustomers(ids: string[]) {
    if (!token) return
    setError(null)
    setLoading(true)
    try {
      await adminApi.adminBulkDeleteCustomers(token, ids)
      setSelectedCustomer(null)
      setCustomersRefreshTrigger((n) => n + 1)
      setOrdersRefreshTrigger((n) => n + 1)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to delete customers')
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
            <CardDescription>{t.loginDesc ?? 'Enter your credentials to log in.'}</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t.username ?? 'Username'}
              autoComplete="username"
            />
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.password ?? 'Password'}
              autoComplete="current-password"
              onKeyDown={(e) => { if (e.key === 'Enter') void login() }}
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
      navItems={(() => {
        const all = [
          { value: 'orders', icon: ShoppingBag, label: t.orders },
          { value: 'funnel', icon: BarChart3, label: t.funnel },
          { value: 'customers', icon: Users, label: t.customers },
          { value: 'settings', icon: SettingsIcon, label: t.settings },
          { value: 'prompts', icon: MessageSquare, label: t.prompts },
          { value: 'themes', icon: Palette, label: t.themes },
          { value: 'testimonials', icon: Video, label: t.testimonials },
          { value: 'discounts', icon: Tag, label: t.discounts ?? 'Discounts' },
          ...(currentUser?.role === 'admin' ? [{ value: 'users', icon: Shield, label: t.users ?? 'Users' }] : []),
        ]
        if (!currentUser || currentUser.role === 'admin') return all
        const perms = currentUser.permissions ?? []
        return all.filter((item) => perms.includes(item.value))
      })()}
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
          <div className="h-[calc(100vh-140px)]">
            {settings ? (
              <SystemSettingsSection
                settings={settings}
                setSettings={setSettings}
                saveSettings={saveSettings}
                loading={loading}
                t={t}
                token={token}
              />
            ) : (
              <Card className="h-full shadow-sm flex items-center justify-center p-6">
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
              onLoadDefaults={() => loadDefaultPrompts()}
            />
          </div>
        </AdminSettingsTab>
      )}

      {tab === 'customers' && (
        <AdminSettingsTab>
          <div className="h-[calc(100vh-140px)]">
            <AdminCustomersTab
              t={t}
              token={token ?? ''}
              selectedCustomer={selectedCustomer}
              onSelectCustomer={setSelectedCustomer}
              onOpenCustomer={(id) => void openCustomer(id)}
              onOpenOrder={(id) => void openOrder(id)}
              onBulkDelete={bulkDeleteCustomers}
              loading={loading}
              refreshTrigger={customersRefreshTrigger}
            />
          </div>
        </AdminSettingsTab>
      )}

      {tab === 'orders' && (
        <AdminSettingsTab>
          <div className="h-[calc(100vh-140px)]">
            <AdminOrdersTab
              t={t}
              token={token ?? ''}
              selectedOrder={selectedOrder}
              onSelectOrder={setSelectedOrder}
              onOpenOrder={(id) => void openOrder(id)}
              onRetryOrder={(id) => void retryOrder(id)}
              onResendEmail={(id) => void resendEmail(id)}
              onResendWhatsApp={(id) => void resendWhatsApp(id)}
              onMarkDelivered={(id) => void markDelivered(id)}
              onBulkDelete={bulkDeleteOrders}
              onBulkClearTracks={bulkClearTracks}
              onBulkResendWhatsApp={bulkResendWhatsApp}
              loading={loading}
              refreshTrigger={ordersRefreshTrigger}
            />
          </div>
        </AdminSettingsTab>
      )}

      {tab === 'funnel' && token && (
        <AdminFunnelTab t={t} token={token} />
      )}

      {tab === 'themes' && token && (
        <AdminThemesTab
          t={t}
          token={token}
          defaultThemeSlug={settings?.defaultThemeSlug ?? null}
          onDefaultThemeChange={async (slug) => {
            await saveSettings({ defaultThemeSlug: slug } as any)
          }}
        />
      )}

      {tab === 'testimonials' && token && (
        <AdminSettingsTab>
          <AdminTestimonialsTab token={token} t={t} />
        </AdminSettingsTab>
      )}

      {tab === 'discounts' && token && (
        <AdminSettingsTab>
          <AdminDiscountsTab token={token} t={t} />
        </AdminSettingsTab>
      )}

      {tab === 'users' && token && currentUser?.role === 'admin' && (
        <AdminSettingsTab>
          <AdminUsersTab token={token} t={t} currentUserId={currentUser.userId} />
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
