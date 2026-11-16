# Implementation Plan: GSDTS Frontend Foundation (Phase 1)

## Overview

Implements the React + Vite + TypeScript project foundation in `frontend/`. Each task is a discrete, verifiable coding step. Tasks build in dependency order: scaffolding → design system → types and utilities → layout shell → routing → placeholder pages → quality gates.

## Tasks

- [x] 1. Scaffold Vite + React + TypeScript project
  - Run `npm create vite@6 frontend -- --template react-ts` from the workspace root
  - In `frontend/package.json`, set exact versions per Requirement 1.5: react@19, react-dom@19, typescript@5.8, vite@6, react-router-dom@7, axios@1.9, @tanstack/react-query@5, react-hook-form@7, zod@3, recharts@2, lucide-react@0.511, date-fns@4
  - Add dev dependencies: @types/react@19, @types/react-dom@19, @typescript-eslint/eslint-plugin, @typescript-eslint/parser, eslint-plugin-react-hooks, vitest@3, @vitest/coverage-v8, @testing-library/react, @testing-library/jest-dom, @testing-library/user-event, jsdom
  - Add Tailwind CSS v4: `tailwindcss@4`, `@tailwindcss/vite`
  - Install shadcn/ui CLI and init with `--base-color slate`: `npx shadcn@latest init`
  - Add required shadcn/ui components: button, card, tooltip, separator, badge, skeleton, toast, dialog, input, label, select
  - Create `frontend/.env.example` with single line: `VITE_API_BASE_URL=http://localhost:8080/api/v1`
  - _Requirements: 1.1, 1.5, 1.6_

- [x] 2. Configure TypeScript, ESLint, and Vitest
  - Edit `frontend/tsconfig.json`: set `"strict": true`, `"noUnusedLocals": true`, `"noUnusedParameters": true`, `"skipLibCheck": true`; add path alias `"@/*": ["./src/*"]`
  - Create `frontend/.eslintrc.cjs` extending `@typescript-eslint/recommended` and `plugin:react-hooks/recommended`; add `plugin:react/recommended` with `react/react-in-jsx-scope: off`
  - Add `"lint": "eslint src --ext .ts,.tsx"` and `"test": "vitest"` scripts to `package.json`
  - Create `frontend/vite.config.ts`: add `@vitejs/plugin-react`, `@tailwindcss/vite`, path alias `@` → `./src`, test config `{ globals: true, environment: 'jsdom', setupFiles: ['./src/test/setup.ts'] }`
  - Create `frontend/src/test/setup.ts` importing `@testing-library/jest-dom`
  - _Requirements: 1.4, 10.2, 10.4_

- [x] 3. Apply government design system (Tailwind + CSS tokens)
  - Edit `frontend/src/index.css`: add `@import` for Inter font from Google Fonts; add Tailwind `@tailwind base/components/utilities` directives; define all 14 CSS custom properties from the design document on `:root`
  - Create `frontend/tailwind.config.ts` with `content` glob, `fontFamily.sans: ['Inter', 'system-ui', 'sans-serif']`, and all government colour token mappings (`primary-navy`, `gov-blue`, `secondary-blue`, `teal-accent`, `page-bg`, `card-bg`, `gov-border`, `text-primary`, `text-secondary`)
  - Configure shadcn/ui's `components.json` to use `slate` base colour
  - Verify that `bg-page-bg` and `bg-card-bg` generate valid CSS utility classes by running `npm run build`
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [ ] 4. Create TypeScript API types and utility library
  - Create `frontend/src/types/api.types.ts` with `ApiResponse<T>` and `PagedResponse<T>` interfaces exactly matching the backend JSON shapes documented in `docs/frontend-analysis.md` §1.6
  - Create `frontend/src/lib/utils.ts` with `cn(…inputs)` (clsx + tailwind-merge), `formatDate(date, fmt?)` (date-fns `format` + `parseISO`), and `formatCurrency(amount)` (Intl.NumberFormat `en-IN` INR)
  - Install peer dependencies if needed: `clsx`, `tailwind-merge`
  - _Requirements: 8.2, 8.5_

  - [ ]* 4.1 Write property tests for cn() and formatCurrency()
    - **Property 8: cn() merges conflicting Tailwind classes consistently** — generate arrays of conflicting class pairs and verify last-wins behaviour
    - **Property 5 (partial): formatCurrency returns a string starting with ₹ for any finite number**
    - _Requirements: 8.5_

- [ ] 5. Build the Axios API client and providers
  - Create `frontend/src/services/api-client.ts` with an Axios instance reading `VITE_API_BASE_URL`; add request interceptor reading `localStorage.getItem('gsdts_access_token')` and setting `Authorization: Bearer <token>` when present; add response interceptor unwrapping `ApiResponse<T>.data`
  - Create `frontend/src/app/providers.tsx` with `Providers` component: `QueryClient` configured with `staleTime: 30_000, retry: 1`; wraps children with `QueryClientProvider` and renders `<Toaster />`
  - _Requirements: 8.1, 8.3, 8.4, 9.1, 9.2, 9.3_

  - [ ]* 5.1 Write property tests for Axios interceptors
    - **Property 6: API request interceptor attaches Bearer token** — mock localStorage with token; assert outgoing header
    - **Property 7: Response interceptor unwraps ApiResponse data** — mock response with ApiResponse envelope; assert resolved value is `.data`
    - _Requirements: 8.3, 8.4_

- [ ] 6. Build PageContainer and Header components
  - Create `frontend/src/components/layout/PageContainer.tsx`: `<div className="max-w-[1280px] mx-auto px-6 py-6 w-full">{children}</div>`
  - Create `frontend/src/components/layout/Breadcrumbs.tsx`: define `ROUTE_LABEL_MAP` constant; use `useLocation()` to split pathname; map segments to labels using the map; render `<nav>` with clickable links for all segments except the last; apply truncation when segments > 4
  - Create `frontend/src/components/layout/Header.tsx`: `<header className="h-16 bg-card-bg border-b border-gov-border flex items-center px-6 flex-shrink-0">` containing `<Breadcrumbs />` on the left and a user placeholder avatar on the right
  - _Requirements: 3.4, 3.5, 5.1, 5.2, 5.3, 5.4_

  - [ ]* 6.1 Write property tests for Breadcrumbs
    - **Property 4: Breadcrumb labels use the route-label map** — for each key in ROUTE_LABEL_MAP, verify the breadcrumb displays the mapped label not the raw slug
    - _Requirements: 5.2, 5.3_

- [ ] 7. Build Sidebar component
  - Create `frontend/src/components/layout/Sidebar.tsx`
  - Define `NAV_ITEMS` and `ADMIN_ITEMS` arrays in the exact order specified in Requirement 4.1 and the design document
  - Read initial collapsed state from `localStorage.getItem('gsdts_sidebar_collapsed')`; persist on toggle with `localStorage.setItem`
  - Animate width with `transition-[width] duration-200 ease-in-out`; expanded = `w-60`, collapsed = `w-16`
  - Show icon (20 px Lucide) + label when expanded; icon only when collapsed
  - Wrap each collapsed nav item in shadcn/ui Tooltip (side="right") showing the label
  - Apply active state using `useLocation()`: `bg-gov-blue text-white` on active, `hover:bg-gov-blue/10` on inactive
  - Add "Coming Soon" badge (shadcn/ui `Badge` variant secondary) next to Verification, Disbursement, Compliance, Analytics items
  - Render GSDTS wordmark/logo at the top above the nav list
  - Add mobile responsive behaviour: hide on `md:hidden`; hamburger button in Header opens an overlay drawer (shadcn/ui Sheet)
  - _Requirements: 3.2, 3.3, 3.6, 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 7.1 Write property tests for Sidebar
    - **Property 1: Sidebar toggle inverts collapsed state** — render Sidebar; click toggle; assert collapsed state inverted and localStorage updated; click again; assert restored
    - **Property 2: Navigation order is an invariant** — render Sidebar; collect all nav item labels; assert order matches NAV_ITEMS then ADMIN_ITEMS specification
    - **Property 3: Active route highlights exactly one nav item** — for each nav item href, navigate to that route; assert exactly one item has active styling
    - _Requirements: 3.2, 4.1, 4.2_

- [ ] 8. Build AppShell and wire all layout components
  - Create `frontend/src/components/layout/AppShell.tsx`: compose `<Sidebar />` on the left and a right-side `<div className="flex flex-col flex-1 min-w-0 overflow-hidden">` containing `<Header />` and `<main className="flex-1 overflow-y-auto"><PageContainer><Outlet /></PageContainer></main>`
  - _Requirements: 3.1_

  - [ ]* 8.1 Write example tests for AppShell composition
    - Render AppShell with a mock `<Outlet />`; assert Sidebar, Header, and PageContainer are present in the DOM
    - _Requirements: 3.1_

- [x] 9. Checkpoint — verify layout renders
  - Ensure all tests pass with `npm run test -- --run`
  - Ensure `npm run build` completes without TypeScript or ESLint errors
  - Ensure `npm run lint` reports zero errors
  - Ask the user if any visual adjustments are needed before proceeding to routing

- [ ] 10. Build placeholder pages and configure routing
  - Create `frontend/src/features/placeholders/PlaceholderPage.tsx` accepting `{ title: string; description: string }` props; renders a page heading and a shadcn/ui Card with the description
  - Create `frontend/src/features/auth/pages/LoginPage.tsx` and `RegisterPage.tsx` stubs using PlaceholderPage-style card with "Authentication coming in Phase 2." text
  - Create `frontend/src/features/dashboard/pages/DashboardPage.tsx` with a static welcome card showing GSDTS heading, current route from `useLocation()`, and a grid summary of all navigation sections
  - Create thin page stub files for all other protected routes listed in Requirement 6.3 that are not yet implemented (each file renders `<PlaceholderPage title="..." description="This feature is coming soon." />`)
  - Create `frontend/src/features/common/NotFoundPage.tsx` with "Page Not Found" message and a link to `/dashboard`
  - _Requirements: 6.5, 7.1, 7.2, 7.3, 7.4_

  - [ ]* 10.1 Write property test for PlaceholderPage
    - **Property 5: PlaceholderPage renders any title and description** — for any non-empty title and description string pair, the component renders both values in the document
    - _Requirements: 7.1_

- [ ] 11. Configure React Router with full route tree
  - Create `frontend/src/app/router.tsx` using `createBrowserRouter`
  - Add public routes for `/login` and `/register` (no AppShell)
  - Add a root catch-all route with `element: <AppShell />` and all protected child routes from Requirement 6.3, each lazily importing their page component with `React.lazy`
  - Add index route redirecting `/` to `/dashboard` with `<Navigate to="/dashboard" replace />`
  - Add a catch-all `path: '*'` inside AppShell children pointing to `<NotFoundPage />`
  - Wrap each `React.lazy` import in `<Suspense fallback={<div>Loading…</div>}>` in the route element
  - Create `frontend/src/app/App.tsx`: `<Providers><RouterProvider router={router} /></Providers>`
  - Create `frontend/src/main.tsx`: `ReactDOM.createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)`
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [ ]* 11.1 Write example tests for routing
    - Test that navigating to `/` renders a redirect to `/dashboard`
    - Test that navigating to an unknown route renders "Page Not Found"
    - Test that `/login` renders without AppShell (no Sidebar in DOM)
    - Test that `/dashboard` renders with AppShell (Sidebar present in DOM)
    - _Requirements: 6.4, 6.5, 6.6_

- [x] 12. Final checkpoint — full build and quality verification
  - Run `npm run build` inside `frontend/`; confirm zero TypeScript errors, zero Vite warnings about unused imports, and successful bundle output to `dist/`
  - Run `npm run lint`; confirm zero ESLint errors
  - Run `npm run test -- --run`; confirm all property and example tests pass with zero failures
  - Ensure `npm run dev` starts the dev server and the application loads in a browser with the government shell layout visible, Sidebar collapsible, navigation links working, and no console errors
  - Ask the user if any adjustments are needed before Phase 2 (authentication)

## Notes

- Tasks 4, 5, and 6 can be developed in parallel once Task 3 (Tailwind config) is complete; Task 7 (Sidebar) depends on Task 6 (Header/Breadcrumbs) only for import resolution
- Tasks marked with `*` are optional; skip them for a faster initial setup
- All page stub files for unimplemented features are intentionally thin — they will be replaced by real implementations in Phases 3–5 without touching the router or AppShell
- The `gsdts_access_token` localStorage key is introduced in the API client (Task 5) but will not contain a real value until Phase 2 authentication is wired; the interceptor is a no-op when the key is absent
- Do not add any mock data files or demo-data services in Phase 1; those belong to Phase 4

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2", "3"] },
    { "id": 2, "tasks": ["4", "5"] },
    { "id": 3, "tasks": ["4.1", "5.1", "6"] },
    { "id": 4, "tasks": ["6.1", "7"] },
    { "id": 5, "tasks": ["7.1", "8"] },
    { "id": 6, "tasks": ["8.1", "10"] },
    { "id": 7, "tasks": ["10.1", "11"] },
    { "id": 8, "tasks": ["11.1"] }
  ]
}
```
