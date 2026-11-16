# Requirements Document

## Introduction

This document specifies the requirements for Phase 1 of the GSDTS frontend: the React + Vite + TypeScript project foundation. The System in this context is the GSDTS Frontend Application, a government enterprise portal that will integrate with the existing Spring Boot backend at `/api/v1`.

Phase 1 covers only the structural foundation: project scaffolding, design system, routing skeleton, and application shell layout. No backend calls are made in this phase. Authentication (Phase 2) and all business modules (Phases 3–5) are out of scope.

## Glossary

- **GSDTS Frontend Application**: The React SPA served from the `frontend/` directory.
- **Application Shell**: The persistent layout frame containing the Sidebar, Header, Breadcrumbs, and PageContainer.
- **Sidebar**: The collapsible fixed left navigation panel showing role-based menu items.
- **Header**: The fixed top bar showing breadcrumbs and a user placeholder.
- **Breadcrumbs**: The hierarchical path display inside the Header derived from the current route.
- **PageContainer**: The content wrapper that applies consistent max-width, padding, and background to every page.
- **Design Token**: A named CSS custom property that encodes a design decision (colour, spacing, typography).
- **Government Colour Palette**: The specific colours defined in the frontend-spec §4: primary navy `#12304A`, government blue `#1769AA`, secondary blue `#245B83`, teal accent `#0D9488`, page background `#F4F7FA`, card background `#FFFFFF`, border `#DCE3EA`, text primary `#1E293B`, text secondary `#64748B`.
- **Placeholder Page**: A minimal page component that renders a title and description to prove routing works without containing real business logic.
- **Feature Module**: A directory under `src/features/{name}/` that owns that feature's pages, components, hooks, services, schemas, and types.

---

## Requirements

### Requirement 1: Project Scaffolding

**User Story:** As a developer, I want a Vite + React + TypeScript project in the `frontend/` directory, so that I have a working build system I can run immediately.

#### Acceptance Criteria

1. WHEN a developer runs `npm install` inside `frontend/`, THE GSDTS Frontend Application SHALL complete dependency installation without errors using the exact package versions specified in Requirement 1.3.
2. WHEN a developer runs `npm run build` inside `frontend/`, THE GSDTS Frontend Application SHALL produce a production build artefact in `frontend/dist/` without TypeScript compile errors.
3. WHEN a developer runs `npm run dev` inside `frontend/`, THE GSDTS Frontend Application SHALL start a local dev server on port 5173 (Vite default) without errors.
4. THE GSDTS Frontend Application SHALL use TypeScript in strict mode (`"strict": true` in `tsconfig.json`), with `noUnusedLocals` and `noUnusedParameters` enabled.
5. THE GSDTS Frontend Application SHALL use the following exact technology stack: React 19, TypeScript 5.8, Vite 6, Tailwind CSS 4, shadcn/ui (latest stable), React Router 7, Axios 1.9, TanStack Query 5, React Hook Form 7, Zod 3, Recharts 2, Lucide React 0.511, date-fns 4.
6. THE GSDTS Frontend Application SHALL include a `.env.example` file at `frontend/.env.example` containing only `VITE_API_BASE_URL=http://localhost:8080/api/v1` and no secrets.

### Requirement 2: Design System and Tailwind Configuration

**User Story:** As a developer, I want the government colour palette and typography applied globally, so that every component inherits the correct visual identity without per-component overrides.

#### Acceptance Criteria

1. THE GSDTS Frontend Application SHALL define all Government Colour Palette values as CSS custom properties on `:root` in `frontend/src/index.css`.
2. THE GSDTS Frontend Application SHALL configure Tailwind CSS v4 to expose the Government Colour Palette as named utility classes (e.g. `bg-primary-navy`, `text-gov-blue`).
3. THE GSDTS Frontend Application SHALL apply the Inter font family as the default sans-serif typeface via a `@import` in `index.css` and a Tailwind `fontFamily` override.
4. WHEN any component uses a Tailwind background class for the page background colour, THE GSDTS Frontend Application SHALL render `#F4F7FA`.
5. WHEN any component uses a Tailwind background class for the card background colour, THE GSDTS Frontend Application SHALL render `#FFFFFF`.
6. THE GSDTS Frontend Application SHALL configure shadcn/ui with the `slate` base colour and `neutral` accent colour to align with the government palette.

### Requirement 3: Application Shell Layout

**User Story:** As a developer, I want a reusable AppShell component that composes the Sidebar, Header, and PageContainer, so that every protected page has a consistent government portal frame.

#### Acceptance Criteria

1. THE GSDTS Frontend Application SHALL provide an `AppShell` component at `src/components/layout/AppShell.tsx` that renders a fixed Sidebar on the left and a right-side area containing the Header above and the PageContainer below.
2. WHEN a user clicks the collapse toggle on the Sidebar, THE GSDTS Frontend Application SHALL animate the Sidebar between an expanded state (240 px wide, showing icon and label) and a collapsed state (64 px wide, showing icon only), and SHALL persist the collapsed/expanded preference in `localStorage` under the key `gsdts_sidebar_collapsed`.
3. WHEN the Sidebar is in collapsed state, THE GSDTS Frontend Application SHALL show tooltips on hover for every navigation item so the icon-only view remains usable.
4. THE GSDTS Frontend Application SHALL render the Header at a fixed height of 64 px at the top of the content area, containing the Breadcrumbs on the left and a user placeholder (avatar icon and "User" text) on the right.
5. THE GSDTS Frontend Application SHALL render the PageContainer with a maximum content width of 1280 px, horizontal padding of 24 px, and vertical padding of 24 px.
6. WHEN the viewport width is below 768 px, THE GSDTS Frontend Application SHALL hide the Sidebar and render a hamburger button in the Header that opens the Sidebar as a full-height overlay drawer.

### Requirement 4: Sidebar Navigation

**User Story:** As a developer, I want a Sidebar that lists all application navigation sections with icons, so that the navigation structure is visible even before authentication is wired.

#### Acceptance Criteria

1. THE GSDTS Frontend Application SHALL render the following top-level navigation groups in the Sidebar, in this order: Dashboard, Schemes, Beneficiaries, Applications, Verification, Disbursement, Compliance, Analytics, Administration (Users, Regions, Settings, Audit Logs).
2. WHEN a navigation item matches the current route, THE GSDTS Frontend Application SHALL apply a visual active state using the government blue colour `#1769AA` as the background and white text.
3. WHEN a navigation item is in a group that has not been fully implemented (Verification, Disbursement, Compliance, Analytics), THE GSDTS Frontend Application SHALL display a "Coming Soon" badge next to that item.
4. THE GSDTS Frontend Application SHALL display the GSDTS logo or wordmark at the top of the Sidebar above the navigation items.
5. WHEN the Sidebar is expanded, THE GSDTS Frontend Application SHALL show both the icon and the label for every navigation item with consistent icon sizing (20 px) using Lucide React icons.

### Requirement 5: Breadcrumbs

**User Story:** As a developer, I want Breadcrumbs that automatically reflect the current route, so that users always know where they are in the application hierarchy.

#### Acceptance Criteria

1. WHEN the current route is `/dashboard`, THE GSDTS Frontend Application SHALL render "Home / Dashboard" as the breadcrumb path.
2. WHEN the current route contains nested segments (e.g. `/admin/users/123`), THE GSDTS Frontend Application SHALL render each path segment as a separate breadcrumb item, with all items except the last being clickable links.
3. THE GSDTS Frontend Application SHALL derive breadcrumb labels from a static route-label map rather than raw URL segments, so that URL slugs like `/admin` are displayed as "Administration".
4. WHEN the breadcrumb path contains more than four segments, THE GSDTS Frontend Application SHALL truncate the middle segments with an ellipsis `…` while always showing the first and last segments.

### Requirement 6: React Router Routing Structure

**User Story:** As a developer, I want a routing tree with public, protected, and placeholder routes, so that the full navigation structure is verifiable before backend integration.

#### Acceptance Criteria

1. THE GSDTS Frontend Application SHALL define all routes in `src/app/router.tsx` using React Router 7 and SHALL lazy-load every page-level component with `React.lazy`.
2. THE GSDTS Frontend Application SHALL define the following public routes (no auth required): `/login` and `/register`.
3. THE GSDTS Frontend Application SHALL define the following protected routes wrapped in an `AppShell`: `/dashboard`, `/profile`, `/schemes`, `/schemes/:id`, `/beneficiary/profile`, `/admin/beneficiaries`, `/admin/beneficiaries/:id`, `/applications`, `/applications/:id`, `/applications/new`, `/admin/users`, `/admin/users/new`, `/admin/users/:id`, `/admin/regions`, `/admin/settings`, `/admin/audit`, `/verification`, `/disbursement`, `/compliance`, `/analytics`.
4. WHEN a user navigates to `/`, THE GSDTS Frontend Application SHALL redirect to `/dashboard`.
5. WHEN a user navigates to any undefined route, THE GSDTS Frontend Application SHALL render a 404 page with a "Page Not Found" message and a link back to `/dashboard`.
6. THE GSDTS Frontend Application SHALL render all protected routes within the `AppShell` component so that the Sidebar and Header are always present on protected pages.

### Requirement 7: Placeholder Pages

**User Story:** As a developer, I want every route to render a real page component (even if minimal), so that routing is fully verifiable and the shell layout is exercised on every route.

#### Acceptance Criteria

1. THE GSDTS Frontend Application SHALL provide a `PlaceholderPage` component at `src/features/placeholders/PlaceholderPage.tsx` that accepts `title` and `description` props and renders them inside a card using the design system.
2. WHEN a route points to a not-yet-implemented feature (Verification, Disbursement, Compliance, Analytics), THE GSDTS Frontend Application SHALL render `PlaceholderPage` with a title matching the feature name and a description of "This feature is coming soon."
3. THE GSDTS Frontend Application SHALL provide a `DashboardPage` at `src/features/dashboard/pages/DashboardPage.tsx` that renders a welcome card with the GSDTS name, the current route, and a summary of the navigation structure — using only static content and no API calls.
4. THE GSDTS Frontend Application SHALL provide `LoginPage` and `RegisterPage` stubs at `src/features/auth/pages/` that render a card with the page title and "Authentication coming in Phase 2." text.

### Requirement 8: API Client Foundation

**User Story:** As a developer, I want a centralised Axios instance and TypeScript types for the API response envelopes, so that all future API calls follow a consistent pattern from day one.

#### Acceptance Criteria

1. THE GSDTS Frontend Application SHALL provide an Axios instance at `src/services/api-client.ts` with `baseURL` set from `import.meta.env.VITE_API_BASE_URL`.
2. THE GSDTS Frontend Application SHALL define `ApiResponse<T>` and `PagedResponse<T>` TypeScript interfaces at `src/types/api.types.ts` matching the exact JSON shapes returned by the Spring Boot backend (as documented in `docs/frontend-analysis.md` §1.6).
3. THE GSDTS Frontend Application SHALL configure the Axios instance with a request interceptor that reads `gsdts_access_token` from `localStorage` and sets the `Authorization: Bearer <token>` header when the token is present.
4. THE GSDTS Frontend Application SHALL configure the Axios instance with a response interceptor that maps backend `ApiResponse<T>` responses to their `.data` field, so that callers receive `T` directly.
5. THE GSDTS Frontend Application SHALL define a `src/lib/utils.ts` utility file containing at minimum: a `cn` function (combining `clsx` and `tailwind-merge`), a `formatDate(date: string | Date, format?: string): string` function using date-fns, and a `formatCurrency(amount: number): string` function formatting as Indian Rupees (INR).

### Requirement 9: TanStack Query Provider

**User Story:** As a developer, I want TanStack Query configured at the application root, so that all data-fetching hooks work without per-page setup.

#### Acceptance Criteria

1. THE GSDTS Frontend Application SHALL wrap the entire application in a `QueryClientProvider` with a `QueryClient` configured with `staleTime: 30_000` for reference data and `retry: 1` for failed queries.
2. THE GSDTS Frontend Application SHALL provide a Toaster component (from shadcn/ui) at the application root so that toast notifications are available on every page.
3. THE GSDTS Frontend Application SHALL define all provider composition in `src/app/providers.tsx` and import that into `src/app/App.tsx`, keeping the root component clean.

### Requirement 10: Build Quality Gates

**User Story:** As a developer, I want automated checks that catch regressions on every build, so that the main branch always contains a working application.

#### Acceptance Criteria

1. WHEN `npm run build` is executed, THE GSDTS Frontend Application SHALL complete without TypeScript errors, without unused import warnings from Vite, and without ESLint errors.
2. THE GSDTS Frontend Application SHALL include ESLint configured with `@typescript-eslint/recommended` and `plugin:react-hooks/recommended` rules.
3. WHEN `npm run lint` is executed, THE GSDTS Frontend Application SHALL report zero errors.
4. THE GSDTS Frontend Application SHALL include a Vitest configuration so that `npm run test -- --run` executes without crashing, even if no test files exist yet.
