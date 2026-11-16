# Design Document: GSDTS Frontend Foundation (Phase 1)

## Overview

This document describes the architecture, component design, file structure, and correctness properties for Phase 1 of the GSDTS frontend: a React + Vite + TypeScript project foundation with a government enterprise design system, application shell, and routing skeleton.

The goal is a deployable, visually correct application frame that every subsequent phase can build on without structural changes.

---

## Architecture

```
frontend/
├── index.html                        # Vite entry point; loads main.tsx
├── vite.config.ts                    # Vite + React plugin + path aliases
├── tsconfig.json                     # TypeScript strict config
├── .eslintrc.cjs                     # ESLint + @typescript-eslint + react-hooks
├── tailwind.config.ts                # Tailwind v4 with government design tokens
├── .env.example                      # VITE_API_BASE_URL only
│
└── src/
    ├── main.tsx                      # ReactDOM.createRoot; mounts App
    ├── index.css                     # :root CSS custom properties; @import Inter; Tailwind directives
    │
    ├── app/
    │   ├── App.tsx                   # <Providers><RouterProvider router={router} /></Providers>
    │   ├── router.tsx                # createBrowserRouter; lazy page imports; route groups
    │   └── providers.tsx             # <QueryClientProvider><Toaster /></QueryClientProvider>
    │
    ├── components/
    │   ├── layout/
    │   │   ├── AppShell.tsx          # Sidebar + right column (Header + PageContainer)
    │   │   ├── Sidebar.tsx           # Collapsible nav; localStorage persistence
    │   │   ├── Header.tsx            # 64 px top bar; Breadcrumbs + user placeholder
    │   │   ├── Breadcrumbs.tsx       # Route-driven breadcrumbs using ROUTE_LABEL_MAP
    │   │   └── PageContainer.tsx     # max-w-[1280px] px-6 py-6 wrapper
    │   └── ui/                       # shadcn/ui auto-generated components
    │
    ├── features/
    │   ├── auth/pages/
    │   │   ├── LoginPage.tsx
    │   │   └── RegisterPage.tsx
    │   ├── dashboard/pages/
    │   │   └── DashboardPage.tsx
    │   └── placeholders/
    │       └── PlaceholderPage.tsx
    │
    ├── services/
    │   └── api-client.ts             # Axios instance; request/response interceptors
    │
    ├── types/
    │   └── api.types.ts              # ApiResponse<T>, PagedResponse<T>
    │
    └── lib/
        └── utils.ts                  # cn(), formatDate(), formatCurrency()
```

### Technology stack

| Concern | Library | Version |
|---------|---------|---------|
| Build | Vite | 6 |
| UI framework | React | 19 |
| Language | TypeScript | 5.8 |
| Styling | Tailwind CSS | 4 |
| Component primitives | shadcn/ui | latest stable |
| Routing | React Router | 7 |
| HTTP | Axios | 1.9 |
| Server state | TanStack Query | 5 |
| Forms | React Hook Form | 7 |
| Validation | Zod | 3 |
| Charts | Recharts | 2 |
| Icons | Lucide React | 0.511 |
| Date utilities | date-fns | 4 |

---

## Design System

### CSS Custom Properties (`src/index.css`)

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --color-primary-navy:   #12304A;
  --color-gov-blue:       #1769AA;
  --color-secondary-blue: #245B83;
  --color-teal-accent:    #0D9488;
  --color-page-bg:        #F4F7FA;
  --color-card-bg:        #FFFFFF;
  --color-border:         #DCE3EA;
  --color-text-primary:   #1E293B;
  --color-text-secondary: #64748B;

  /* Status colours */
  --color-status-green:  #16A34A;
  --color-status-amber:  #D97706;
  --color-status-red:    #DC2626;
  --color-status-blue:   #2563EB;
  --color-status-grey:   #6B7280;
  --color-status-orange: #EA580C;
}
```

### Tailwind Configuration (`tailwind.config.ts`)

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        'primary-navy':   'var(--color-primary-navy)',
        'gov-blue':       'var(--color-gov-blue)',
        'secondary-blue': 'var(--color-secondary-blue)',
        'teal-accent':    'var(--color-teal-accent)',
        'page-bg':        'var(--color-page-bg)',
        'card-bg':        'var(--color-card-bg)',
        'gov-border':     'var(--color-border)',
        'text-primary':   'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
      },
    },
  },
  plugins: [],
}

export default config
```

---

## Components and Interfaces

The following components and interfaces form the public surface of this phase. Later phases consume them directly.

| Export | File | Contract |
|--------|------|----------|
| `AppShell` | `src/components/layout/AppShell.tsx` | Renders Sidebar + Header + PageContainer frame; wraps `<Outlet />` |
| `Sidebar` | `src/components/layout/Sidebar.tsx` | Collapsible nav; reads/writes `gsdts_sidebar_collapsed` localStorage key |
| `Header` | `src/components/layout/Header.tsx` | 64 px top bar; Breadcrumbs slot + user placeholder |
| `Breadcrumbs` | `src/components/layout/Breadcrumbs.tsx` | Route-driven label display using `ROUTE_LABEL_MAP` |
| `PageContainer` | `src/components/layout/PageContainer.tsx` | Max-width + padding wrapper |
| `PlaceholderPage` | `src/features/placeholders/PlaceholderPage.tsx` | Accepts `{ title, description }` props; renders in design system card |
| `apiClient` | `src/services/api-client.ts` | Axios instance with Bearer token interceptor and response unwrapper |
| `ApiResponse<T>` | `src/types/api.types.ts` | TypeScript type matching backend envelope |
| `PagedResponse<T>` | `src/types/api.types.ts` | TypeScript type matching backend paged envelope |
| `cn`, `formatDate`, `formatCurrency` | `src/lib/utils.ts` | Pure utility functions |
| `Providers` | `src/app/providers.tsx` | Composable root providers (QueryClient + Toaster) |

---

## Data Models

Phase 1 introduces no server-persisted data models. The only client-side state is:

| Key | Storage | Type | Description |
|-----|---------|------|-------------|
| `gsdts_sidebar_collapsed` | `localStorage` | `"true"` \| `"false"` | Sidebar collapsed preference |
| `gsdts_access_token` | `localStorage` | JWT string | Bearer token (populated in Phase 2) |

TypeScript types for the backend API contracts are defined in `src/types/api.types.ts` (see section below). These are pure TypeScript interfaces — no runtime schema validation is applied in Phase 1.

---

## Error Handling

Phase 1 introduces the Axios response interceptor as the single error normalization point for all future API calls.

| Error scenario | Interceptor behaviour |
|----------------|-----------------------|
| Network error (no response) | Re-rejects with original `AxiosError`; caller handles |
| HTTP 401 | Re-rejects; Phase 2 adds the redirect-to-login side effect in this same interceptor |
| HTTP 4xx/5xx with `ApiResponse` body | Re-rejects with an enriched error carrying `errorCode` and `fieldErrors` |
| Successful response with `ApiResponse<T>` envelope | Unwraps to `T` before resolving |

The `GlobalExceptionHandler` pattern is on the backend; the frontend counterpart is the response interceptor plus future per-feature `QueryClient` error boundaries added in Phase 3.

---

## Testing Strategy

**Unit tests** (Vitest + React Testing Library):
- Property tests for `cn()`, `Sidebar` toggle, nav item ordering, active route highlighting, `Breadcrumbs` label mapping, `PlaceholderPage` prop rendering, and the Axios interceptors.
- Example tests for `AppShell` rendering, `Header` structure, `PageContainer` layout, `LoginPage`/`RegisterPage` stubs, and routing (redirect from `/`, 404 page).

**Smoke checks** (run via `npm run build` and `npm run lint`):
- TypeScript strict-mode compilation without errors.
- Zero ESLint errors with `@typescript-eslint/recommended` and `plugin:react-hooks/recommended`.

No integration tests are needed in Phase 1 because no backend calls are made.

---

## Components

### AppShell (`src/components/layout/AppShell.tsx`)

```typescript
// Layout contract:
// [Sidebar | flex-col: Header + main > PageContainer > <Outlet />]

export function AppShell() {
  return (
    <div className="flex h-screen bg-page-bg overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <PageContainer>
            <Outlet />
          </PageContainer>
        </main>
      </div>
    </div>
  )
}
```

### Sidebar (`src/components/layout/Sidebar.tsx`)

State:
- `collapsed: boolean` — read from `localStorage.getItem('gsdts_sidebar_collapsed') === 'true'` on mount; persisted on toggle.
- `mobileOpen: boolean` — controls the mobile overlay drawer (independent of `collapsed`).

Widths: expanded = `w-60` (240 px); collapsed = `w-16` (64 px). Transition: `transition-[width] duration-200 ease-in-out`.

Navigation structure (order is an invariant, Requirement 4.1):

```typescript
const NAV_ITEMS = [
  { label: 'Dashboard',       href: '/dashboard',           icon: LayoutDashboard },
  { label: 'Schemes',         href: '/schemes',             icon: FileText },
  { label: 'Beneficiaries',   href: '/admin/beneficiaries', icon: Users },
  { label: 'Applications',    href: '/applications',        icon: ClipboardList },
  { label: 'Verification',    href: '/verification',        icon: CheckSquare,  comingSoon: true },
  { label: 'Disbursement',    href: '/disbursement',        icon: Banknote,     comingSoon: true },
  { label: 'Compliance',      href: '/compliance',          icon: ShieldCheck,  comingSoon: true },
  { label: 'Analytics',       href: '/analytics',           icon: BarChart2,    comingSoon: true },
]

const ADMIN_ITEMS = [
  { label: 'Users',           href: '/admin/users',    icon: UserCog },
  { label: 'Regions',         href: '/admin/regions',  icon: Map },
  { label: 'Settings',        href: '/admin/settings', icon: Settings },
  { label: 'Audit Logs',      href: '/admin/audit',    icon: FileSearch },
]
```

Active state: use `useLocation()` from React Router; item is active when `location.pathname === href || location.pathname.startsWith(href + '/')`.

Tooltip: wrap each nav item in `<TooltipProvider><Tooltip><TooltipTrigger>…</TooltipTrigger><TooltipContent side="right">{label}</TooltipContent></Tooltip></TooltipProvider>` from shadcn/ui; show only when `collapsed === true`.

### Header (`src/components/layout/Header.tsx`)

```typescript
// 64 px fixed top bar; flex between Breadcrumbs and user placeholder
<header className="h-16 bg-card-bg border-b border-gov-border flex items-center px-6 flex-shrink-0">
  <Breadcrumbs />
  <div className="ml-auto flex items-center gap-2">
    <span className="text-sm text-text-secondary">User</span>
    <div className="w-8 h-8 rounded-full bg-gov-blue flex items-center justify-center">
      <User className="w-4 h-4 text-white" />
    </div>
  </div>
</header>
```

### Breadcrumbs (`src/components/layout/Breadcrumbs.tsx`)

```typescript
// ROUTE_LABEL_MAP maps path segment → display label (Requirement 5.3)
const ROUTE_LABEL_MAP: Record<string, string> = {
  'dashboard':      'Dashboard',
  'admin':          'Administration',
  'users':          'Users',
  'new':            'New',
  'regions':        'Regions',
  'settings':       'Settings',
  'audit':          'Audit Logs',
  'schemes':        'Schemes',
  'beneficiaries':  'Beneficiaries',
  'applications':   'Applications',
  'verification':   'Verification',
  'disbursement':   'Disbursement',
  'compliance':     'Compliance',
  'analytics':      'Analytics',
  'profile':        'Profile',
  'beneficiary':    'Beneficiary',
}

// Segments algorithm:
// 1. Split pathname on '/' → filter empty strings → map to { label, href }
// 2. If segments.length > 4: show first, '…', last two (Requirement 5.4)
// 3. All segments except last are <Link>; last is plain text
```

### PageContainer (`src/components/layout/PageContainer.tsx`)

```typescript
export function PageContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-[1280px] mx-auto px-6 py-6 w-full">
      {children}
    </div>
  )
}
```

---

## Routing (`src/app/router.tsx`)

```typescript
const router = createBrowserRouter([
  // Public
  { path: '/login',    element: <Suspense fallback={<Loading />}><LoginPage /></Suspense> },
  { path: '/register', element: <Suspense fallback={<Loading />}><RegisterPage /></Suspense> },

  // Protected — all inside AppShell
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true,                 element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard',           element: lazy(() => import('../features/dashboard/pages/DashboardPage')) },
      { path: 'schemes',             element: lazy('schemes/SchemeListPage') },
      { path: 'schemes/:id',         element: lazy('schemes/SchemeDetailPage') },
      { path: 'applications',        element: lazy('applications/ApplicationListPage') },
      { path: 'applications/new',    element: lazy('applications/SubmitApplicationPage') },
      { path: 'applications/:id',    element: lazy('applications/ApplicationDetailPage') },
      { path: 'beneficiary/profile', element: lazy('beneficiaries/BeneficiaryProfilePage') },
      { path: 'admin/beneficiaries', element: lazy('beneficiaries/BeneficiaryListPage') },
      { path: 'admin/beneficiaries/:id', element: lazy('beneficiaries/BeneficiaryDetailPage') },
      { path: 'admin/users',         element: lazy('users/UserListPage') },
      { path: 'admin/users/new',     element: lazy('users/CreateUserPage') },
      { path: 'admin/users/:id',     element: lazy('users/UserDetailPage') },
      { path: 'admin/regions',       element: lazy('regions/RegionListPage') },
      { path: 'admin/settings',      element: lazy('settings/SettingsPage') },
      { path: 'admin/audit',         element: lazy('audit/AuditLogPage') },
      { path: 'verification',        element: <PlaceholderPage title="Verification" description="This feature is coming soon." /> },
      { path: 'disbursement',        element: <PlaceholderPage title="Disbursement" description="This feature is coming soon." /> },
      { path: 'compliance',          element: <PlaceholderPage title="Compliance" description="This feature is coming soon." /> },
      { path: 'analytics',           element: <PlaceholderPage title="Analytics" description="This feature is coming soon." /> },
      { path: '*',                   element: <NotFoundPage /> },
    ],
  },
])
```

All page-level components that do not yet exist are created as thin wrappers around `PlaceholderPage` in Phase 1.

---

## API Client (`src/services/api-client.ts`)

```typescript
import axios, { AxiosInstance } from 'axios'
import type { ApiResponse } from '../types/api.types'

const TOKEN_KEY = 'gsdts_access_token'

export const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor: attach Bearer token (Requirement 8.3)
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor: unwrap ApiResponse<T>.data (Requirement 8.4)
apiClient.interceptors.response.use(
  (response) => {
    const body = response.data as ApiResponse<unknown>
    if (body && typeof body === 'object' && 'data' in body) {
      return { ...response, data: body.data }
    }
    return response
  },
  (error) => Promise.reject(error)
)
```

---

## TypeScript Types (`src/types/api.types.ts`)

```typescript
// Matches the actual Spring Boot ApiResponse<T> envelope exactly
// (documented in docs/frontend-analysis.md §1.6)
export interface ApiResponse<T> {
  success: boolean
  message: string | null
  errorCode: string | null
  data: T | null
  fieldErrors: Array<{ field: string; message: string }> | null
  timestamp: string
  correlationId: string | null
}

// Matches the actual Spring Boot PagedResponse<T> envelope exactly
export interface PagedResponse<T> {
  content: T[]
  currentPage: number
  pageSize: number
  totalElements: number
  totalPages: number
  last: boolean
}
```

---

## Utilities (`src/lib/utils.ts`)

```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'

// Merges Tailwind classes; deduplicates conflicting utilities
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

// Formats ISO date strings or Date objects using date-fns
export function formatDate(date: string | Date, fmt = 'dd MMM yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, fmt)
}

// Formats a number as Indian Rupees
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount)
}
```

---

## Placeholder Components

### PlaceholderPage (`src/features/placeholders/PlaceholderPage.tsx`)

```typescript
interface PlaceholderPageProps {
  title: string
  description: string
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">{title}</h1>
        <p className="text-text-secondary mt-1">{description}</p>
      </div>
      <div className="bg-card-bg border border-gov-border rounded-lg p-8 text-center">
        <p className="text-text-secondary">{description}</p>
      </div>
    </div>
  )
}
```

### DashboardPage (`src/features/dashboard/pages/DashboardPage.tsx`)

Renders a welcome card with the GSDTS heading, current route (from `useLocation`), and a summary grid of all navigation sections — all static, no API calls.

---

## Providers (`src/app/providers.tsx`)

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  )
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — a formal statement about what the system should do.*

### Property 1: Sidebar toggle inverts collapsed state

*For any* initial sidebar state (collapsed or expanded), clicking the collapse toggle SHALL produce the opposite state, and the new state SHALL be persisted to `localStorage` under the key `gsdts_sidebar_collapsed`.

**Validates: Requirements 3.2**

### Property 2: Navigation order is an invariant

*For any* render of the Sidebar, the navigation items SHALL appear in the order: Dashboard, Schemes, Beneficiaries, Applications, Verification, Disbursement, Compliance, Analytics, then the Administration group (Users, Regions, Settings, Audit Logs). No render SHALL produce a different order.

**Validates: Requirements 4.1**

### Property 3: Active route highlights exactly one nav item

*For any* route the user navigates to that matches a sidebar navigation item, exactly that item SHALL have the active styling (government blue background, white text), and all other items SHALL have inactive styling.

**Validates: Requirements 4.2**

### Property 4: Breadcrumb labels use the route-label map

*For any* route segment that appears in `ROUTE_LABEL_MAP`, the Breadcrumbs component SHALL display the mapped human-readable label rather than the raw URL segment.

**Validates: Requirements 5.2, 5.3**

### Property 5: PlaceholderPage renders any title and description

*For any* non-empty `title` string and `description` string passed as props, the PlaceholderPage component SHALL render both values in the DOM without throwing.

**Validates: Requirements 7.1**

### Property 6: API request interceptor attaches Bearer token

*For any* Axios request made when `localStorage` contains a value under `gsdts_access_token`, the outgoing request SHALL have an `Authorization` header with the value `Bearer <token>`.

**Validates: Requirements 8.3**

### Property 7: Response interceptor unwraps ApiResponse data

*For any* HTTP response whose body matches the `ApiResponse<T>` envelope shape (has `success: true` and a `data` field), the Axios response interceptor SHALL return `T` as the resolved value rather than the full envelope.

**Validates: Requirements 8.4**

### Property 8: cn() merges conflicting Tailwind classes consistently

*For any* array of Tailwind class strings where two or more classes conflict (e.g. `bg-red-500` and `bg-blue-500`), `cn()` SHALL return a string that contains the last conflicting class and omits all earlier conflicting classes, following `tailwind-merge` semantics.

**Validates: Requirements 8.5**
