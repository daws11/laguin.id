import type { validatePlaceholders } from 'shared'

export type AdminTabKey = 'settings' | 'prompts' | 'customers' | 'orders'

export type PromptTemplate = {
  id: string
  type: 'lyrics' | 'mood_description' | 'music'
  templateText: string
  kaiSettings: unknown | null
  version: number
  isActive: boolean
  createdAt: string
  placeholderValidation?: ReturnType<typeof validatePlaceholders>
}

export type Settings = {
  id: string
  instantEnabled: boolean
  deliveryDelayHours: number | null
  paymentsEnabled: boolean
  emailOtpEnabled: boolean
  agreementEnabled: boolean
  manualConfirmationEnabled: boolean
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

export type LandingPlaylistItem = { title: string; subtitle: string; ctaLabel: string; audioUrl: string }
export type ToastItem = { fullName: string; city: string; recipientName: string }

export type PublicSiteDraft = {
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

export type CustomerListItem = {
  kind: 'customer' | 'draft'
  id: string
  name: string
  whatsappNumber: string
  email: string | null
  orderCount: number
  latestOrderStatus: string | null
  latestDeliveryStatus: string | null
  createdAt: string
  draftStep?: number | null
  draftUpdatedAt?: string | null
}

export type OrderListItem = {
  id: string
  status: string
  deliveryStatus: string
  paymentStatus: string
  createdAt: string
  trackUrl: string | null
  errorMessage: string | null
  customer: { id: string; name: string; whatsappNumber: string }
}

export type CustomerDetail = any
export type OrderDetail = any
export type DraftDetail = any

