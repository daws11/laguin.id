# Valentine Projects (Laguin.id)

## Overview
A monorepo application for creating personalized songs for special occasions. Built with a React + Vite frontend and Fastify API backend, using PostgreSQL with Prisma ORM. Supports multiple themed landing pages (Valentine, Mother's Day, etc.).

## Project Architecture
- **Monorepo** using npm workspaces
- `apps/web` - React + Vite frontend (port 5000 in dev)
- `apps/api` - Fastify backend API (port 3001)
- `packages/shared` - Shared types and utilities (built with tsup)
- `infra/` - Infrastructure configs (Docker Compose for local Postgres)

## Tech Stack
- **Frontend**: React 19, Vite, TailwindCSS, React Router, React Hook Form, shadcn/ui
- **Backend**: Fastify, Prisma ORM, JWT auth, OpenAI integration, Resend/SMTP email
- **Database**: PostgreSQL (Replit built-in)
- **Language**: TypeScript (ESM throughout)

## Multi-Theme System
- Each theme has its own slug, name, active status, and settings (landing page config JSON)
- Routes: `/:themeSlug` (landing page), `/:themeSlug/config` (configurator)
- Root `/` renders the default theme (set in admin Settings)
- Theme context provided via `ThemeProvider` -> `useThemeSlug()` hook
- Orders, drafts, page views all tagged with `themeSlug`
- Admin: Themes tab for CRUD with visual form editor (Hero Media, Overlay, Player, Music, Toast, Creation & Delivery)
- Admin Settings tab shows only global/system settings (WhatsApp, API Keys)
- Creation & Delivery settings (instant delivery, email OTP, agreement, manual confirmation, delay) are per-theme
- Backend and order pipeline use theme-specific Creation & Delivery settings with global fallback
- Theme filter on Orders and Funnel admin tabs
- API: `/api/public/settings?theme=slug`, `/api/public/themes`, `/api/admin/themes`

## Development
- Frontend runs on `0.0.0.0:5000` with Vite dev server
- API runs on `localhost:3001`
- Vite proxies `/api` and `/uploads` to the API
- Workflow: `npx concurrently` runs both servers together

## Key Configuration
- API env in `apps/api/.env` (DATABASE_URL inherited from Replit environment)
- Admin password: `admin123` (set in .env)
- Prisma schema at `apps/api/prisma/schema.prisma`
- Shared package must be built before other packages (`npm run build -w shared`)

## Recent Changes
- 2026-02-16: Creation & Delivery moved to per-theme
  - Added creationDelivery to theme settings JSON (instantEnabled, emailOtpEnabled, agreementEnabled, manualConfirmationEnabled, deliveryDelayHours)
  - Theme editor shows Creation & Delivery section in sidebar
  - Public settings API returns theme-specific values with global fallback
  - Order creation and delivery pipeline use theme-specific settings
  - ConfigRoute and CheckoutRoute pass theme slug when fetching settings
  - Removed Creation & Delivery from global Settings tab
- 2026-02-16: Theme settings visual editor
  - Split PublicSiteConfigSection into LandingContentConfigSection (per-theme) and SystemSettingsSection (global)
  - Theme edit uses visual form UI (Hero Media, Overlay, Player, Music, Toast, Creation & Delivery) instead of raw JSON
  - Settings tab shows only system settings (WhatsApp Gateway, API Keys)
  - Draft state management with dirty tracking and save-on-demand for theme settings
- 2026-02-16: Multi-theme system
  - New Theme model (slug, name, isActive, settings JSON)
  - themeSlug added to Order, OrderDraft, PageView
  - defaultThemeSlug + showThemesInFooter in Settings
  - Admin CRUD for themes (/api/admin/themes)
  - Public settings returns theme-specific config via ?theme=slug
  - Frontend routing: /:themeSlug, /:themeSlug/config, / (default theme)
  - ThemeContext provider for passing theme slug to components
  - Admin Themes tab with create/edit/delete/set-default
  - Theme filter on Funnel and Orders admin tabs
  - Valentine seeded as first theme and set as default
- 2026-02-16: Added Funnel analytics feature
  - New PageView model for tracking homepage visits
  - Public /api/public/track endpoint for page view tracking
  - Landing page auto-tracks visits with sessionId
  - Admin /api/admin/funnel endpoint aggregates funnel data by date range
  - New "Funnel" admin tab with visual funnel chart and date range picker
  - Funnel tracks: Homepage -> Config Steps 0-4 -> Order Created -> Order Confirmed
- 2026-02-16: UI/UX improvements
  - Optimized landing page header/hero for mobile above-the-fold CTA visibility
  - Made /config page responsive for larger screens
  - Admin menu order: Orders, Funnel, Customers, Settings, Prompts
  - Indonesian validation error messages
- 2026-02-16: Initial Replit import setup
  - Configured Vite for Replit (allowedHosts, host 0.0.0.0, port 5000)
  - Set up PostgreSQL with Replit built-in database
  - Ran all Prisma migrations
  - Created API .env with required secrets
