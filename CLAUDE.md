# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CORtrack is a client-side React prototype for managing Change Order Requests (CORs), employees, and stock inventory in a construction/project context. All data is persisted in localStorage — there is no backend API.

## Commands

```bash
npm run dev          # Dev server on port 8080
npm run build        # Production build (TypeScript check + Vite)
npm run build:dev    # Dev build (skips type checking)
npm run lint         # ESLint
npm run test         # Vitest (single run)
npm run test:watch   # Vitest (watch mode)
npm run preview      # Preview production build
```

Package manager: Bun (bun.lock) or npm (package-lock.json) — both lock files exist.

## Architecture

**Tech stack:** React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui (Radix primitives)

**Path alias:** `@/*` maps to `./src/*`

### State & Data

Three React Context providers manage all domain data with localStorage persistence:
- `CORContext` — Change Order Requests (CRUD + seeded sample data)
- `EmployeeContext` — Employees/crew
- `StockContext` — Inventory items

Each context hydrates from localStorage on mount and writes back on changes. TanStack React Query is installed but not yet actively used (future API integration point).

### Routing & Auth

React Router v6 with `ProtectedRoute` wrapper. Auth is localStorage-based (`cortrack_auth` key, demo credentials: admin/admin). All authenticated pages render inside `AppLayout` which provides the sidebar.

### Component Organization

- `src/pages/` — Route-level page components (COR, Employees, Stock, Dashboard, Login)
- `src/components/cor/` — COR-specific components (CORDrawer for creation, CORDetailPanel for viewing/editing)
- `src/components/ui/` — 60+ shadcn/ui components (do not manually edit — use `npx shadcn-ui@latest add <component>`)
- `src/components/` — App-level shared components (AppLayout, AppSidebar, ProtectedRoute, SharedUI, PageHeader, SummaryCard)
- `src/contexts/` — Context providers with CRUD logic and localStorage sync
- `src/hooks/` — Custom hooks (mobile detection, toast)
- `src/lib/utils.ts` — Tailwind class merging utility (`cn()`)

### Styling

Tailwind with CSS variable theming (HSL values defined in `src/index.css`). Custom utility classes for status badges, cards, and tables are in `index.css`. Dark mode supported via class strategy.

## Conventions

- Forms use React Hook Form + Zod validation
- Toast notifications via Sonner
- Lists have search/filter and pagination (10 items/page)
- TypeScript config is lenient (no `strictNullChecks`, no `noImplicitAny`)
- ESLint ignores unused variables
