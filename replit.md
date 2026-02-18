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
- Public routes: `/:themeSlug` (landing page), `/:themeSlug/config` (song configurator). The root `/` path renders the default theme.
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
- An AI theme content generator is integrated to automatically populate text fields based on prompts using OpenRouter.
- Admin interface includes a comprehensive theme editor for visual configuration of all theme-specific settings.

**Admin Features:**
- CRUD operations for themes with a visual editor.
- Settings management for global configurations like API keys, WhatsApp integration, and Meta Pixel IDs.
- Orders and Customers tabs with search, filter, sorting, and bulk actions.
- Funnel analytics to track user journeys from homepage to order confirmation.

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