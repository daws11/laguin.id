import { useEffect, useMemo, useRef, useState } from 'react'
import { SupportedPlaceholders, validatePlaceholders } from 'shared'
import { LayoutDashboard, Settings as SettingsIcon, MessageSquare, Users, ShoppingBag, LogOut, Menu, ChevronLeft, ChevronRight } from 'lucide-react'

import { apiGet, apiPost, apiPut, apiUpload, resolveApiUrl } from '@/lib/http'
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
  publicSiteConfig: unknown | null
  hasOpenaiKey: boolean
  hasKaiAiKey: boolean

  // YCloud WhatsApp gateway settings (safe fields only)
  ycloudFrom: string | null
  ycloudTemplateName: string | null
  ycloudTemplateLangCode: string | null
  hasYcloudKey: boolean
}

type LandingPlaylistItem = { title: string; subtitle: string; ctaLabel: string; audioUrl: string }
type ToastItem = { fullName: string; city: string; recipientName: string }

type PublicSiteDraft = {
  landing: {
    heroMedia: {
      mode: 'image' | 'video'
      imageUrl: string
      videoUrl: string
    }
    heroOverlay: {
      quote: string
      authorName: string
      authorLocation: string
      authorAvatarUrl: string
    }
    heroPlayer: {
      enabled: boolean
      playingBadgeText: string
      cornerBadgeText: string
      verifiedBadgeText: string
      quote: string
      authorName: string
      authorSubline: string
      authorAvatarUrl: string
      audioUrl: string
    }
    audioSamples: {
      nowPlaying: {
        name: string
        quote: string
        time: string
        metaText: string
        audioUrl: string
      }
      playlist: LandingPlaylistItem[]
    }
  }
  activityToast: {
    enabled: boolean
    intervalMs: number
    durationMs: number
    items: ToastItem[]
  }
}

const defaultPublicSiteDraft: PublicSiteDraft = {
  landing: {
    heroMedia: {
      mode: 'image',
      imageUrl: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=2940&auto=format&fit=crop',
      videoUrl: '',
    },
    heroOverlay: {
      quote: 'Dia menangis sebelum chorus berakhir',
      authorName: 'Rina M.',
      authorLocation: 'Jakarta',
      authorAvatarUrl: 'https://randomuser.me/api/portraits/women/44.jpg',
    },
    heroPlayer: {
      enabled: true,
      playingBadgeText: 'Playing',
      cornerBadgeText: "Valentine's Special",
      verifiedBadgeText: 'Verified Purchase',
      quote: 'He tried not to cry. He failed.',
      authorName: 'Rachel M.',
      authorSubline: "London • Valentine's 2025",
      authorAvatarUrl: 'https://randomuser.me/api/portraits/women/44.jpg',
      audioUrl: '',
    },
    audioSamples: {
      nowPlaying: {
        name: 'Untuk Budi, Sepanjang Masa',
        quote: 'Setiap momen bersamamu Budi, dari kencan pertama yang gugup itu...',
        time: '3:24',
        metaText: 'London • Verified',
        audioUrl: '',
      },
      playlist: [
        { title: 'Untuk Rizky, Segalanya Bagiku', subtitle: 'Country • 3:12', ctaLabel: 'PUTAR', audioUrl: '' },
        { title: 'Untuk Dimas, 10 Tahun Bersama', subtitle: 'Acoustic • 2:58', ctaLabel: 'PUTAR', audioUrl: '' },
        { title: 'Untuk Andi, Petualangan Kita', subtitle: 'Pop Ballad • 3:45', ctaLabel: 'PUTAR', audioUrl: '' },
      ],
    },
  },
  activityToast: {
    enabled: true,
    intervalMs: 10000,
    durationMs: 4500,
    items: [
      { fullName: 'Abdurrahman Firdaus', city: 'Bandung', recipientName: 'Salsa' },
      { fullName: 'Nabila Putri', city: 'Jakarta', recipientName: 'Rizky' },
      { fullName: 'Andreas Wijaya', city: 'Surabaya', recipientName: 'Dima' },
    ],
  },
}

function asString(v: unknown, fallback: string) {
  return typeof v === 'string' ? v : fallback
}

function asNumber(v: unknown, fallback: number) {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

function asBool(v: unknown, fallback: boolean) {
  return typeof v === 'boolean' ? v : fallback
}

function safeArr<T>(v: unknown, map: (x: any) => T): T[] {
  if (!Array.isArray(v)) return []
  return v.map(map)
}

function clampInt(n: number, min: number, max: number) {
  const x = Math.floor(n)
  return Math.min(max, Math.max(min, x))
}

function moveItem<T>(arr: T[], from: number, to: number) {
  const copy = [...arr]
  const item = copy.splice(from, 1)[0]
  copy.splice(to, 0, item)
  return copy
}

function parseToastItemsJson(raw: string): ToastItem[] {
  const parsed = JSON.parse(raw) as any
  const arr = Array.isArray(parsed) ? parsed : parsed && typeof parsed === 'object' ? parsed.items : null
  if (!Array.isArray(arr)) return []
  return safeArr(arr, (x) => ({
    fullName: asString(x?.fullName, '').trim(),
    city: asString(x?.city, '').trim(),
    recipientName: asString(x?.recipientName, '').trim(),
  })).filter((x) => x.fullName || x.city || x.recipientName)
}

function buildDraftFromSettings(s: Settings | null): PublicSiteDraft {
  const cfg =
    s?.publicSiteConfig && typeof s.publicSiteConfig === 'object' ? (s.publicSiteConfig as any) : {}
  const landing = cfg?.landing && typeof cfg.landing === 'object' ? cfg.landing : {}
  const heroMedia = landing?.heroMedia && typeof landing.heroMedia === 'object' ? landing.heroMedia : {}
  const heroOverlay = landing?.heroOverlay && typeof landing.heroOverlay === 'object' ? landing.heroOverlay : {}
  const heroPlayer = landing?.heroPlayer && typeof landing.heroPlayer === 'object' ? landing.heroPlayer : {}
  const audioSamples = landing?.audioSamples && typeof landing.audioSamples === 'object' ? landing.audioSamples : {}
  const nowPlaying = audioSamples?.nowPlaying && typeof audioSamples.nowPlaying === 'object' ? audioSamples.nowPlaying : {}

  const playlist = safeArr(audioSamples?.playlist, (x) => ({
    title: asString(x?.title, ''),
    subtitle: asString(x?.subtitle, ''),
    ctaLabel: asString(x?.ctaLabel, 'PUTAR'),
    audioUrl: asString(x?.audioUrl, ''),
  })).filter((x) => x.title || x.subtitle || x.audioUrl)

  const toast = cfg?.activityToast && typeof cfg.activityToast === 'object' ? cfg.activityToast : {}
  const toastItems = safeArr(toast?.items, (x) => ({
    fullName: asString(x?.fullName, ''),
    city: asString(x?.city, ''),
    recipientName: asString(x?.recipientName, ''),
  })).filter((x) => x.fullName || x.city || x.recipientName)

  const imageUrl = asString(heroMedia?.imageUrl, defaultPublicSiteDraft.landing.heroMedia.imageUrl)
  const videoUrl = asString(heroMedia?.videoUrl, '')
  const mode: 'image' | 'video' =
    (heroMedia?.videoUrl && typeof heroMedia.videoUrl === 'string' && heroMedia.videoUrl.trim()) ? 'video' : 'image'

  return {
    landing: {
      heroMedia: {
        mode,
        imageUrl: imageUrl.trim() ? imageUrl : defaultPublicSiteDraft.landing.heroMedia.imageUrl,
        videoUrl: videoUrl ?? '',
      },
      heroOverlay: {
        quote: asString(heroOverlay?.quote, defaultPublicSiteDraft.landing.heroOverlay.quote),
        authorName: asString(heroOverlay?.authorName, defaultPublicSiteDraft.landing.heroOverlay.authorName),
        authorLocation: asString(heroOverlay?.authorLocation, defaultPublicSiteDraft.landing.heroOverlay.authorLocation),
        authorAvatarUrl: asString(heroOverlay?.authorAvatarUrl, defaultPublicSiteDraft.landing.heroOverlay.authorAvatarUrl),
      },
      heroPlayer: {
        enabled: asBool(heroPlayer?.enabled, defaultPublicSiteDraft.landing.heroPlayer.enabled),
        playingBadgeText: asString(heroPlayer?.playingBadgeText, defaultPublicSiteDraft.landing.heroPlayer.playingBadgeText),
        cornerBadgeText: asString(heroPlayer?.cornerBadgeText, defaultPublicSiteDraft.landing.heroPlayer.cornerBadgeText),
        verifiedBadgeText: asString(heroPlayer?.verifiedBadgeText, defaultPublicSiteDraft.landing.heroPlayer.verifiedBadgeText),
        quote: asString(heroPlayer?.quote, defaultPublicSiteDraft.landing.heroPlayer.quote),
        authorName: asString(heroPlayer?.authorName, defaultPublicSiteDraft.landing.heroPlayer.authorName),
        authorSubline: asString(heroPlayer?.authorSubline, defaultPublicSiteDraft.landing.heroPlayer.authorSubline),
        authorAvatarUrl: asString(heroPlayer?.authorAvatarUrl, defaultPublicSiteDraft.landing.heroPlayer.authorAvatarUrl),
        audioUrl: asString(heroPlayer?.audioUrl, defaultPublicSiteDraft.landing.heroPlayer.audioUrl),
      },
      audioSamples: {
        nowPlaying: {
          name: asString(nowPlaying?.name, defaultPublicSiteDraft.landing.audioSamples.nowPlaying.name),
          quote: asString(nowPlaying?.quote, defaultPublicSiteDraft.landing.audioSamples.nowPlaying.quote),
          time: asString(nowPlaying?.time, defaultPublicSiteDraft.landing.audioSamples.nowPlaying.time),
          metaText: asString(nowPlaying?.metaText, defaultPublicSiteDraft.landing.audioSamples.nowPlaying.metaText),
          audioUrl: asString(nowPlaying?.audioUrl, defaultPublicSiteDraft.landing.audioSamples.nowPlaying.audioUrl),
        },
        playlist: playlist.length ? playlist : defaultPublicSiteDraft.landing.audioSamples.playlist,
      },
    },
    activityToast: {
      enabled: asBool(toast?.enabled, defaultPublicSiteDraft.activityToast.enabled),
      intervalMs: clampInt(asNumber(toast?.intervalMs, defaultPublicSiteDraft.activityToast.intervalMs), 2000, 120000),
      durationMs: clampInt(asNumber(toast?.durationMs, defaultPublicSiteDraft.activityToast.durationMs), 1000, 60000),
      items: toastItems.length ? toastItems : defaultPublicSiteDraft.activityToast.items,
    },
  }
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
  const [publicSiteDraft, setPublicSiteDraft] = useState<PublicSiteDraft>(() => buildDraftFromSettings(null))
  const [toastItemsJson, setToastItemsJson] = useState('')
  const [toastItemsJsonError, setToastItemsJsonError] = useState<string | null>(null)
  const [toastItemsPage, setToastItemsPage] = useState(1)
  const [publicCfgError, setPublicCfgError] = useState<string | null>(null)
  const [publicCfgSavedAt, setPublicCfgSavedAt] = useState<string | null>(null)
  const lastLoadedSettingsIdRef = useRef<string | null>(null)
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

  const TOAST_ITEMS_PAGE_SIZE = 5
  const toastItemsTotal = publicSiteDraft.activityToast.items.length
  const toastItemsTotalPages = Math.max(1, Math.ceil(toastItemsTotal / TOAST_ITEMS_PAGE_SIZE))
  const toastItemsPageSafe = Math.min(toastItemsTotalPages, Math.max(1, toastItemsPage))
  const toastItemsStartIdx = (toastItemsPageSafe - 1) * TOAST_ITEMS_PAGE_SIZE
  const toastItemsEndIdx = Math.min(toastItemsTotal, toastItemsStartIdx + TOAST_ITEMS_PAGE_SIZE)

  // Keep page in range if items count changes.
  useEffect(() => {
    if (toastItemsPage !== toastItemsPageSafe) setToastItemsPage(toastItemsPageSafe)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toastItemsTotal, toastItemsTotalPages])

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

  useEffect(() => {
    if (!settings) return
    if (lastLoadedSettingsIdRef.current === settings.id) return
    lastLoadedSettingsIdRef.current = settings.id
    const draft = buildDraftFromSettings(settings)
    setPublicSiteDraft(draft)
    setPublicCfgError(null)
    setPublicCfgSavedAt(null)
  }, [settings])

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

  async function resendEmail(id: string) {
    if (!token) return
    setError(null)
    setLoading(true)
    try {
      await apiPost(`/api/admin/orders/${encodeURIComponent(id)}/resend-email`, {}, { token })
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
      await apiPost(`/api/admin/orders/${encodeURIComponent(id)}/resend-whatsapp`, {}, { token })
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
              {/* Card: Public Site Config (Landing + Toast) */}
              <Card className="h-full shadow-sm md:col-span-2 lg:col-span-3">
                <CardHeader className="p-3 pb-2 bg-muted/5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-sm font-semibold">{t.publicSite}</CardTitle>
                      <CardDescription className="text-[10px]">{t.publicSiteDesc}</CardDescription>
                    </div>
                    {publicCfgSavedAt ? (
                      <div className="text-[10px] text-green-700 bg-green-50 border border-green-100 px-2 py-1 rounded-full">
                        tersimpan {publicCfgSavedAt}
                      </div>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="p-3 space-y-3 text-xs">
                  {settings ? (
                    <Tabs defaultValue="landing" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="landing">Landing</TabsTrigger>
                        <TabsTrigger value="music">Music</TabsTrigger>
                        <TabsTrigger value="toast">Toast</TabsTrigger>
                      </TabsList>

                      <TabsContent value="landing" className="mt-3 space-y-3">
                        <div className="grid gap-3 lg:grid-cols-2 items-start">
                          <div className="space-y-3">
                            <div className="rounded-xl border bg-background p-3 space-y-2">
                              <div className="text-xs font-bold text-gray-900">Hero Media</div>
                              <div className="text-[10px] text-muted-foreground">
                                Catatan: bagian ini hanya untuk <span className="font-medium">gambar/video</span>. Untuk upload MP3 gunakan bagian <span className="font-medium">Hero Player</span> di bawah.
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  variant={publicSiteDraft.landing.heroMedia.mode === 'image' ? 'secondary' : 'outline'}
                                  size="sm"
                                  onClick={() =>
                                    setPublicSiteDraft((d) => ({
                                      ...d,
                                      landing: { ...d.landing, heroMedia: { ...d.landing.heroMedia, mode: 'image' } },
                                    }))
                                  }
                                >
                                  Image
                                </Button>
                                <Button
                                  type="button"
                                  variant={publicSiteDraft.landing.heroMedia.mode === 'video' ? 'secondary' : 'outline'}
                                  size="sm"
                                  onClick={() =>
                                    setPublicSiteDraft((d) => ({
                                      ...d,
                                      landing: { ...d.landing, heroMedia: { ...d.landing.heroMedia, mode: 'video' } },
                                    }))
                                  }
                                >
                                  Video
                                </Button>
                              </div>

                              <div className="space-y-1">
                                <div className="text-[10px] font-medium text-muted-foreground">Image URL</div>
                                <Input
                                  className="h-8 text-xs"
                                  value={publicSiteDraft.landing.heroMedia.imageUrl}
                                  onChange={(e) =>
                                    setPublicSiteDraft((d) => ({
                                      ...d,
                                      landing: {
                                        ...d.landing,
                                        heroMedia: { ...d.landing.heroMedia, imageUrl: e.target.value },
                                      },
                                    }))
                                  }
                                  placeholder="https://..."
                                />
                                <div className="pt-1">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="block w-full text-[11px]"
                                    onChange={async (e) => {
                                      const f = e.target.files?.[0]
                                      if (!f || !token) return
                                      try {
                                        setPublicCfgError(null)
                                        const fd = new FormData()
                                        fd.append('file', f)
                                        const res = await apiUpload<{ ok: true; path: string }>(
                                          '/api/admin/uploads?kind=image',
                                          fd,
                                          { token },
                                        )
                                        setPublicSiteDraft((d) => ({
                                          ...d,
                                          landing: {
                                            ...d.landing,
                                            heroMedia: { ...d.landing.heroMedia, mode: 'image', imageUrl: res.path },
                                          },
                                        }))
                                      } catch (err: any) {
                                        setPublicCfgError(err?.message ?? 'Upload gagal.')
                                      } finally {
                                        e.target.value = ''
                                      }
                                    }}
                                  />
                                  <div className="text-[10px] text-muted-foreground">Upload akan menghasilkan path seperti `/uploads/images/...`</div>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="text-[10px] font-medium text-muted-foreground">Video URL (MP4)</div>
                                  {publicSiteDraft.landing.heroMedia.mode !== 'video' ? (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        setPublicSiteDraft((d) => ({
                                          ...d,
                                          landing: { ...d.landing, heroMedia: { ...d.landing.heroMedia, mode: 'video' } },
                                        }))
                                      }
                                    >
                                      gunakan video
                                    </Button>
                                  ) : null}
                                </div>
                                <Input
                                  className="h-8 text-xs"
                                  value={publicSiteDraft.landing.heroMedia.videoUrl}
                                  onChange={(e) =>
                                    setPublicSiteDraft((d) => ({
                                      ...d,
                                      landing: { ...d.landing, heroMedia: { ...d.landing.heroMedia, videoUrl: e.target.value } },
                                    }))
                                  }
                                  placeholder="https://example.com/video.mp4 atau /uploads/videos/..."
                                />
                                <div className="pt-1">
                                  <input
                                    type="file"
                                    accept="video/mp4,video/webm,video/quicktime,video/*"
                                    className="block w-full text-[11px]"
                                    onChange={async (e) => {
                                      const f = e.target.files?.[0]
                                      if (!f || !token) return
                                      try {
                                        setPublicCfgError(null)
                                        const fd = new FormData()
                                        fd.append('file', f)
                                        const res = await apiUpload<{ ok: true; path: string }>(
                                          '/api/admin/uploads?kind=video',
                                          fd,
                                          { token },
                                        )
                                        setPublicSiteDraft((d) => ({
                                          ...d,
                                          landing: {
                                            ...d.landing,
                                            heroMedia: { ...d.landing.heroMedia, mode: 'video', videoUrl: res.path },
                                          },
                                        }))
                                      } catch (err: any) {
                                        setPublicCfgError(err?.message ?? 'Upload gagal.')
                                      } finally {
                                        e.target.value = ''
                                      }
                                    }}
                                  />
                                  <div className="text-[10px] text-muted-foreground">Upload akan menghasilkan path seperti `/uploads/videos/...`</div>
                                </div>
                              </div>
                            </div>

                            <div className="rounded-xl border bg-background p-3 space-y-2">
                              <div className="text-xs font-bold text-gray-900">Hero Overlay</div>
                              <div className="space-y-1">
                                <div className="text-[10px] font-medium text-muted-foreground">Quote</div>
                                <Input
                                  className="h-8 text-xs"
                                  value={publicSiteDraft.landing.heroOverlay.quote}
                                  onChange={(e) =>
                                    setPublicSiteDraft((d) => ({
                                      ...d,
                                      landing: {
                                        ...d.landing,
                                        heroOverlay: { ...d.landing.heroOverlay, quote: e.target.value },
                                      },
                                    }))
                                  }
                                  placeholder="Dia menangis..."
                                />
                              </div>
                              <div className="grid gap-2 sm:grid-cols-2">
                                <div className="space-y-1">
                                  <div className="text-[10px] font-medium text-muted-foreground">Author Name</div>
                                  <Input
                                    className="h-8 text-xs"
                                    value={publicSiteDraft.landing.heroOverlay.authorName}
                                    onChange={(e) =>
                                      setPublicSiteDraft((d) => ({
                                        ...d,
                                        landing: {
                                          ...d.landing,
                                          heroOverlay: { ...d.landing.heroOverlay, authorName: e.target.value },
                                        },
                                      }))
                                    }
                                    placeholder="Rina M."
                                  />
                                </div>
                                <div className="space-y-1">
                                  <div className="text-[10px] font-medium text-muted-foreground">Author Location</div>
                                  <Input
                                    className="h-8 text-xs"
                                    value={publicSiteDraft.landing.heroOverlay.authorLocation}
                                    onChange={(e) =>
                                      setPublicSiteDraft((d) => ({
                                        ...d,
                                        landing: {
                                          ...d.landing,
                                          heroOverlay: { ...d.landing.heroOverlay, authorLocation: e.target.value },
                                        },
                                      }))
                                    }
                                    placeholder="Jakarta"
                                  />
                                </div>
                              </div>
                              <div className="space-y-1">
                                <div className="text-[10px] font-medium text-muted-foreground">Avatar URL (opsional)</div>
                                <Input
                                  className="h-8 text-xs"
                                  value={publicSiteDraft.landing.heroOverlay.authorAvatarUrl}
                                  onChange={(e) =>
                                    setPublicSiteDraft((d) => ({
                                      ...d,
                                      landing: {
                                        ...d.landing,
                                        heroOverlay: { ...d.landing.heroOverlay, authorAvatarUrl: e.target.value },
                                      },
                                    }))
                                  }
                                  placeholder="https://..."
                                />
                              </div>
                            </div>

                            <div className="rounded-xl border bg-background p-3 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <div className="text-xs font-bold text-gray-900">Hero Player</div>
                                <label className="flex items-center gap-2 text-xs">
                                  <input
                                    type="checkbox"
                                    checked={publicSiteDraft.landing.heroPlayer.enabled}
                                    onChange={(e) =>
                                      setPublicSiteDraft((d) => ({
                                        ...d,
                                        landing: { ...d.landing, heroPlayer: { ...d.landing.heroPlayer, enabled: e.target.checked } },
                                      }))
                                    }
                                  />
                                  enabled
                                </label>
                              </div>

                              <div className="text-[10px] text-muted-foreground">
                                Lagu ini diputar saat pengunjung klik tombol play di hero section landing page.
                              </div>

                              <div className="space-y-1">
                                <div className="text-[10px] font-medium text-muted-foreground">Audio URL (MP3)</div>
                                <Input
                                  className="h-8 text-xs"
                                  value={publicSiteDraft.landing.heroPlayer.audioUrl}
                                  onChange={(e) =>
                                    setPublicSiteDraft((d) => ({
                                      ...d,
                                      landing: { ...d.landing, heroPlayer: { ...d.landing.heroPlayer, audioUrl: e.target.value } },
                                    }))
                                  }
                                  placeholder="/uploads/audios/... atau https://..."
                                />
                                <div className="pt-1 space-y-2">
                                  <input
                                    type="file"
                                    accept="audio/mpeg,audio/*"
                                    className="block w-full text-[11px]"
                                    onChange={async (e) => {
                                      const f = e.target.files?.[0]
                                      if (!f || !token) return
                                      try {
                                        setPublicCfgError(null)
                                        const fd = new FormData()
                                        fd.append('file', f)
                                        const res = await apiUpload<{ ok: true; path: string }>(
                                          '/api/admin/uploads?kind=audio',
                                          fd,
                                          { token },
                                        )
                                        setPublicSiteDraft((d) => ({
                                          ...d,
                                          landing: {
                                            ...d.landing,
                                            heroPlayer: { ...d.landing.heroPlayer, enabled: true, audioUrl: res.path },
                                          },
                                        }))
                                      } catch (err: any) {
                                        setPublicCfgError(err?.message ?? 'Upload gagal.')
                                      } finally {
                                        e.target.value = ''
                                      }
                                    }}
                                  />
                                  <div className="text-[10px] text-muted-foreground">Upload akan menghasilkan path seperti `/uploads/audios/...`</div>
                                  {publicSiteDraft.landing.heroPlayer.audioUrl.trim() ? (
                                    <audio
                                      className="w-full"
                                      controls
                                      src={resolveApiUrl(publicSiteDraft.landing.heroPlayer.audioUrl.trim())}
                                    />
                                  ) : null}
                                </div>
                              </div>

                              <div className="grid gap-2 sm:grid-cols-2">
                                <div className="space-y-1">
                                  <div className="text-[10px] font-medium text-muted-foreground">Playing Badge</div>
                                  <Input
                                    className="h-8 text-xs"
                                    value={publicSiteDraft.landing.heroPlayer.playingBadgeText}
                                    onChange={(e) =>
                                      setPublicSiteDraft((d) => ({
                                        ...d,
                                        landing: {
                                          ...d.landing,
                                          heroPlayer: { ...d.landing.heroPlayer, playingBadgeText: e.target.value },
                                        },
                                      }))
                                    }
                                    placeholder="Playing"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <div className="text-[10px] font-medium text-muted-foreground">Corner Badge</div>
                                  <Input
                                    className="h-8 text-xs"
                                    value={publicSiteDraft.landing.heroPlayer.cornerBadgeText}
                                    onChange={(e) =>
                                      setPublicSiteDraft((d) => ({
                                        ...d,
                                        landing: {
                                          ...d.landing,
                                          heroPlayer: { ...d.landing.heroPlayer, cornerBadgeText: e.target.value },
                                        },
                                      }))
                                    }
                                    placeholder="Valentine's Special"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <div className="text-[10px] font-medium text-muted-foreground">Verified Badge</div>
                                  <Input
                                    className="h-8 text-xs"
                                    value={publicSiteDraft.landing.heroPlayer.verifiedBadgeText}
                                    onChange={(e) =>
                                      setPublicSiteDraft((d) => ({
                                        ...d,
                                        landing: {
                                          ...d.landing,
                                          heroPlayer: { ...d.landing.heroPlayer, verifiedBadgeText: e.target.value },
                                        },
                                      }))
                                    }
                                    placeholder="Verified Purchase"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <div className="text-[10px] font-medium text-muted-foreground">Avatar URL (opsional)</div>
                                  <Input
                                    className="h-8 text-xs"
                                    value={publicSiteDraft.landing.heroPlayer.authorAvatarUrl}
                                    onChange={(e) =>
                                      setPublicSiteDraft((d) => ({
                                        ...d,
                                        landing: {
                                          ...d.landing,
                                          heroPlayer: { ...d.landing.heroPlayer, authorAvatarUrl: e.target.value },
                                        },
                                      }))
                                    }
                                    placeholder="https://..."
                                  />
                                </div>
                              </div>

                              <div className="space-y-1">
                                <div className="text-[10px] font-medium text-muted-foreground">Quote</div>
                                <Input
                                  className="h-8 text-xs"
                                  value={publicSiteDraft.landing.heroPlayer.quote}
                                  onChange={(e) =>
                                    setPublicSiteDraft((d) => ({
                                      ...d,
                                      landing: { ...d.landing, heroPlayer: { ...d.landing.heroPlayer, quote: e.target.value } },
                                    }))
                                  }
                                  placeholder="He tried not to cry..."
                                />
                              </div>
                              <div className="grid gap-2 sm:grid-cols-2">
                                <div className="space-y-1">
                                  <div className="text-[10px] font-medium text-muted-foreground">Author Name</div>
                                  <Input
                                    className="h-8 text-xs"
                                    value={publicSiteDraft.landing.heroPlayer.authorName}
                                    onChange={(e) =>
                                      setPublicSiteDraft((d) => ({
                                        ...d,
                                        landing: { ...d.landing, heroPlayer: { ...d.landing.heroPlayer, authorName: e.target.value } },
                                      }))
                                    }
                                    placeholder="Rachel M."
                                  />
                                </div>
                                <div className="space-y-1">
                                  <div className="text-[10px] font-medium text-muted-foreground">Author Subline</div>
                                  <Input
                                    className="h-8 text-xs"
                                    value={publicSiteDraft.landing.heroPlayer.authorSubline}
                                    onChange={(e) =>
                                      setPublicSiteDraft((d) => ({
                                        ...d,
                                        landing: {
                                          ...d.landing,
                                          heroPlayer: { ...d.landing.heroPlayer, authorSubline: e.target.value },
                                        },
                                      }))
                                    }
                                    placeholder="London • Valentine's 2025"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Preview */}
                          <div className="rounded-xl border bg-background p-3 space-y-2">
                            <div className="text-xs font-bold text-gray-900">Preview</div>
                            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl shadow-sm">
                              <div className="absolute inset-0 bg-gray-900/10 z-10" />
                              {publicSiteDraft.landing.heroMedia.mode === 'video' &&
                              publicSiteDraft.landing.heroMedia.videoUrl.trim() ? (
                                <video
                                  className="h-full w-full object-cover"
                                  src={resolveApiUrl(publicSiteDraft.landing.heroMedia.videoUrl.trim())}
                                  controls
                                  muted
                                  playsInline
                                />
                              ) : (
                                <img
                                  src={resolveApiUrl(publicSiteDraft.landing.heroMedia.imageUrl.trim())}
                                  alt="Hero preview"
                                  className="h-full w-full object-cover"
                                />
                              )}
                              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-white p-6 text-center">
                                <div className="font-serif italic text-2xl">"{publicSiteDraft.landing.heroOverlay.quote}"</div>
                                <div className="mt-2 text-sm font-medium opacity-90 flex items-center gap-2">
                                  {publicSiteDraft.landing.heroOverlay.authorAvatarUrl.trim() ? (
                                    <img
                                      src={publicSiteDraft.landing.heroOverlay.authorAvatarUrl.trim()}
                                      className="w-6 h-6 rounded-full border border-white"
                                    />
                                  ) : (
                                    <div className="w-6 h-6 rounded-full border border-white bg-white/20" />
                                  )}
                                  {publicSiteDraft.landing.heroOverlay.authorLocation.trim()
                                    ? `${publicSiteDraft.landing.heroOverlay.authorName}, ${publicSiteDraft.landing.heroOverlay.authorLocation}`
                                    : publicSiteDraft.landing.heroOverlay.authorName}
                                </div>
                              </div>
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              Preview ini hanya untuk hero section, bukan seluruh landing.
                            </div>
                          </div>
                        </div>

                        {publicCfgError ? <div className="text-[10px] text-destructive">{publicCfgError}</div> : null}

                        <Button
                          className="w-full h-9 text-xs"
                          disabled={loading}
                          onClick={() => {
                            setPublicCfgError(null)

                            const nextLanding: any = {
                              heroMedia: {
                                imageUrl: publicSiteDraft.landing.heroMedia.imageUrl.trim(),
                                videoUrl:
                                  publicSiteDraft.landing.heroMedia.mode === 'video'
                                    ? publicSiteDraft.landing.heroMedia.videoUrl.trim() || null
                                    : null,
                              },
                              heroOverlay: {
                                quote: publicSiteDraft.landing.heroOverlay.quote.trim(),
                                authorName: publicSiteDraft.landing.heroOverlay.authorName.trim(),
                                authorLocation: publicSiteDraft.landing.heroOverlay.authorLocation.trim(),
                                authorAvatarUrl: publicSiteDraft.landing.heroOverlay.authorAvatarUrl.trim() || null,
                              },
                              heroPlayer: {
                                enabled: publicSiteDraft.landing.heroPlayer.enabled,
                                playingBadgeText: publicSiteDraft.landing.heroPlayer.playingBadgeText.trim(),
                                cornerBadgeText: publicSiteDraft.landing.heroPlayer.cornerBadgeText.trim(),
                                verifiedBadgeText: publicSiteDraft.landing.heroPlayer.verifiedBadgeText.trim(),
                                quote: publicSiteDraft.landing.heroPlayer.quote.trim(),
                                authorName: publicSiteDraft.landing.heroPlayer.authorName.trim(),
                                authorSubline: publicSiteDraft.landing.heroPlayer.authorSubline.trim(),
                                authorAvatarUrl: publicSiteDraft.landing.heroPlayer.authorAvatarUrl.trim() || null,
                                audioUrl: publicSiteDraft.landing.heroPlayer.audioUrl.trim() || null,
                              },
                              audioSamples: {
                                nowPlaying: {
                                  name: publicSiteDraft.landing.audioSamples.nowPlaying.name.trim(),
                                  quote: publicSiteDraft.landing.audioSamples.nowPlaying.quote.trim(),
                                  time: publicSiteDraft.landing.audioSamples.nowPlaying.time.trim(),
                                  metaText: publicSiteDraft.landing.audioSamples.nowPlaying.metaText.trim() || null,
                                  audioUrl: publicSiteDraft.landing.audioSamples.nowPlaying.audioUrl.trim() || null,
                                },
                                playlist: publicSiteDraft.landing.audioSamples.playlist.map((x) => ({
                                  title: x.title.trim(),
                                  subtitle: x.subtitle.trim(),
                                  ctaLabel: x.ctaLabel.trim() || 'PUTAR',
                                  audioUrl: x.audioUrl.trim() || null,
                                })),
                              },
                            }

                            const nextToast: any = {
                              enabled: publicSiteDraft.activityToast.enabled,
                              intervalMs: clampInt(publicSiteDraft.activityToast.intervalMs, 2000, 120000),
                              durationMs: clampInt(publicSiteDraft.activityToast.durationMs, 1000, 60000),
                              items: publicSiteDraft.activityToast.items.map((x) => ({
                                fullName: x.fullName.trim(),
                                city: x.city.trim(),
                                recipientName: x.recipientName.trim(),
                              })),
                            }

                            void saveSettings({
                              publicSiteConfig: { landing: nextLanding, activityToast: nextToast } as any,
                            })
                            setPublicCfgSavedAt(new Date().toLocaleTimeString())
                          }}
                        >
                          {t.updateSettings}
                        </Button>
                      </TabsContent>

                      <TabsContent value="music" className="mt-3 space-y-3">
                        <div className="rounded-xl border bg-background p-3 space-y-3">
                          <div className="text-xs font-bold text-gray-900">Now Playing</div>
                          <div className="grid gap-2 md:grid-cols-2">
                            <div className="space-y-1">
                              <div className="text-[10px] font-medium text-muted-foreground">Name</div>
                              <Input
                                className="h-8 text-xs"
                                value={publicSiteDraft.landing.audioSamples.nowPlaying.name}
                                onChange={(e) =>
                                  setPublicSiteDraft((d) => ({
                                    ...d,
                                    landing: {
                                      ...d.landing,
                                      audioSamples: {
                                        ...d.landing.audioSamples,
                                        nowPlaying: { ...d.landing.audioSamples.nowPlaying, name: e.target.value },
                                      },
                                    },
                                  }))
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <div className="text-[10px] font-medium text-muted-foreground">Time</div>
                              <Input
                                className="h-8 text-xs"
                                value={publicSiteDraft.landing.audioSamples.nowPlaying.time}
                                onChange={(e) =>
                                  setPublicSiteDraft((d) => ({
                                    ...d,
                                    landing: {
                                      ...d.landing,
                                      audioSamples: {
                                        ...d.landing.audioSamples,
                                        nowPlaying: { ...d.landing.audioSamples.nowPlaying, time: e.target.value },
                                      },
                                    },
                                  }))
                                }
                                placeholder="3:24"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-[10px] font-medium text-muted-foreground">Quote</div>
                            <Textarea
                              value={publicSiteDraft.landing.audioSamples.nowPlaying.quote}
                              onChange={(e) =>
                                setPublicSiteDraft((d) => ({
                                  ...d,
                                  landing: {
                                    ...d.landing,
                                    audioSamples: {
                                      ...d.landing.audioSamples,
                                      nowPlaying: { ...d.landing.audioSamples.nowPlaying, quote: e.target.value },
                                    },
                                  },
                                }))
                              }
                              rows={3}
                              className="text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="text-[10px] font-medium text-muted-foreground">Meta Text (kosongkan untuk sembunyikan)</div>
                            <Input
                              className="h-8 text-xs"
                              value={publicSiteDraft.landing.audioSamples.nowPlaying.metaText}
                              onChange={(e) =>
                                setPublicSiteDraft((d) => ({
                                  ...d,
                                  landing: {
                                    ...d.landing,
                                    audioSamples: {
                                      ...d.landing.audioSamples,
                                      nowPlaying: { ...d.landing.audioSamples.nowPlaying, metaText: e.target.value },
                                    },
                                  },
                                }))
                              }
                              placeholder="London • Verified"
                            />
                          </div>

                          <div className="space-y-1">
                            <div className="text-[10px] font-medium text-muted-foreground">Audio URL (opsional)</div>
                            <Input
                              className="h-8 text-xs"
                              value={publicSiteDraft.landing.audioSamples.nowPlaying.audioUrl}
                              onChange={(e) =>
                                setPublicSiteDraft((d) => ({
                                  ...d,
                                  landing: {
                                    ...d.landing,
                                    audioSamples: {
                                      ...d.landing.audioSamples,
                                      nowPlaying: { ...d.landing.audioSamples.nowPlaying, audioUrl: e.target.value },
                                    },
                                  },
                                }))
                              }
                              placeholder="/uploads/audios/... atau https://..."
                            />
                            <div className="pt-1 space-y-2">
                              <input
                                type="file"
                                accept="audio/*"
                                className="block w-full text-[11px]"
                                onChange={async (e) => {
                                  const f = e.target.files?.[0]
                                  if (!f || !token) return
                                  try {
                                    setPublicCfgError(null)
                                    const fd = new FormData()
                                    fd.append('file', f)
                                    const res = await apiUpload<{ ok: true; path: string }>(
                                      '/api/admin/uploads?kind=audio',
                                      fd,
                                      { token },
                                    )
                                    setPublicSiteDraft((d) => ({
                                      ...d,
                                      landing: {
                                        ...d.landing,
                                        audioSamples: {
                                          ...d.landing.audioSamples,
                                          nowPlaying: { ...d.landing.audioSamples.nowPlaying, audioUrl: res.path },
                                        },
                                      },
                                    }))
                                  } catch (err: any) {
                                    setPublicCfgError(err?.message ?? 'Upload gagal.')
                                  } finally {
                                    e.target.value = ''
                                  }
                                }}
                              />
                              <div className="text-[10px] text-muted-foreground">Upload akan menghasilkan path seperti `/uploads/audios/...`</div>
                              {publicSiteDraft.landing.audioSamples.nowPlaying.audioUrl.trim() ? (
                                <audio
                                  className="w-full"
                                  controls
                                  src={resolveApiUrl(publicSiteDraft.landing.audioSamples.nowPlaying.audioUrl.trim())}
                                />
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <div className="rounded-xl border bg-background p-3 space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-xs font-bold text-gray-900">Playlist</div>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                setPublicSiteDraft((d) => ({
                                  ...d,
                                  landing: {
                                    ...d.landing,
                                    audioSamples: {
                                      ...d.landing.audioSamples,
                                      playlist: [
                                        ...d.landing.audioSamples.playlist,
                                        { title: '', subtitle: '', ctaLabel: 'PUTAR', audioUrl: '' },
                                      ],
                                    },
                                  },
                                }))
                              }
                            >
                              + tambah
                            </Button>
                          </div>

                          <div className="space-y-2">
                            {publicSiteDraft.landing.audioSamples.playlist.map((item, i) => (
                              <div key={i} className="rounded-lg border p-2 bg-white space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="text-[10px] font-bold text-gray-600">Item #{i + 1}</div>
                                  <div className="flex gap-2">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      disabled={i === 0}
                                      onClick={() =>
                                        setPublicSiteDraft((d) => ({
                                          ...d,
                                          landing: {
                                            ...d.landing,
                                            audioSamples: {
                                              ...d.landing.audioSamples,
                                              playlist: moveItem(d.landing.audioSamples.playlist, i, i - 1),
                                            },
                                          },
                                        }))
                                      }
                                    >
                                      ↑
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      disabled={i === publicSiteDraft.landing.audioSamples.playlist.length - 1}
                                      onClick={() =>
                                        setPublicSiteDraft((d) => ({
                                          ...d,
                                          landing: {
                                            ...d.landing,
                                            audioSamples: {
                                              ...d.landing.audioSamples,
                                              playlist: moveItem(d.landing.audioSamples.playlist, i, i + 1),
                                            },
                                          },
                                        }))
                                      }
                                    >
                                      ↓
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="destructive"
                                      onClick={() =>
                                        setPublicSiteDraft((d) => ({
                                          ...d,
                                          landing: {
                                            ...d.landing,
                                            audioSamples: {
                                              ...d.landing.audioSamples,
                                              playlist: d.landing.audioSamples.playlist.filter((_, idx) => idx !== i),
                                            },
                                          },
                                        }))
                                      }
                                    >
                                      hapus
                                    </Button>
                                  </div>
                                </div>

                                <div className="grid gap-2 md:grid-cols-2">
                                  <div className="space-y-1">
                                    <div className="text-[10px] font-medium text-muted-foreground">Title</div>
                                    <Input
                                      className="h-8 text-xs"
                                      value={item.title}
                                      onChange={(e) =>
                                        setPublicSiteDraft((d) => ({
                                          ...d,
                                          landing: {
                                            ...d.landing,
                                            audioSamples: {
                                              ...d.landing.audioSamples,
                                              playlist: d.landing.audioSamples.playlist.map((x, idx) =>
                                                idx === i ? { ...x, title: e.target.value } : x,
                                              ),
                                            },
                                          },
                                        }))
                                      }
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <div className="text-[10px] font-medium text-muted-foreground">Subtitle</div>
                                    <Input
                                      className="h-8 text-xs"
                                      value={item.subtitle}
                                      onChange={(e) =>
                                        setPublicSiteDraft((d) => ({
                                          ...d,
                                          landing: {
                                            ...d.landing,
                                            audioSamples: {
                                              ...d.landing.audioSamples,
                                              playlist: d.landing.audioSamples.playlist.map((x, idx) =>
                                                idx === i ? { ...x, subtitle: e.target.value } : x,
                                              ),
                                            },
                                          },
                                        }))
                                      }
                                    />
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <div className="text-[10px] font-medium text-muted-foreground">CTA Label</div>
                                  <Input
                                    className="h-8 text-xs"
                                    value={item.ctaLabel}
                                    onChange={(e) =>
                                      setPublicSiteDraft((d) => ({
                                        ...d,
                                        landing: {
                                          ...d.landing,
                                          audioSamples: {
                                            ...d.landing.audioSamples,
                                            playlist: d.landing.audioSamples.playlist.map((x, idx) =>
                                              idx === i ? { ...x, ctaLabel: e.target.value } : x,
                                            ),
                                          },
                                        },
                                      }))
                                    }
                                    placeholder="PUTAR"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <div className="text-[10px] font-medium text-muted-foreground">Audio URL (MP3, opsional)</div>
                                  <Input
                                    className="h-8 text-xs"
                                    value={item.audioUrl}
                                    onChange={(e) =>
                                      setPublicSiteDraft((d) => ({
                                        ...d,
                                        landing: {
                                          ...d.landing,
                                          audioSamples: {
                                            ...d.landing.audioSamples,
                                            playlist: d.landing.audioSamples.playlist.map((x, idx) =>
                                              idx === i ? { ...x, audioUrl: e.target.value } : x,
                                            ),
                                          },
                                        },
                                      }))
                                    }
                                    placeholder="/uploads/audios/... atau https://..."
                                  />
                                  <div className="pt-1 space-y-2">
                                    <input
                                      type="file"
                                      accept="audio/mpeg,audio/*"
                                      className="block w-full text-[11px]"
                                      onChange={async (e) => {
                                        const f = e.target.files?.[0]
                                        if (!f || !token) return
                                        try {
                                          setPublicCfgError(null)
                                          const fd = new FormData()
                                          fd.append('file', f)
                                          const res = await apiUpload<{ ok: true; path: string }>(
                                            '/api/admin/uploads?kind=audio',
                                            fd,
                                            { token },
                                          )
                                          setPublicSiteDraft((d) => ({
                                            ...d,
                                            landing: {
                                              ...d.landing,
                                              audioSamples: {
                                                ...d.landing.audioSamples,
                                                playlist: d.landing.audioSamples.playlist.map((x, idx) =>
                                                  idx === i ? { ...x, audioUrl: res.path } : x,
                                                ),
                                              },
                                            },
                                          }))
                                        } catch (err: any) {
                                          setPublicCfgError(err?.message ?? 'Upload gagal.')
                                        } finally {
                                          e.target.value = ''
                                        }
                                      }}
                                    />
                                    <div className="text-[10px] text-muted-foreground">Upload akan menghasilkan path seperti `/uploads/audios/...`</div>
                                    {item.audioUrl.trim() ? (
                                      <audio className="w-full" controls src={resolveApiUrl(item.audioUrl.trim())} />
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {publicCfgError ? <div className="text-[10px] text-destructive">{publicCfgError}</div> : null}
                        <Button
                          className="w-full h-9 text-xs"
                          disabled={loading}
                          onClick={() => {
                            setPublicCfgError(null)
                            const nextLanding: any = {
                              heroMedia: {
                                imageUrl: publicSiteDraft.landing.heroMedia.imageUrl.trim(),
                                videoUrl:
                                  publicSiteDraft.landing.heroMedia.mode === 'video'
                                    ? publicSiteDraft.landing.heroMedia.videoUrl.trim() || null
                                    : null,
                              },
                              heroOverlay: {
                                quote: publicSiteDraft.landing.heroOverlay.quote.trim(),
                                authorName: publicSiteDraft.landing.heroOverlay.authorName.trim(),
                                authorLocation: publicSiteDraft.landing.heroOverlay.authorLocation.trim(),
                                authorAvatarUrl: publicSiteDraft.landing.heroOverlay.authorAvatarUrl.trim() || null,
                              },
                              heroPlayer: {
                                enabled: publicSiteDraft.landing.heroPlayer.enabled,
                                playingBadgeText: publicSiteDraft.landing.heroPlayer.playingBadgeText.trim(),
                                cornerBadgeText: publicSiteDraft.landing.heroPlayer.cornerBadgeText.trim(),
                                verifiedBadgeText: publicSiteDraft.landing.heroPlayer.verifiedBadgeText.trim(),
                                quote: publicSiteDraft.landing.heroPlayer.quote.trim(),
                                authorName: publicSiteDraft.landing.heroPlayer.authorName.trim(),
                                authorSubline: publicSiteDraft.landing.heroPlayer.authorSubline.trim(),
                                authorAvatarUrl: publicSiteDraft.landing.heroPlayer.authorAvatarUrl.trim() || null,
                                audioUrl: publicSiteDraft.landing.heroPlayer.audioUrl.trim() || null,
                              },
                              audioSamples: {
                                nowPlaying: {
                                  name: publicSiteDraft.landing.audioSamples.nowPlaying.name.trim(),
                                  quote: publicSiteDraft.landing.audioSamples.nowPlaying.quote.trim(),
                                  time: publicSiteDraft.landing.audioSamples.nowPlaying.time.trim(),
                                  metaText: publicSiteDraft.landing.audioSamples.nowPlaying.metaText.trim() || null,
                                  audioUrl: publicSiteDraft.landing.audioSamples.nowPlaying.audioUrl.trim() || null,
                                },
                                playlist: publicSiteDraft.landing.audioSamples.playlist.map((x) => ({
                                  title: x.title.trim(),
                                  subtitle: x.subtitle.trim(),
                                  ctaLabel: x.ctaLabel.trim() || 'PUTAR',
                                  audioUrl: x.audioUrl.trim() || null,
                                })),
                              },
                            }
                            const nextToast: any = {
                              enabled: publicSiteDraft.activityToast.enabled,
                              intervalMs: clampInt(publicSiteDraft.activityToast.intervalMs, 2000, 120000),
                              durationMs: clampInt(publicSiteDraft.activityToast.durationMs, 1000, 60000),
                              items: publicSiteDraft.activityToast.items.map((x) => ({
                                fullName: x.fullName.trim(),
                                city: x.city.trim(),
                                recipientName: x.recipientName.trim(),
                              })),
                            }
                            void saveSettings({ publicSiteConfig: { landing: nextLanding, activityToast: nextToast } as any })
                            setPublicCfgSavedAt(new Date().toLocaleTimeString())
                          }}
                        >
                          {t.updateSettings}
                        </Button>
                      </TabsContent>

                      <TabsContent value="toast" className="mt-3 space-y-3">
                        <div className="rounded-xl border bg-background p-3 space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-xs font-bold text-gray-900">Activity Toast</div>
                            <label className="flex items-center gap-2 text-xs">
                              <input
                                type="checkbox"
                                checked={publicSiteDraft.activityToast.enabled}
                                onChange={(e) =>
                                  setPublicSiteDraft((d) => ({
                                    ...d,
                                    activityToast: { ...d.activityToast, enabled: e.target.checked },
                                  }))
                                }
                              />
                              enabled
                            </label>
                          </div>

                          <div className="grid gap-2 md:grid-cols-2">
                            <div className="space-y-1">
                              <div className="text-[10px] font-medium text-muted-foreground">Interval (ms)</div>
                              <Input
                                type="number"
                                className="h-8 text-xs"
                                value={publicSiteDraft.activityToast.intervalMs}
                                onChange={(e) =>
                                  setPublicSiteDraft((d) => ({
                                    ...d,
                                    activityToast: { ...d.activityToast, intervalMs: Number(e.target.value) },
                                  }))
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <div className="text-[10px] font-medium text-muted-foreground">Duration (ms)</div>
                              <Input
                                type="number"
                                className="h-8 text-xs"
                                value={publicSiteDraft.activityToast.durationMs}
                                onChange={(e) =>
                                  setPublicSiteDraft((d) => ({
                                    ...d,
                                    activityToast: { ...d.activityToast, durationMs: Number(e.target.value) },
                                  }))
                                }
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-3 pt-1 border-t">
                            <div className="text-xs font-bold text-gray-900">Items</div>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                const nextLen = publicSiteDraft.activityToast.items.length + 1
                                setToastItemsPage(Math.ceil(nextLen / TOAST_ITEMS_PAGE_SIZE))
                                setPublicSiteDraft((d) => ({
                                  ...d,
                                  activityToast: {
                                    ...d.activityToast,
                                    items: [...d.activityToast.items, { fullName: '', city: '', recipientName: '' }],
                                  },
                                }))
                              }}
                            >
                              + tambah
                            </Button>
                          </div>

                          <div className="rounded-lg border bg-muted/10 p-2 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-[10px] font-bold text-gray-700">Bulk input (JSON)</div>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setToastItemsJsonError(null)
                                  setToastItemsJson(JSON.stringify(publicSiteDraft.activityToast.items, null, 2))
                                }}
                              >
                                Copy current
                              </Button>
                            </div>

                            <Textarea
                              rows={6}
                              className="text-[11px] font-mono"
                              placeholder={`[\n  { "fullName": "Budi", "city": "Jakarta", "recipientName": "Salsa" }\n]`}
                              value={toastItemsJson}
                              onChange={(e) => {
                                setToastItemsJson(e.target.value)
                                setToastItemsJsonError(null)
                              }}
                            />

                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  setToastItemsJsonError(null)
                                  try {
                                    const items = parseToastItemsJson(toastItemsJson)
                                    if (!items.length) {
                                      setToastItemsJsonError(
                                        'Tidak ada item valid. Pastikan JSON berupa array item atau { "items": [...] } dengan field fullName/city/recipientName.',
                                      )
                                      return
                                    }
                                    setPublicSiteDraft((d) => ({
                                      ...d,
                                      activityToast: { ...d.activityToast, items },
                                    }))
                                    setToastItemsPage(1)
                                  } catch (e: unknown) {
                                    setToastItemsJsonError(
                                      `JSON tidak valid.${e instanceof Error && e.message ? ` ${e.message}` : ''}`,
                                    )
                                  }
                                }}
                              >
                                Apply (replace)
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setToastItemsJsonError(null)
                                  try {
                                    const items = parseToastItemsJson(toastItemsJson)
                                    if (!items.length) {
                                      setToastItemsJsonError(
                                        'Tidak ada item valid. Pastikan JSON berupa array item atau { "items": [...] } dengan field fullName/city/recipientName.',
                                      )
                                      return
                                    }
                                    const nextLen = publicSiteDraft.activityToast.items.length + items.length
                                    setToastItemsPage(Math.ceil(nextLen / TOAST_ITEMS_PAGE_SIZE))
                                    setPublicSiteDraft((d) => ({
                                      ...d,
                                      activityToast: { ...d.activityToast, items: [...d.activityToast.items, ...items] },
                                    }))
                                  } catch (e: unknown) {
                                    setToastItemsJsonError(
                                      `JSON tidak valid.${e instanceof Error && e.message ? ` ${e.message}` : ''}`,
                                    )
                                  }
                                }}
                              >
                                Apply (append)
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setToastItemsJson('')
                                  setToastItemsJsonError(null)
                                }}
                              >
                                Clear
                              </Button>
                            </div>

                            {toastItemsJsonError ? (
                              <div className="text-[10px] text-destructive">{toastItemsJsonError}</div>
                            ) : (
                              <div className="text-[10px] text-muted-foreground">
                                Tips: bisa paste array langsung, atau object <span className="font-mono">{`{ "items": [...] }`}</span>.
                              </div>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 border rounded-lg bg-background p-2">
                            <div className="text-[10px] text-muted-foreground">
                              Menampilkan <span className="font-medium text-gray-800">{toastItemsTotal ? toastItemsStartIdx + 1 : 0}</span>–
                              <span className="font-medium text-gray-800">{toastItemsEndIdx}</span> dari{' '}
                              <span className="font-medium text-gray-800">{toastItemsTotal}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={toastItemsPageSafe <= 1}
                                onClick={() => setToastItemsPage((p) => Math.max(1, p - 1))}
                              >
                                Prev
                              </Button>
                              <div className="text-[10px] text-muted-foreground">
                                Page <span className="font-medium text-gray-800">{toastItemsPageSafe}</span> /{' '}
                                <span className="font-medium text-gray-800">{toastItemsTotalPages}</span>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={toastItemsPageSafe >= toastItemsTotalPages}
                                onClick={() => setToastItemsPage((p) => Math.min(toastItemsTotalPages, p + 1))}
                              >
                                Next
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            {publicSiteDraft.activityToast.items.slice(toastItemsStartIdx, toastItemsEndIdx).map((it, relIdx) => {
                              const i = toastItemsStartIdx + relIdx
                              return (
                              <div key={i} className="rounded-lg border p-2 bg-white space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="text-[10px] font-bold text-gray-600">Item #{i + 1}</div>
                                  <div className="flex gap-2">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      disabled={i === 0}
                                      onClick={() =>
                                        setPublicSiteDraft((d) => ({
                                          ...d,
                                          activityToast: {
                                            ...d.activityToast,
                                            items: moveItem(d.activityToast.items, i, i - 1),
                                          },
                                        }))
                                      }
                                    >
                                      ↑
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      disabled={i === publicSiteDraft.activityToast.items.length - 1}
                                      onClick={() =>
                                        setPublicSiteDraft((d) => ({
                                          ...d,
                                          activityToast: {
                                            ...d.activityToast,
                                            items: moveItem(d.activityToast.items, i, i + 1),
                                          },
                                        }))
                                      }
                                    >
                                      ↓
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="destructive"
                                      onClick={() =>
                                        setPublicSiteDraft((d) => ({
                                          ...d,
                                          activityToast: { ...d.activityToast, items: d.activityToast.items.filter((_, idx) => idx !== i) },
                                        }))
                                      }
                                    >
                                      hapus
                                    </Button>
                                  </div>
                                </div>

                                <div className="grid gap-2 md:grid-cols-3">
                                  <div className="space-y-1">
                                    <div className="text-[10px] font-medium text-muted-foreground">Full Name</div>
                                    <Input
                                      className="h-8 text-xs"
                                      value={it.fullName}
                                      onChange={(e) =>
                                        setPublicSiteDraft((d) => ({
                                          ...d,
                                          activityToast: {
                                            ...d.activityToast,
                                            items: d.activityToast.items.map((x, idx) =>
                                              idx === i ? { ...x, fullName: e.target.value } : x,
                                            ),
                                          },
                                        }))
                                      }
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <div className="text-[10px] font-medium text-muted-foreground">City</div>
                                    <Input
                                      className="h-8 text-xs"
                                      value={it.city}
                                      onChange={(e) =>
                                        setPublicSiteDraft((d) => ({
                                          ...d,
                                          activityToast: {
                                            ...d.activityToast,
                                            items: d.activityToast.items.map((x, idx) =>
                                              idx === i ? { ...x, city: e.target.value } : x,
                                            ),
                                          },
                                        }))
                                      }
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <div className="text-[10px] font-medium text-muted-foreground">Recipient Name</div>
                                    <Input
                                      className="h-8 text-xs"
                                      value={it.recipientName}
                                      onChange={(e) =>
                                        setPublicSiteDraft((d) => ({
                                          ...d,
                                          activityToast: {
                                            ...d.activityToast,
                                            items: d.activityToast.items.map((x, idx) =>
                                              idx === i ? { ...x, recipientName: e.target.value } : x,
                                            ),
                                          },
                                        }))
                                      }
                                    />
                                  </div>
                                </div>
                              </div>
                              )
                            })}
                          </div>
                        </div>

                        {publicCfgError ? <div className="text-[10px] text-destructive">{publicCfgError}</div> : null}
                        <Button
                          className="w-full h-9 text-xs"
                          disabled={loading}
                          onClick={() => {
                            setPublicCfgError(null)
                            const nextLanding: any = {
                              heroMedia: {
                                imageUrl: publicSiteDraft.landing.heroMedia.imageUrl.trim(),
                                videoUrl:
                                  publicSiteDraft.landing.heroMedia.mode === 'video'
                                    ? publicSiteDraft.landing.heroMedia.videoUrl.trim() || null
                                    : null,
                              },
                              heroOverlay: {
                                quote: publicSiteDraft.landing.heroOverlay.quote.trim(),
                                authorName: publicSiteDraft.landing.heroOverlay.authorName.trim(),
                                authorLocation: publicSiteDraft.landing.heroOverlay.authorLocation.trim(),
                                authorAvatarUrl: publicSiteDraft.landing.heroOverlay.authorAvatarUrl.trim() || null,
                              },
                              heroPlayer: {
                                enabled: publicSiteDraft.landing.heroPlayer.enabled,
                                playingBadgeText: publicSiteDraft.landing.heroPlayer.playingBadgeText.trim(),
                                cornerBadgeText: publicSiteDraft.landing.heroPlayer.cornerBadgeText.trim(),
                                verifiedBadgeText: publicSiteDraft.landing.heroPlayer.verifiedBadgeText.trim(),
                                quote: publicSiteDraft.landing.heroPlayer.quote.trim(),
                                authorName: publicSiteDraft.landing.heroPlayer.authorName.trim(),
                                authorSubline: publicSiteDraft.landing.heroPlayer.authorSubline.trim(),
                                authorAvatarUrl: publicSiteDraft.landing.heroPlayer.authorAvatarUrl.trim() || null,
                                audioUrl: publicSiteDraft.landing.heroPlayer.audioUrl.trim() || null,
                              },
                              audioSamples: {
                                nowPlaying: {
                                  name: publicSiteDraft.landing.audioSamples.nowPlaying.name.trim(),
                                  quote: publicSiteDraft.landing.audioSamples.nowPlaying.quote.trim(),
                                  time: publicSiteDraft.landing.audioSamples.nowPlaying.time.trim(),
                                  metaText: publicSiteDraft.landing.audioSamples.nowPlaying.metaText.trim() || null,
                                  audioUrl: publicSiteDraft.landing.audioSamples.nowPlaying.audioUrl.trim() || null,
                                },
                                playlist: publicSiteDraft.landing.audioSamples.playlist.map((x) => ({
                                  title: x.title.trim(),
                                  subtitle: x.subtitle.trim(),
                                  ctaLabel: x.ctaLabel.trim() || 'PUTAR',
                                  audioUrl: x.audioUrl.trim() || null,
                                })),
                              },
                            }
                            const nextToast: any = {
                              enabled: publicSiteDraft.activityToast.enabled,
                              intervalMs: clampInt(publicSiteDraft.activityToast.intervalMs, 2000, 120000),
                              durationMs: clampInt(publicSiteDraft.activityToast.durationMs, 1000, 60000),
                              items: publicSiteDraft.activityToast.items.map((x) => ({
                                fullName: x.fullName.trim(),
                                city: x.city.trim(),
                                recipientName: x.recipientName.trim(),
                              })),
                            }
                            void saveSettings({ publicSiteConfig: { landing: nextLanding, activityToast: nextToast } as any })
                            setPublicCfgSavedAt(new Date().toLocaleTimeString())
                          }}
                        >
                          {t.updateSettings}
                        </Button>
                      </TabsContent>
                    </Tabs>
                  ) : (
                    <p className="text-muted-foreground">{loading ? t.loadingShort : t.noSettings}</p>
                  )}
                </CardContent>
              </Card>

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
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="userInput">{t.userInput}</TabsTrigger>
                          <TabsTrigger value="overview">{t.overview}</TabsTrigger>
                          <TabsTrigger value="deliveryDebug">{t.deliveryDebug}</TabsTrigger>
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
                            {(() => {
                              const meta =
                                selectedOrder.trackMetadata && typeof selectedOrder.trackMetadata === 'object'
                                  ? (selectedOrder.trackMetadata as any)
                                  : null
                              const tracks = Array.isArray(meta?.tracks)
                                ? (meta.tracks as unknown[]).filter((x): x is string => typeof x === 'string' && x.length > 0)
                                : []
                              const links = tracks.length ? tracks : selectedOrder.trackUrl ? [selectedOrder.trackUrl] : []
                              if (!links.length) return null
                              return (
                                <div className="grid gap-1">
                                  {links.map((url: string, idx: number) => (
                                    <a
                                      key={`${url}-${idx}`}
                                      className="text-sm underline"
                                      href={url}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      {links.length > 1 ? `${t.songLink} ${idx + 1}` : t.songLink}
                                    </a>
                                  ))}
                                </div>
                              )
                            })()}
                            {selectedOrder.errorMessage ? (
                              <div className="text-destructive">{t.error}: {selectedOrder.errorMessage}</div>
                            ) : null}
                          </div>

                          <Button variant="secondary" className="w-full" onClick={() => void retryOrder(selectedOrder.id)}>
                            {t.retryCreation}
                          </Button>

                          {selectedOrder.deliveryStatus === 'delivery_pending' ? (
                            <div className="grid grid-cols-2 gap-2">
                              <Button className="w-full" disabled={loading} onClick={() => void resendEmail(selectedOrder.id)}>
                                {t.resendEmail}
                              </Button>
                              <Button className="w-full" disabled={loading} onClick={() => void resendWhatsApp(selectedOrder.id)}>
                                {t.resendWhatsApp}
                              </Button>
                            </div>
                          ) : null}

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

                        <TabsContent value="deliveryDebug" className="space-y-3 mt-2">
                          {(() => {
                            const customer = selectedOrder.customer ?? {}
                            const meta =
                              selectedOrder.trackMetadata && typeof selectedOrder.trackMetadata === 'object'
                                ? (selectedOrder.trackMetadata as any)
                                : null
                            const sunoPayload = {
                              customMode: true,
                              instrumental: false,
                              model: meta?.model ?? null,
                              title: meta?.title ?? null,
                              style: meta?.style ?? selectedOrder.moodDescription ?? null,
                              prompt: selectedOrder.lyricsText ?? null,
                            }
                            return (
                              <>
                                <div className="rounded-md border p-2 space-y-2">
                                  <div className="font-medium">{t.contact}</div>
                                  <div className="grid gap-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-muted-foreground">{t.email}</span>
                                      <span className="font-medium">{customer.email ?? '-'}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-muted-foreground">{t.phone}</span>
                                      <span className="font-medium">{customer.whatsappNumber ?? '-'}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="rounded-md border p-2 space-y-2">
                                  <div className="font-medium">{t.sunoRequest}</div>
                                  <div className="grid gap-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-muted-foreground">{t.taskId}</span>
                                      <span className="font-medium">{meta?.taskId ?? '-'}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-muted-foreground">{t.modelSent}</span>
                                      <span className="font-medium">{meta?.model ?? '-'}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-muted-foreground">{t.titleSent}</span>
                                      <span className="font-medium">{meta?.title ?? '-'}</span>
                                    </div>
                                    <div className="space-y-1">
                                      <div className="text-[10px] font-medium text-muted-foreground">{t.styleSent}</div>
                                      <div className="whitespace-pre-wrap rounded-md border bg-muted p-2 text-xs">
                                        {meta?.style ?? selectedOrder.moodDescription ?? '-'}
                                      </div>
                                    </div>
                                    <div className="space-y-1">
                                      <div className="text-[10px] font-medium text-muted-foreground">{t.lyricsSent}</div>
                                      <div className="whitespace-pre-wrap rounded-md border bg-muted p-2 text-xs">
                                        {selectedOrder.lyricsText ?? '-'}
                                      </div>
                                    </div>
                                    <div className="space-y-1">
                                      <div className="text-[10px] font-medium text-muted-foreground">Payload (derived)</div>
                                      <div className="whitespace-pre-wrap rounded-md border bg-muted p-2 text-[11px] font-mono">
                                        {JSON.stringify(sunoPayload, null, 2)}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="rounded-md border p-2 space-y-2">
                                  <div className="font-medium">{t.sunoAuditPrompt}</div>
                                  <div className="whitespace-pre-wrap rounded-md border bg-muted p-2 text-xs">
                                    {meta?.prompt ?? '-'}
                                  </div>
                                </div>
                              </>
                            )
                          })()}
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
