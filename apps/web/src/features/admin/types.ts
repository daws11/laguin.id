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
  defaultThemeSlug: string | null
  showThemesInFooter: boolean
  hasOpenaiKey: boolean
  openaiModel: string | null
  hasKaiAiKey: boolean
  metaPixelId: string | null
  metaPixelWishlistId: string | null
  metaPixelStep1Script: string | null
  metaPixelStep4Script: string | null
  metaPixelConfirmScript: string | null
  metaCapiEnabled: boolean
  hasMetaCapiToken: boolean
  metaCapiTestEventCode: string | null

  // YCloud WhatsApp gateway settings (safe fields only)
  ycloudFrom: string | null
  ycloudTemplateName: string | null
  ycloudTemplateLangCode: string | null
  ycloudTemplateHasButton: boolean | null
  hasYcloudKey: boolean
  hasYcloudWebhookSecret: boolean
  siteUrl: string | null
  ycloudLinkMessage: string | null
  ycloudWebhookUrl: string | null

  reminderTemplates: Array<{
    label: string
    delayMinutes: number
    templateName: string
    templateLangCode: string
  }>

  hasXenditKey: boolean
  xenditWebhookToken: string | null
  allowMultipleOrdersPerWhatsapp: boolean
  kieAiCallbackUrl: string | null

  s3Endpoint: string | null
  s3Bucket: string | null
  hasS3AccessKey: boolean
  hasS3SecretKey: boolean
  s3Region: string | null

  emailProvider: string
  smtpHost: string | null
  smtpPort: number | null
  smtpSecure: boolean
  smtpUser: string | null
  hasSmtpPass: boolean
  smtpFrom: string | null
  hasResendKey: boolean
  resendFrom: string | null
}

export type LandingPlaylistItem = { title: string; subtitle: string; ctaLabel: string; audioUrl: string }
export type ToastItem = { fullName: string; city: string; recipientName: string }
export type ReviewItem = {
  style: 'accent' | 'dark-chat' | 'white'
  quote: string
  chatMessages?: string[]
  authorName: string
  authorMeta: string
  authorAvatarUrl: string
}

export type ThemeColors = {
  accentColor: string
  buttonColor: string
  bgColor1: string
  bgColor2: string
}

export type RelationshipChip = {
  label: string
  icon: string
  value: string
}

export type StoryPromptChip = {
  label: string
  icon: string
}

export type HowItWorksStep = {
  title: string
  subtitle: string
}

export type ConfigStep0 = {
  enabled: boolean
  bannerHeadline: string
  mainHeadline: string
  guaranteeTitle: string
  guaranteeText: string
  howItWorksTitle: string
  howItWorksSteps: HowItWorksStep[]
  bottomCtaText: string
}

export type ConfigStep1 = {
  headline: string
  subtitle: string
  relationshipChips: RelationshipChip[]
  nameFieldLabel: string
  nameFieldPlaceholder: string
  occasionFieldLabel: string
  occasionFieldPlaceholder: string
  socialProofText: string
}

export type ConfigStep3 = {
  headline: string
  subtitle: string
  tipBullets: string[]
  storyPrompts: StoryPromptChip[]
  textareaPlaceholder: string
}

export type VibeChip = {
  id: string
  label: string
  desc: string
  icon: string
  badge?: string
}

export type VoiceOption = {
  value: string
  label: string
}

export type LanguageOption = {
  value: string
  label: string
}

export type ConfigStep2 = {
  headline: string
  subtitle: string
  vibeChips: VibeChip[]
  voiceLabel: string
  voiceOptions: VoiceOption[]
  languageLabel: string
  languageOptions: LanguageOption[]
}

export type NextStepItem = {
  text: string
}

export type ConfigStep4 = {
  headline: string
  subtitleTemplate: string
  manualSubtitle: string
  orderSummaryLabel: string
  orderSummaryEmoji: string
  whatsappLabel: string
  whatsappPlaceholder: string
  emailLabel: string
  emailPlaceholder: string
  nextStepsTitle: string
  nextSteps: NextStepItem[]
  manualNextSteps: NextStepItem[]
  securityBadges: string[]
  draftTimerText: string
  checkoutButtonText: string
  checkoutSubtext: string
  manualCheckoutButtonText: string
  showPriceInButton: boolean
  checkoutImageUrl: string
  showCheckoutImage: boolean
}

export type ConfigSteps = {
  step0: ConfigStep0
  step1: ConfigStep1
  step2: ConfigStep2
  step3: ConfigStep3
  step4: ConfigStep4
}

export type ComparisonGiftItem = {
  icon: string
  name: string
  price: string
}

export type ComparisonChecklistItem = {
  text: string
}

export type ComparisonSectionConfig = {
  headline: string
  giftItems: ComparisonGiftItem[]
  forgottenLabel: string
  foreverLabel: string
  bestPriceBadge: string
  productTitle: string
  checklistItems: ComparisonChecklistItem[]
}

export type HowItWorksLandingStep = {
  icon: string
  title: string
  desc: string
}

export type HowItWorksSectionConfig = {
  hidden?: boolean
  label: string
  headline: string
  steps: HowItWorksLandingStep[]
}

export type GuaranteeSectionConfig = {
  badge: string
  headline: string
  description: string
  badges: string[]
  videoUrl: string
}

export type FaqItemConfig = {
  q: string
  a: string
}

export type FaqSectionConfig = {
  hidden?: boolean
  headline: string
  items: FaqItemConfig[]
}

export type AudioSamplesSectionConfig = {
  badge: string
  headline: string
  subtext: string
  otherLabel: string
  ctaLine: string
}

export type FooterConfig = {
  tagline: string
  companyName: string
  email: string
  phone: string
  disclaimer: string
  copyrightLine: string
}

export type FooterCtaConfig = {
  headline: string
  subtitle: string
  securityBadge: string
  quotaLine: string
}

export type MiscTextConfig = {
  heroStarLine: string
  heroTagline: string
  headlineFont: string
  ctaButtonText: string
  heroCtaButtonText: string
  heroChipsHeadline: string
  mobileCtaQuotaBadge: string
}

export type UpsellItemAction = 'none' | 'express_delivery' | 'third_verse'

export type UpsellItem = {
  id: string
  icon: string
  title: string
  headline: string
  description: string
  price: number
  priceLabel: string
  ctaText: string
  declineText: string
  action?: UpsellItemAction
  actionConfig?: {
    deliveryTimeMinutes?: number
  }
  orderProcessingOnly?: boolean
}

export type UpsellConfig = {
  enabled: boolean
  headline: string
  footerNote: string
  items: UpsellItem[]
}

export type OrderProcessingPageConfig = {
  headline: string
  subtitle: string
  countdownLabel: string
  bottomText: string
  upsellItemIds: string[]
}

export type PriceVisibility = {
  promoBanner: boolean
  header: boolean
  heroCtaButton: boolean
  audioSamplesButton: boolean
  comparisonSection: boolean
  howItWorksButton: boolean
  footerCtaButton: boolean
  mobileStickyButton: boolean
  funnelHeader: boolean
  orderSummary: boolean
  checkoutButton: boolean
}

export type PublicSiteDraft = {
  logoUrl: string
  faviconUrl: string
  colors: ThemeColors
  landing: {
    heroHeadline: {
      line1: string
      line2: string
    }
    heroSubtext: string
    footerCta: FooterCtaConfig
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
  promoBanner: {
    enabled: boolean
    countdownLabel: string
    countdownTargetDate: string
    promoBadgeText: string
    quotaBadgeText: string
    evergreenEnabled: boolean
    evergreenCycleHours: number
  }
  reviews: {
    sectionLabel: string
    sectionHeadline: string
    sectionSubtext: string
    items: ReviewItem[]
  }
  heroCheckmarks: string[]
  trustBadges: {
    badge1: string
    badge2: string
    badge3: string
  }
  statsBar: {
    items: { val: string; label: string }[]
  }
  activityToast: {
    enabled: boolean
    intervalMs: number
    durationMs: number
    items: ToastItem[]
  }
  creationDelivery: {
    instantEnabled: boolean
    emailOtpEnabled: boolean
    whatsappEnabled: boolean
    agreementEnabled: boolean
    manualConfirmationEnabled: boolean
    deliveryDelayHours: number
    deliveryDelayUnit: 'hours' | 'days'
    maxRegenerations: number
    paymentAmount: number
    originalAmount: number
  }
  configSteps: ConfigSteps
  audioSamplesSection: AudioSamplesSectionConfig
  comparisonSection: ComparisonSectionConfig
  howItWorksSection: HowItWorksSectionConfig
  guaranteeSection: GuaranteeSectionConfig
  faqSection: FaqSectionConfig
  footer: FooterConfig
  miscText: MiscTextConfig
  priceVisibility: PriceVisibility
  upsell: UpsellConfig
  orderProcessingPage: OrderProcessingPageConfig
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
  themeSlug: string | null
  totalAmount?: number
}

export type CustomerDetail = any
export type OrderDetail = any
export type DraftDetail = any

