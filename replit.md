# Valentine Projects (Laguin.id)

## Overview
A monorepo application for creating personalized Valentine's songs. Built with a React + Vite frontend and Fastify API backend, using PostgreSQL with Prisma ORM.

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
- 2026-02-16: Initial Replit import setup
  - Configured Vite for Replit (allowedHosts, host 0.0.0.0, port 5000)
  - Set up PostgreSQL with Replit built-in database
  - Ran all Prisma migrations
  - Created API .env with required secrets
