# GSDTS Frontend

Government Subsidy & Disbursement Tracking System — React frontend.

## Quick start

```bash
cd frontend
npm install
cp .env.example .env   # adjust VITE_API_BASE_URL if needed
npm run dev            # Vite dev server on http://localhost:5173
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check + production build to `dist/` |
| `npm run test` | Run Vitest test suite |

## Tech stack

React, TypeScript, Vite, Tailwind CSS v4, shadcn/ui (Radix), React Router,
Axios, TanStack Query, React Hook Form, Zod, Recharts, Lucide, date-fns.

## Real API vs demo data

### Real backend endpoints (Phases 2–3)

| Feature | Endpoint | Service file |
|---------|----------|-------------|
| Authentication | `POST /auth/login`, `POST /auth/register`, `GET /auth/me` | `auth.service.ts` |
| Users | `/users` CRUD + role/region assignment | `user.service.ts` |
| Roles | `GET /roles` | `role.service.ts` |
| Regions | `/regions` CRUD | `region.service.ts` |
| Settings | `GET/PUT /settings` | `setting.service.ts` |
| Audit logs | `GET /audit` | `audit.service.ts` |

### Demo data (Phases 4–5)

The backend has no REST controllers for schemes, beneficiaries, applications,
eligibility, or verification. These modules use isolated demo-data services
with a visible "Demo data" badge on every page.

| Module | Demo data source | Badge |
|--------|-----------------|-------|
| Dashboard | `demo-data.service.ts` | `<DemoBadge />` |
| Schemes | `demo-data.service.ts` → `scheme.service.ts` | `<DemoBadge />` |
| Beneficiaries | `demo-data.service.ts` → `beneficiary.service.ts` | `<DemoBadge />` |
| Applications | `demo-data.service.ts` → `application.service.ts` | `<DemoBadge />` |
| Eligibility | `workflow-demo-data.service.ts` → `eligibility.service.ts` | `<DemoBadge />` |
| Verification | `workflow-demo-data.service.ts` → `verification.service.ts` | `<DemoBadge />` |

### Coming soon (not implemented)

Disbursement, Compliance, Analytics — placeholder pages with "Coming Soon" badge
in the sidebar.

## Project structure

```
src/
├── app/          # Router, providers
├── components/   # Shared UI (layout, states, shadcn/ui)
├── contexts/     # AuthContext
├── features/     # Feature modules (auth, dashboard, schemes, etc.)
├── services/     # API client, demo data, feature services
├── types/        # Shared types (auth, API response envelopes)
├── lib/          # Utilities (cn, formatCurrency, etc.)
└── utils/        # mask.ts
```

## Environment

Only one public variable is exposed to the frontend:

```env
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

No database credentials, JWT secrets, or Supabase keys are placed in frontend
environment variables.

## Token storage

The backend returns the JWT in the response body (`TokenResponse.accessToken`).
No `Set-Cookie` header is issued. The frontend stores the token in `localStorage`,
which means it is accessible to JavaScript and subject to XSS. This is a known
limitation of the current backend design.

## Responsive layout

- Sidebar is fixed on desktop (>= 768px) and hidden on mobile.
- Tables use `overflow-x-auto` for horizontal scroll on narrow screens.
- Known limitation: no mobile hamburger menu — mobile users see the current page
  and user menu but no navigation sidebar.

## Testing

Tests use Vitest + React Testing Library. Each feature page has a `__tests__`
directory with tests covering loading, empty, error, permission-denied, and
data states. All tests mock demo-data services via `vi.mock`.

```bash
npm run test        # run all tests
npm run test -- --run  # CI mode (no watch)
```
