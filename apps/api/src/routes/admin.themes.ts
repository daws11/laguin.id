import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

import { generateTextWithOpenAI } from '../clients/openaiClient'
import { prisma } from '../lib/prisma'
import { getOrCreateSettings, getOpenAIApiKey, getOpenAIModel, invalidateSettingsCache } from '../lib/settings'
import { invalidateThemeCache } from '../lib/themes'

const SlugRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]{2}$/

const CreateSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(SlugRegex, 'slug must be lowercase alphanumeric + hyphens only'),
  name: z.string().min(1).max(200),
  isActive: z.boolean().optional(),
  settings: z.unknown().optional(),
})

const UpdateSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(SlugRegex, 'slug must be lowercase alphanumeric + hyphens only')
    .optional(),
  name: z.string().min(1).max(200).optional(),
  isActive: z.boolean().optional(),
  settings: z.unknown().optional(),
})

const SlugParamSchema = z.object({
  slug: z.string().min(1),
})

const AiGenerateSchema = z.object({
  prompt: z.string().min(1),
})

export const adminThemeRoutes: FastifyPluginAsync = async (app) => {
  app.get('/themes', async () => {
    const themes = await prisma.theme.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return themes
  })

  app.post('/themes', async (req, reply) => {
    const parsed = CreateSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_body', details: parsed.error.flatten() })
    }

    const existing = await prisma.theme.findUnique({ where: { slug: parsed.data.slug } })
    if (existing) {
      return reply.code(409).send({ error: 'slug_taken', message: 'A theme with this slug already exists.' })
    }

    const theme = await prisma.theme.create({
      data: {
        slug: parsed.data.slug,
        name: parsed.data.name,
        isActive: parsed.data.isActive ?? true,
        settings: (parsed.data.settings ?? undefined) as any,
      },
    })

    invalidateThemeCache(parsed.data.slug)
    return theme
  })

  app.put('/themes/:slug', async (req, reply) => {
    const params = SlugParamSchema.safeParse(req.params)
    if (!params.success) return reply.code(400).send({ error: 'invalid_params' })

    const parsed = UpdateSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_body', details: parsed.error.flatten() })
    }

    const existing = await prisma.theme.findUnique({ where: { slug: params.data.slug } })
    if (!existing) return reply.code(404).send({ error: 'not_found' })

    const newSlug = parsed.data.slug
    if (newSlug && newSlug !== params.data.slug) {
      const conflict = await prisma.theme.findUnique({ where: { slug: newSlug } })
      if (conflict) {
        return reply.code(409).send({ error: 'slug_taken', message: 'A theme with this slug already exists.' })
      }
    }

    const updated = await prisma.theme.update({
      where: { slug: params.data.slug },
      data: {
        slug: newSlug ?? undefined,
        name: parsed.data.name,
        isActive: parsed.data.isActive,
        settings: parsed.data.settings as any,
      },
    })

    invalidateThemeCache(params.data.slug)
    if (newSlug && newSlug !== params.data.slug) {
      invalidateThemeCache(newSlug)
      const settings = await getOrCreateSettings()
      if (settings.defaultThemeSlug === params.data.slug) {
        await prisma.settings.update({
          where: { id: settings.id },
          data: { defaultThemeSlug: newSlug },
        })
        invalidateSettingsCache()
      }
    }

    return updated
  })

  app.delete('/themes/:slug', async (req, reply) => {
    const params = SlugParamSchema.safeParse(req.params)
    if (!params.success) return reply.code(400).send({ error: 'invalid_params' })

    const existing = await prisma.theme.findUnique({ where: { slug: params.data.slug } })
    if (!existing) return reply.code(404).send({ error: 'not_found' })

    const settings = await getOrCreateSettings()
    if (settings.defaultThemeSlug === params.data.slug) {
      return reply.code(400).send({ error: 'cannot_delete_default', message: 'Cannot delete the default theme.' })
    }

    await prisma.theme.delete({ where: { slug: params.data.slug } })
    invalidateThemeCache(params.data.slug)
    return { ok: true }
  })

  app.post('/themes/:slug/duplicate', async (req, reply) => {
    const params = SlugParamSchema.safeParse(req.params)
    if (!params.success) return reply.code(400).send({ error: 'invalid_params' })

    const existing = await prisma.theme.findUnique({ where: { slug: params.data.slug } })
    if (!existing) return reply.code(404).send({ error: 'not_found' })

    const suffix = ' (Copy)'
    const maxNameLen = 200
    const baseName = existing.name.length + suffix.length > maxNameLen
      ? existing.name.slice(0, maxNameLen - suffix.length)
      : existing.name
    const newName = `${baseName}${suffix}`

    for (let attempt = 0; attempt < 10; attempt++) {
      const newSlug = attempt === 0
        ? `${params.data.slug}-copy`
        : `${params.data.slug}-copy-${attempt + 1}`

      try {
        const duplicate = await prisma.theme.create({
          data: {
            slug: newSlug,
            name: newName,
            isActive: false,
            settings: existing.settings as any,
          },
        })
        return duplicate
      } catch (e: any) {
        if (e?.code === 'P2002' && attempt < 9) continue
        throw e
      }
    }

    return reply.code(409).send({ error: 'slug_taken', message: 'Could not generate a unique slug for the duplicate.' })
  })

  app.post('/themes/ai-generate', async (req, reply) => {
    const parsed = AiGenerateSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_body', details: parsed.error.flatten() })
    }

    const apiKey = await getOpenAIApiKey()
    if (!apiKey) {
      return reply.code(400).send({ error: 'openai_key_not_configured' })
    }

    const model = await getOpenAIModel()

    const systemPrompt = `You are a marketing copywriter for Laguin.id, a personalized song creation platform. You generate theme content for landing pages in Indonesian (Bahasa Indonesia) unless the user specifies otherwise.

Given a theme description, generate ALL the text content for a themed landing page and configuration flow. Return ONLY valid JSON (no markdown, no code blocks) matching this exact structure:

{
  "landing": {
    "heroHeadline": { "line1": "string (catchy first line)", "line2": "string (emotional second line)" },
    "heroSubtext": "string (supports <strong> tags, mention the product benefit and delivery time)",
    "footerCta": {
      "headline": "string (urgency-driven call to action)",
      "subtitle": "string (supports <strong>, social proof with numbers)"
    },
    "heroOverlay": {
      "quote": "string (emotional testimonial quote about receiving the song)",
      "authorName": "string (Indonesian first name)",
      "authorLocation": "string (Indonesian city)"
    },
    "heroPlayer": {
      "playingBadgeText": "string (e.g. Playing)",
      "cornerBadgeText": "string (e.g. Mother's Day Special)",
      "verifiedBadgeText": "string (e.g. Verified Purchase)",
      "quote": "string (short emotional reaction)",
      "authorName": "string",
      "authorSubline": "string (city + occasion)"
    },
    "audioSamples": {
      "nowPlaying": {
        "name": "string (song title like 'Untuk [Name], [Subtitle]')",
        "quote": "string (emotional description of the song)",
        "time": "string (e.g. 3:24)",
        "metaText": "string (e.g. Jakarta • Verified)"
      },
      "playlist": [
        { "title": "string (song title)", "subtitle": "string (genre • duration)", "ctaLabel": "PUTAR" },
        { "title": "string", "subtitle": "string", "ctaLabel": "PUTAR" },
        { "title": "string", "subtitle": "string", "ctaLabel": "PUTAR" }
      ]
    }
  },
  "promoBanner": {
    "countdownLabel": "string (emoji + occasion countdown text)",
    "countdownTargetDate": "string (YYYY-MM-DD format, the date of the occasion, e.g. 2027-05-11 for Mother's Day)",
    "promoBadgeText": "string (emoji + special occasion text)",
    "quotaBadgeText": "string (scarcity text like '11 kuota!')"
  },
  "reviews": {
    "sectionLabel": "string (e.g. Reaksi Nyata)",
    "sectionHeadline": "string (supports <span> with styling, about emotional reactions)",
    "sectionSubtext": "string (teasing subtext)",
    "items": [
      {
        "style": "accent",
        "quote": "string (supports <strong>, long emotional testimonial)",
        "authorName": "string",
        "authorMeta": "string (city • date)"
      },
      {
        "style": "dark-chat",
        "quote": "",
        "chatMessages": ["string (WhatsApp message 1)", "string (message 2)", "string (message 3)"],
        "authorName": "string",
        "authorMeta": "WhatsApp • Kemarin"
      },
      {
        "style": "white",
        "quote": "string (supports <strong>, funny/emotional testimonial)",
        "authorName": "string",
        "authorMeta": "string (city • date)"
      }
    ]
  },
  "heroCheckmarks": ["string", "string", "string"],
  "trustBadges": { "badge1": "string", "badge2": "string", "badge3": "string" },
  "statsBar": {
    "items": [
      { "val": "string (number/stat)", "label": "string" },
      { "val": "string", "label": "string" },
      { "val": "string", "label": "string" }
    ]
  },
  "activityToast": {
    "items": [
      { "fullName": "string (Indonesian full name)", "city": "string (Indonesian city)", "recipientName": "string (Indonesian first name)" },
      { "fullName": "string", "city": "string", "recipientName": "string" },
      { "fullName": "string", "city": "string", "recipientName": "string" }
    ]
  },
  "colors": {
    "accentColor": "string (hex color fitting the theme, e.g. #E11D48 for Valentine, #EC4899 for Mother's Day)",
    "bgColor1": "string (soft bg hex color)",
    "bgColor2": "string (page bg hex color, usually #FFFFFF or very light)"
  },
  "configSteps": {
    "step0": {
      "bannerHeadline": "string (occasion-specific banner)",
      "mainHeadline": "string (supports <span> with styling, main value proposition)",
      "guaranteeTitle": "string",
      "guaranteeText": "string (supports <span> with styling)",
      "howItWorksTitle": "string",
      "howItWorksSteps": [
        { "title": "string", "subtitle": "string" },
        { "title": "string", "subtitle": "string" },
        { "title": "string", "subtitle": "string" }
      ],
      "bottomCtaText": "string"
    },
    "step1": {
      "headline": "string (who is the recipient?)",
      "subtitle": "string",
      "relationshipChips": [
        { "label": "string", "icon": "emoji", "value": "string" },
        { "label": "string", "icon": "emoji", "value": "string" },
        { "label": "string", "icon": "emoji", "value": "string" },
        { "label": "string", "icon": "emoji", "value": "string" },
        { "label": "string", "icon": "emoji", "value": "string" }
      ],
      "nameFieldLabel": "string",
      "nameFieldPlaceholder": "string (e.g. cth. Mama)",
      "occasionFieldLabel": "string",
      "occasionFieldPlaceholder": "string",
      "socialProofText": "string (social proof with numbers)"
    },
    "step2": {
      "headline": "string (choose the vibe/style)",
      "subtitle": "string",
      "vibeChips": [
        { "id": "string", "label": "string", "desc": "string", "icon": "emoji" },
        { "id": "string", "label": "string", "desc": "string", "icon": "emoji" },
        { "id": "string", "label": "string", "desc": "string", "icon": "emoji", "badge": "Best" },
        { "id": "string", "label": "string", "desc": "string", "icon": "emoji" },
        { "id": "string", "label": "string", "desc": "string", "icon": "emoji" },
        { "id": "string", "label": "string", "desc": "string", "icon": "emoji" }
      ],
      "voiceLabel": "string",
      "voiceOptions": [
        { "value": "Female", "label": "string" },
        { "value": "Male", "label": "string" },
        { "value": "Surprise me", "label": "string" }
      ],
      "languageLabel": "string",
      "languageOptions": [
        { "value": "English", "label": "English" },
        { "value": "Indonesian", "label": "Bahasa Indonesia" }
      ]
    },
    "step3": {
      "headline": "string (tell your story)",
      "subtitle": "string (supports <span> styling)",
      "tipBullets": ["string", "string"],
      "storyPrompts": [
        { "label": "string", "icon": "emoji" },
        { "label": "string", "icon": "emoji" },
        { "label": "string", "icon": "emoji" },
        { "label": "string", "icon": "emoji" }
      ],
      "textareaPlaceholder": "string"
    },
    "step4": {
      "headline": "string (everything is ready!)",
      "subtitleTemplate": "string (use {recipient} placeholder)",
      "manualSubtitle": "string",
      "orderSummaryLabel": "string",
      "whatsappLabel": "string",
      "whatsappPlaceholder": "string",
      "emailLabel": "string",
      "emailPlaceholder": "string",
      "nextStepsTitle": "string",
      "nextSteps": [
        { "text": "string" },
        { "text": "string (use {delivery} placeholder)" },
        { "text": "string" }
      ],
      "manualNextSteps": [
        { "text": "string" },
        { "text": "string" },
        { "text": "string" }
      ],
      "securityBadges": ["string", "string (use {delivery} placeholder)"],
      "draftTimerText": "string (use {timer} placeholder)"
    }
  }
}

Important rules:
- All text should be in Indonesian (Bahasa Indonesia) unless the user says otherwise
- Use culturally appropriate Indonesian names, cities, and references
- Make testimonials feel authentic and emotional
- The relationship chips in step1 should be appropriate for the occasion (e.g. for Mother's Day: Mama, Ibu, Bunda, Nenek, Tante)
- The vibe chips in step2 should always keep the same music genre IDs but adapt descriptions for the occasion
- Keep {recipient}, {delivery}, {timer} placeholders exactly as shown
- Do NOT include any fields related to pricing, payment amounts, or boolean toggles
- Do NOT include audioUrl fields (those are file uploads, not text)
- Do NOT include logoUrl or image/video URLs
- Return ONLY the JSON object, no explanations`

    let response: string
    try {
      response = await generateTextWithOpenAI({
        apiKey,
        prompt: parsed.data.prompt,
        systemPrompt,
        model: model || undefined,
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      return reply.code(502).send({ error: 'ai_request_failed', message: msg })
    }

    try {
      let jsonString = response
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
      if (jsonMatch) {
        jsonString = jsonMatch[1]
      }

      const settings = JSON.parse(jsonString.trim())
      return { settings }
    } catch {
      return reply.code(500).send({ error: 'ai_response_parse_error', raw: response })
    }
  })
}
