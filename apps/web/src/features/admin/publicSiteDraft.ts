import type { PublicSiteDraft, Settings, ToastItem } from './types'

export const defaultThemeColors = {
  accentColor: '#E11D48',
  bgColor1: '#FFF5F7',
  bgColor2: '#FFFFFF',
}

export const defaultPublicSiteDraft: PublicSiteDraft = {
  logoUrl: '/logo.png',
  colors: { ...defaultThemeColors },
  landing: {
    heroHeadline: {
      line1: 'Valentine kali ini,',
      line2: 'buat dia menangis.',
    },
    heroSubtext: 'Lagu personal dengan <strong>namanya</strong> di lirik. Dikirim dalam 24 jam.',
    footerCta: {
      headline: 'Jangan biarkan Valentine berlalu',
      subtitle: 'Beri dia hadiah yang tak akan pernah dia lupakan. Gabung <strong>2,847 wanita</strong> yang membuat pasangannya menangis terharu.',
    },
    heroMedia: {
      mode: 'image',
      imageUrl: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=2940&auto=format&fit=crop',
      videoUrl: '',
    },
    heroOverlay: {
      quote: 'Dia menangis sebelum chorus berakhir',
      authorName: 'Rina',
      authorLocation: 'Jakarta',
      authorAvatarUrl: 'https://images.unsplash.com/photo-1530254541043-129f4c372200?w=200&h=200&fit=crop',
    },
    heroPlayer: {
      enabled: true,
      playingBadgeText: 'Playing',
      cornerBadgeText: "Valentine's Special",
      verifiedBadgeText: 'Verified Purchase',
      quote: 'He tried not to cry. He failed.',
      authorName: 'Rachel',
      authorSubline: "London • Valentine's 2025",
      authorAvatarUrl: 'https://images.unsplash.com/photo-1530254541043-129f4c372200?w=200&h=200&fit=crop',
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
  creationDelivery: {
    instantEnabled: true,
    emailOtpEnabled: true,
    whatsappEnabled: true,
    agreementEnabled: false,
    manualConfirmationEnabled: false,
    deliveryDelayHours: 24,
    paymentAmount: 497000,
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

export function clampInt(n: number, min: number, max: number) {
  const x = Math.floor(n)
  return Math.min(max, Math.max(min, x))
}

export function moveItem<T>(arr: T[], from: number, to: number) {
  const copy = [...arr]
  const item = copy.splice(from, 1)[0]
  copy.splice(to, 0, item)
  return copy
}

export function parseToastItemsJson(raw: string): ToastItem[] {
  const parsed = JSON.parse(raw) as any
  const arr = Array.isArray(parsed) ? parsed : parsed && typeof parsed === 'object' ? parsed.items : null
  if (!Array.isArray(arr)) return []
  return safeArr(arr, (x) => ({
    fullName: asString(x?.fullName, '').trim(),
    city: asString(x?.city, '').trim(),
    recipientName: asString(x?.recipientName, '').trim(),
  })).filter((x) => x.fullName || x.city || x.recipientName)
}

export function buildDraftFromSettings(s: Settings | null): PublicSiteDraft {
  const cfg = s?.publicSiteConfig && typeof s.publicSiteConfig === 'object' ? (s.publicSiteConfig as any) : {}
  const landing = cfg?.landing && typeof cfg.landing === 'object' ? cfg.landing : {}
  const heroMedia = landing?.heroMedia && typeof landing.heroMedia === 'object' ? landing.heroMedia : {}
  const heroOverlay = landing?.heroOverlay && typeof landing.heroOverlay === 'object' ? landing.heroOverlay : {}
  const heroPlayer = landing?.heroPlayer && typeof landing.heroPlayer === 'object' ? landing.heroPlayer : {}
  const audioSamples = landing?.audioSamples && typeof landing.audioSamples === 'object' ? landing.audioSamples : {}
  const nowPlaying =
    audioSamples?.nowPlaying && typeof audioSamples.nowPlaying === 'object' ? audioSamples.nowPlaying : {}

  const playlist = safeArr(audioSamples?.playlist, (x) => ({
    title: asString(x?.title, ''),
    subtitle: asString(x?.subtitle, ''),
    ctaLabel: asString(x?.ctaLabel, 'PUTAR'),
    audioUrl: asString(x?.audioUrl, ''),
  })).filter((x) => x.title || x.subtitle || x.audioUrl)

  const heroHeadline = landing?.heroHeadline && typeof landing.heroHeadline === 'object' ? landing.heroHeadline : {}
  const footerCta = landing?.footerCta && typeof landing.footerCta === 'object' ? landing.footerCta : {}
  const colors = cfg?.colors && typeof cfg.colors === 'object' ? cfg.colors : {}
  const cd = cfg?.creationDelivery && typeof cfg.creationDelivery === 'object' ? cfg.creationDelivery : {}
  const toast = cfg?.activityToast && typeof cfg.activityToast === 'object' ? cfg.activityToast : {}
  const toastItems = safeArr(toast?.items, (x) => ({
    fullName: asString(x?.fullName, ''),
    city: asString(x?.city, ''),
    recipientName: asString(x?.recipientName, ''),
  })).filter((x) => x.fullName || x.city || x.recipientName)

  const imageUrl = asString(heroMedia?.imageUrl, defaultPublicSiteDraft.landing.heroMedia.imageUrl)
  const videoUrl = asString(heroMedia?.videoUrl, '')
  const mode: 'image' | 'video' =
    heroMedia?.videoUrl && typeof heroMedia.videoUrl === 'string' && heroMedia.videoUrl.trim() ? 'video' : 'image'

  return {
    logoUrl: asString(cfg?.logoUrl, defaultPublicSiteDraft.logoUrl),
    colors: {
      accentColor: asString(colors?.accentColor, defaultThemeColors.accentColor),
      bgColor1: asString(colors?.bgColor1, defaultThemeColors.bgColor1),
      bgColor2: asString(colors?.bgColor2, defaultThemeColors.bgColor2),
    },
    landing: {
      heroHeadline: {
        line1: asString(heroHeadline?.line1, defaultPublicSiteDraft.landing.heroHeadline.line1),
        line2: asString(heroHeadline?.line2, defaultPublicSiteDraft.landing.heroHeadline.line2),
      },
      heroSubtext: asString(landing?.heroSubtext, defaultPublicSiteDraft.landing.heroSubtext),
      footerCta: {
        headline: asString(footerCta?.headline, defaultPublicSiteDraft.landing.footerCta.headline),
        subtitle: asString(footerCta?.subtitle, defaultPublicSiteDraft.landing.footerCta.subtitle),
      },
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
    creationDelivery: {
      instantEnabled: asBool(cd?.instantEnabled, defaultPublicSiteDraft.creationDelivery.instantEnabled),
      emailOtpEnabled: asBool(cd?.emailOtpEnabled, defaultPublicSiteDraft.creationDelivery.emailOtpEnabled),
      whatsappEnabled: asBool(cd?.whatsappEnabled, defaultPublicSiteDraft.creationDelivery.whatsappEnabled),
      agreementEnabled: asBool(cd?.agreementEnabled, defaultPublicSiteDraft.creationDelivery.agreementEnabled),
      manualConfirmationEnabled: asBool(cd?.manualConfirmationEnabled, defaultPublicSiteDraft.creationDelivery.manualConfirmationEnabled),
      deliveryDelayHours: asNumber(cd?.deliveryDelayHours, defaultPublicSiteDraft.creationDelivery.deliveryDelayHours),
      paymentAmount: asNumber(cd?.paymentAmount, defaultPublicSiteDraft.creationDelivery.paymentAmount),
    },
  }
}

export function buildPublicSiteConfigPayload(draft: PublicSiteDraft) {
  const nextLanding: any = {
    heroHeadline: {
      line1: draft.landing.heroHeadline.line1.trim(),
      line2: draft.landing.heroHeadline.line2.trim(),
    },
    heroSubtext: draft.landing.heroSubtext.trim(),
    footerCta: {
      headline: draft.landing.footerCta.headline.trim(),
      subtitle: draft.landing.footerCta.subtitle.trim(),
    },
    heroMedia: {
      imageUrl: draft.landing.heroMedia.imageUrl.trim(),
      videoUrl: draft.landing.heroMedia.mode === 'video' ? draft.landing.heroMedia.videoUrl.trim() || null : null,
    },
    heroOverlay: {
      quote: draft.landing.heroOverlay.quote.trim(),
      authorName: draft.landing.heroOverlay.authorName.trim(),
      authorLocation: draft.landing.heroOverlay.authorLocation.trim(),
      authorAvatarUrl: draft.landing.heroOverlay.authorAvatarUrl.trim() || null,
    },
    heroPlayer: {
      enabled: draft.landing.heroPlayer.enabled,
      playingBadgeText: draft.landing.heroPlayer.playingBadgeText.trim(),
      cornerBadgeText: draft.landing.heroPlayer.cornerBadgeText.trim(),
      verifiedBadgeText: draft.landing.heroPlayer.verifiedBadgeText.trim(),
      quote: draft.landing.heroPlayer.quote.trim(),
      authorName: draft.landing.heroPlayer.authorName.trim(),
      authorSubline: draft.landing.heroPlayer.authorSubline.trim(),
      authorAvatarUrl: draft.landing.heroPlayer.authorAvatarUrl.trim() || null,
      audioUrl: draft.landing.heroPlayer.audioUrl.trim() || null,
    },
    audioSamples: {
      nowPlaying: {
        name: draft.landing.audioSamples.nowPlaying.name.trim(),
        quote: draft.landing.audioSamples.nowPlaying.quote.trim(),
        time: draft.landing.audioSamples.nowPlaying.time.trim(),
        metaText: draft.landing.audioSamples.nowPlaying.metaText.trim() || null,
        audioUrl: draft.landing.audioSamples.nowPlaying.audioUrl.trim() || null,
      },
      playlist: draft.landing.audioSamples.playlist.map((x) => ({
        title: x.title.trim(),
        subtitle: x.subtitle.trim(),
        ctaLabel: x.ctaLabel.trim() || 'PUTAR',
        audioUrl: x.audioUrl.trim() || null,
      })),
    },
  }

  const nextToast: any = {
    enabled: draft.activityToast.enabled,
    intervalMs: clampInt(draft.activityToast.intervalMs, 2000, 120000),
    durationMs: clampInt(draft.activityToast.durationMs, 1000, 60000),
    items: draft.activityToast.items.map((x) => ({
      fullName: x.fullName.trim(),
      city: x.city.trim(),
      recipientName: x.recipientName.trim(),
    })),
  }

  const nextCreationDelivery = {
    instantEnabled: draft.creationDelivery.instantEnabled,
    emailOtpEnabled: draft.creationDelivery.emailOtpEnabled,
    whatsappEnabled: draft.creationDelivery.whatsappEnabled,
    agreementEnabled: draft.creationDelivery.agreementEnabled,
    manualConfirmationEnabled: draft.creationDelivery.manualConfirmationEnabled,
    deliveryDelayHours: draft.creationDelivery.deliveryDelayHours,
    paymentAmount: draft.creationDelivery.paymentAmount,
  }

  const nextColors = {
    accentColor: draft.colors.accentColor.trim() || defaultThemeColors.accentColor,
    bgColor1: draft.colors.bgColor1.trim() || defaultThemeColors.bgColor1,
    bgColor2: draft.colors.bgColor2.trim() || defaultThemeColors.bgColor2,
  }

  const logoUrl = draft.logoUrl.trim() || defaultPublicSiteDraft.logoUrl

  return { logoUrl, colors: nextColors, landing: nextLanding, activityToast: nextToast, creationDelivery: nextCreationDelivery }
}

