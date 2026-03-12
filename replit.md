# Valentine Projects (Laguin.id)

## Overview
A monorepo application designed to create personalized songs for various special occasions (e.g., Valentine's Day, Mother's Day). It features a dynamic multi-theme system, allowing for custom landing pages and song configuration flows for different events. The project aims to provide a streamlined experience for users to order personalized songs and for administrators to manage themes, orders, and customer data.

## User Preferences
I want iterative development. Ask before making major changes.

## System Architecture
The project uses a monorepo structure with `npm workspaces`, separating the frontend (`apps/web`), backend (`apps/api`), and shared utilities (`packages/shared`).

**Frontend (`apps/web`):**
- Built with React 19, Vite, TailwindCSS, React Router, React Hook Form, and `shadcn/ui`.
- Supports a multi-theme system where each theme has a unique slug and configurable settings (colors, hero media, player, reviews, promo banners, config steps, logo, text content).
- Themes define custom CSS variables (`--theme-accent`, `--theme-bg`) for consistent branding.
- Public routes: `/:themeSlug` (landing page), `/:themeSlug/config` (song configurator), `/order/:orderId` (delivery page with phone verification). The root `/` path renders the default theme.
- Optimized for performance with self-hosted fonts, WebP image compression, lazy loading, and code splitting.

**Backend (`apps/api`):**
- Developed with Fastify, utilizing Prisma ORM for database interactions.
- Implements JWT authentication.
- Integrates with OpenRouter for AI content generation, Resend/SMTP for email, and Xendit for payment processing.
- Provides APIs for public theme settings, theme management, order processing, customer management, and funnel analytics.
- Handles file uploads to Replit Object Storage for persistence.
- Creation & Delivery settings (e.g., instant delivery, email OTP, manual confirmation, delivery delay) are configurable per theme, with a global fallback.

**Database:**
- PostgreSQL is used, managed by Prisma ORM. The Replit built-in database is utilized in the Replit environment.

**Multi-Theme System Details:**
- Each theme can be configured with specific content for the landing page (hero text, reviews, promo banner), and a step-by-step song configuration process (ConfigStep0, ConfigStep1, ConfigStep3).
- All landing page sections are fully editable via admin: audio samples section, comparison section, how-it-works steps, guarantee section, FAQ items, footer text, misc labels (CTA buttons, star line, quota badge).
- Price visibility is configurable per-location (11 toggles) via admin "Price Visibility" tab: promo banner, header, hero CTA, audio samples CTA, comparison section, how-it-works CTA, footer CTA, mobile sticky bar, funnel header, order summary, checkout button. Stored in `publicSiteConfig.priceVisibility`.
- Landing page components accept text as props with sensible defaults; config stored in publicSiteConfig JSON blob.
- An AI theme content generator is integrated to automatically populate text fields based on prompts using OpenRouter.
- Admin interface includes a comprehensive theme editor for visual configuration of all theme-specific settings.

**Order Delivery Page (`/order/:orderId`):**
- Public page for customers to download their completed song and lyrics.
- No phone gate — song content loads immediately on page visit (orderId itself acts as access token).
- New `GET /api/public/order/:id/content` endpoint returns song data without phone verification.
- Shows "song is being created" message for in-progress orders.
- All page text is editable via global admin settings (Settings → Delivery Page).
- Legacy `POST /api/public/order/:id/verify` endpoint still exists for backward compatibility.

**Song Regeneration:**
- Customers can request up to 2 regenerations from the delivery page.
- 3 revision types: describe changes, edit lyrics, new story.
- Music style + voice selectors; re-triggers generation pipeline.
- Tracks `regenerationCount` on Order model.

**Testimonial Video Upload:**
- Customers can upload testimonial videos from the delivery page after phone verification.
- `TestimonialVideo` DB model with orderId, videoUrl, status (pending/approved/rejected), createdAt.
- Public endpoint `POST /api/public/order/:id/testimonial` with multipart upload.
- Stored in object storage under `testimonials/` prefix.
- Admin endpoints: `GET /api/admin/testimonial-videos`, `POST /api/admin/testimonial-videos/:id/approve`, `POST /api/admin/testimonial-videos/:id/reject`.

**Automated WhatsApp Song Delivery (Two-Step Flow via YCloud):**
- Step 1: When song is complete, backend auto-sends `song_delivery` template with button "Dengarkan Sekarang"
- Step 2: Customer taps button → YCloud sends "Dengarkan Sekarang" reply → `POST /api/ycloud/webhook` receives it → Backend sends delivery link as text message
- Webhook handler: `apps/api/src/routes/ycloud.webhook.ts` — detects button reply, looks up customer, sends `/order/:id` URL
- Idempotent: only sends the link once per order (`whatsapp_link_sent` event guards re-sends)
- Admin settings: `siteUrl` (stored in `whatsappConfig.siteUrl`) used to build delivery links; falls back to `APP_BASE_URL` env var
- Optional webhook security: set `ycloudWebhookSecret` in admin, append `?token=<secret>` to YCloud webhook URL
- Webhook URL to configure in YCloud: `<your-domain>/api/ycloud/webhook` (optionally with `?token=<secret>`)

**Admin Features:**
- CRUD operations for themes with a visual editor.
- Settings management for global configurations like API keys, WhatsApp integration, Meta Pixel IDs, and delivery page text.
- Orders and Customers tabs with search, filter, sorting, and bulk actions.
- Funnel analytics to track user journeys from homepage to order confirmation.
- Order detail includes `regenerationCount` and `testimonialVideos`.

## External Dependencies
- **PostgreSQL:** For data storage.
- **OpenRouter:** Integrated via OpenAI SDK for AI text generation.
- **Resend/SMTP:** For sending emails.
- **Xendit:** Payment gateway for processing transactions.
- **@replit/object-storage:** For persistent file uploads (audio, video, images).
- **Vite:** Frontend build tool.
- **TailwindCSS:** Utility-first CSS framework.
- **React Hook Form:** For form management.
- **shadcn/ui:** UI component library.
- **Prisma ORM:** Database toolkit.
- **Fastify:** Backend web framework.
- **JWT:** For authentication.

## Order Processing Architecture
- **Event-driven** (not polling): Order generation triggers immediately when events happen
- Xendit payment webhook → triggers `processOrderGeneration()` in background (fire-and-forget)
- Kie.ai music callback → triggers generation completion + delivery
- Admin retry button → triggers generation immediately
- PostgreSQL advisory locks prevent concurrent processing of the same order
- Key file: `apps/api/src/pipeline/triggerGeneration.ts`
- Worker process (`apps/api/src/worker.ts`) kept as optional dev safety net, not needed in production
- Production uses autoscale deployment (no always-on VM needed)