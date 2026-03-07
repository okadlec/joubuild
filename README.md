# JouBuild

Construction project management platform built as a monorepo with web and mobile apps.

## Tech Stack

- **Framework:** Next.js 15 (App Router, Turbopack)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **Backend:** Supabase (Auth, Database, Storage, Realtime)
- **Mobile:** Capacitor (iOS & Android)
- **Monorepo:** Turborepo + pnpm

## Project Structure

```
apps/
  web/          Next.js web application
  mobile/       Capacitor mobile app wrapper
packages/
  shared/       Shared types, constants, and utilities
  supabase/     Supabase client, queries, and realtime helpers
  ui/           Shared UI components
```

## Features

- **Projects** — Create and manage construction projects with cover images, statuses, and team members
- **Documents** — File and document management per project
- **Photos** — Photo documentation with annotations (Konva canvas)
- **Plans** — Construction plan viewer with PDF support
- **Tasks** — Task management with custom categories
- **Timesheets** — Time tracking per project
- **Forms** — Custom form builder
- **Reports** — Project reporting
- **Specifications** — Technical specifications management
- **Organizations** — Multi-tenant org management with role-based access
- **Permissions** — Granular project member permissions and folder-level access control
- **i18n** — Czech and English localization (next-intl)

## Prerequisites

- Node.js >= 20
- pnpm 10.x

## Getting Started

```bash
# Install dependencies
pnpm install

# Start the web app in development mode
pnpm dev:web

# Build the web app
pnpm build:web
```

## Mobile

```bash
# Sync Capacitor plugins
pnpm mobile:sync

# Open in Xcode
pnpm mobile:ios

# Open in Android Studio
pnpm mobile:android
```

## Environment Variables

The web app requires the following environment variables:

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (server-side only)
