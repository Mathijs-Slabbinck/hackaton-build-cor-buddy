# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CORtrack is a client-side React prototype for managing Change Order Requests (CORs), employees, stock inventory, and project scheduling in a construction/project context. Supports multi-company tenancy with role-based access (Owner, Admin, Viewer). All data is persisted in localStorage — there is no backend API.

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

Five React Context providers manage all domain data with localStorage persistence:
- `AuthContext` — Multi-company auth with hardcoded users, session management, role-based access (Owner, Admin, Viewer)
- `CORContext` — Change Order Requests (CRUD + seeded sample data)
- `EmployeeContext` — Employees/crew (includes `companyId` for multi-tenancy, status: Active/Inactive/On Leave/Completed)
- `ShiftContext` — Employee shift scheduling (CRUD, used by Visual Scheduler)
- `StockContext` — Inventory items
- `ProjectContext` — Construction projects

Each context hydrates from localStorage on mount and writes back on changes. Entities are filtered by `companyId` from the active session. TanStack React Query is installed but not yet actively used (future API integration point).

Provider nesting order in `App.tsx`: `AuthProvider > CORProvider > EmployeeProvider > ShiftProvider > StockProvider > ProjectProvider`

### Routing & Auth

React Router v6 with `ProtectedRoute` and `OwnerOnlyRoute` wrappers. Auth is localStorage-based (`cortrack_auth` key) with hardcoded multi-company users in `AuthContext`. Roles: Owner (full access + user management), Admin (CRUD), Viewer (read-only). The `/users` page is Owner-only. All authenticated pages render inside `AppLayout` which provides the sidebar.

### Component Organization

- `src/pages/` — Route-level page components (COR, Employees, Stock, Projects, Dashboard, Login, Users)
- `src/components/cor/` — COR-specific components (CORDrawer for creation, CORDetailPanel for viewing/editing)
- `src/components/scheduler/` — Visual Scheduler components (see below)
- `src/components/ui/` — 60+ shadcn/ui components (do not manually edit — use `npx shadcn-ui@latest add <component>`)
- `src/components/` — App-level shared components (AppLayout, AppSidebar, ProtectedRoute, SharedUI, PageHeader, SummaryCard)
- `src/contexts/` — Context providers with CRUD logic and localStorage sync (Auth, COR, Employee, Shift, Stock, Project)
- `src/hooks/` — Custom hooks (mobile detection, toast)
- `src/lib/utils.ts` — Tailwind class merging utility (`cn()`)

### Visual Scheduler (`src/components/scheduler/`)

A Google Calendar-style week view on the Employee Planner page with drag-and-drop employee assignment. Key components:

- `SchedulerSection.tsx` — Orchestrator: manages week navigation, dialog state, drop/click/resize handlers, two-way sync
- `WeekCalendar.tsx` — CSS Grid calendar (24h rows × 7 day columns), sticky header, drop targets, overlap layout
- `EmployeeSidebar.tsx` — Draggable employee list with search/filter, delete buttons, "Add Employee" action
- `ShiftBlock.tsx` — Colored shift block with bottom-edge resize handle; exports color hashing utils
- `ShiftEditDialog.tsx` — Create/edit shift dialog (dailyRate required)
- `AddEmployeeDialog.tsx` — Simplified employee creation (optional fields → Inactive status)
- `syncUtils.ts` — Two-way sync helpers: `syncEmployeeFromShifts()` (calendar→employee) and `generateShiftsFromEmployee()` (employee→calendar). Sync is explicit (not reactive) to avoid circular loops.

### Styling

Tailwind with CSS variable theming (HSL values defined in `src/index.css`). Custom utility classes for status badges, cards, and tables are in `index.css`. Dark mode supported via class strategy.

## Conventions

- Forms use React Hook Form + Zod validation
- Toast notifications via Sonner
- Lists have search/filter and pagination (10 items/page)
- TypeScript config is lenient (no `strictNullChecks`, no `noImplicitAny`)
- ESLint ignores unused variables
- All domain entities include `companyId` for multi-company filtering
- Currency formatting: use `formatEUR()` from SharedUI (not the deprecated `formatAUD`)
- Employee statuses: Active, Inactive, On Leave, Completed
- Drag-and-drop: HTML5 DnD API (sidebar→calendar), mouse events (shift resize) — no external DnD library
- Calendar: pure CSS Grid + Tailwind — no external calendar library

## Git Workflow

- **Branches**: Feature branches → `Dev` → `Main`
- **PR flow**: Feature/[name] merges into Dev via PR, then Dev merges into Main via PR
