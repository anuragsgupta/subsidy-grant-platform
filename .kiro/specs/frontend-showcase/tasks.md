# Implementation Plan: Frontend Showcase (Phase 4)

## Overview

Adds the Dashboard, Schemes, Beneficiaries and Applications showcase modules on top of the
Phase 1–3 foundation. All scheme, beneficiary and application data comes from
`demo-data.service.ts`. The only real API call is `GET /regions` (already integrated) used for
regional chart labels. Every page backed by demo data shows `<DemoBadge />`.

---

## Tasks

- [x] 1. Demo data layer
  - [x] 1.1 Create `src/services/demo-data.service.ts` with all TypeScript types and static fixtures
    - Export types: `WorkflowStage`, `SchemeStatus`, `BeneficiaryType`, `BeneficiaryStatus`, `DemoEligibilityCriterion`, `DemoScheme`, `DemoBeneficiary`, `DemoApplicationEvent`, `DemoApplication`, `DemoStats`, `DemoActivityEvent`
    - Provide ≥ 4 scheme fixtures (one per `SchemeStatus`), ≥ 10 beneficiary fixtures (pre-masked identity fields), ≥ 2 applications per role-relevant workflow stage
    - Export functions: `getAllSchemes`, `getSchemeById`, `getAllBeneficiaries`, `getBeneficiaryById`, `getBeneficiaryByUserId`, `getAllApplications`, `getApplicationById`, `addApplication`, `getStats`
    - Module-level counter variable for `addApplication`; `generateReferenceNumber(counter)` follows `APP-YYYYMMDD-XXXXXX` format
    - No `any`/`unknown` casts on exported fixture values
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

---

- [x] 2. DemoBadge component
  - [x] 2.1 Create `src/components/common/DemoBadge.tsx`
    - Amber pill, `data-testid="demo-badge"`, no props
    - _Requirements: 1.3, 2.2, 3.3, 4.2, 5.3, 6.7, 7.3, 8.4_

---

- [x] 3. Dashboard module
  - [x] 3.1 Create `src/features/dashboard/components/StatCard.tsx`
    - Props: `title`, `value`, `icon: LucideIcon`, `variant?: 'default' | 'success' | 'warning' | 'danger'`
    - Wraps shadcn `Card`
    - _Requirements: 1.2_
  - [x] 3.2 Create `src/features/dashboard/components/ApplicationStatusChart.tsx`
    - Recharts `PieChart` with `innerRadius` (donut); data from `getStats().applicationsByStatus`
    - Each cell coloured by status-colour map; legend below with status name + count
    - _Requirements: 1.4_
  - [x] 3.3 Create `src/features/dashboard/components/RegionalDistributionChart.tsx`
    - Recharts `BarChart`; region names from `useRegionsQuery()` joined by `regionId` to `getStats().applicationsByRegionId`
    - Loading skeleton while regions load; `<ErrorState>` scoped to this panel on fetch failure; `<EmptyState>` when zero regions
    - _Requirements: 1.5, 1.13_
  - [x] 3.4 Create `src/features/dashboard/components/RecentActivityList.tsx`
    - Renders exactly 10 events from `getStats().recentActivity`; timestamps via `format(parseISO(ts), 'yyyy-MM-dd HH:mm')`
    - _Requirements: 1.6_
  - [x] 3.5 Create `src/features/dashboard/components/PendingWorkQueue.tsx`
    - Props: `columns: ColumnDef[], rows: unknown[]`; plain `<table>` (no server pagination); `<EmptyState>` when rows empty
    - _Requirements: 1.7, 1.8, 1.9, 1.10, 1.11_
  - [x] 3.6 Create role-specific dashboard components in `src/features/dashboard/components/`
    - `AdminDashboard.tsx` — all-region pending queue (ADMIN, R-1.7)
    - `BeneficiaryDashboard.tsx` — own active applications queue (BENEFICIARY, R-1.11)
    - `FieldOfficerDashboard.tsx` — FIELD_PENDING assigned to officer (FIELD_OFFICER, R-1.8)
    - `DistrictOfficerDashboard.tsx` — DISTRICT_REVIEW in officer's region (DISTRICT_OFFICER, R-1.9)
    - `FinanceApproverDashboard.tsx` — FINANCE_REVIEW / BUDGET_HOLD queue (FINANCE_APPROVER, R-1.10)
    - Each composes `StatCard`, charts, `RecentActivityList`, `PendingWorkQueue`; calls `getStats()` synchronously; renders `<DemoBadge>` once above the stat-card grid
    - _Requirements: 1.2, 1.3, 1.7–1.11_
  - [x] 3.7 Create `src/features/dashboard/pages/DashboardPage.tsx`
    - Role dispatcher: maps `user.role` → role dashboard component; falls through to `<PermissionDeniedState>` for unknown roles
    - Renders within 2 seconds of navigation; loading skeletons per stat card and chart panel during data load
    - _Requirements: 1.1, 1.12, 1.14_

---

- [x] 4. Schemes module
  - [x] 4.1 Create `src/features/schemes/types/scheme.types.ts`
    - Re-export `DemoScheme`, `DemoEligibilityCriterion`, `SchemeStatus` from `demo-data.service.ts`
    - _Requirements: 9.2_
  - [x] 4.2 Create `src/features/schemes/services/scheme.service.ts`
    - `schemeService.getAll()` and `schemeService.getById(id)` wrap synchronous demo calls in `Promise.resolve`
    - _Requirements: 9.1, 9.3_
  - [x] 4.3 Create `src/features/schemes/hooks/useSchemes.ts`
    - `schemeKeys`, `useSchemesQuery()`, `useSchemeQuery(id)` with `staleTime: Infinity`
    - _Requirements: 2.7, 3.4_
  - [x] 4.4 Create `src/features/schemes/components/EligibilityCriteriaList.tsx`
    - Props: `criteria: DemoEligibilityCriterion[]`; `<ul>` listing `attribute operator threshold · Mandatory|Optional · description?`
    - _Requirements: 3.2_
  - [x] 4.5 Create `src/features/schemes/pages/SchemeListPage.tsx`
    - State: `{ search, statusFilter, page }` with 400 ms debounce on search; filter pipeline: status → text → paginate (PAGE_SIZE = 20); both filter changes reset page to 0
    - Columns: Scheme Code, Name, `<StatusBadge>`, Grant Amount Range (`formatCurrency(min) – formatCurrency(max)`), Application Period (`dd MMM yyyy` – `dd MMM yyyy`)
    - Renders `<DemoBadge>`, loading skeletons via `QueryState`, empty state
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_
  - [x] 4.6 Create `src/features/schemes/pages/SchemeDetailPage.tsx`
    - Reads `id` from `useParams()`; uses `useSchemeQuery(id)`; shows all fields per R-3.1 and `<EligibilityCriteriaList>`
    - `<EmptyState>` with link to `/schemes` when ID not found
    - ADMIN: disabled "Edit" button with `title="Coming soon"`, no `onClick`
    - Renders `<DemoBadge>`, loading skeletons via `QueryState`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

---

- [x] 5. Beneficiaries module
  - [x] 5.1 Create `src/utils/mask.ts`
    - `maskField(value: string): string` → `'****' + value.slice(-4)`; returns `'****'` when `value.length <= 4`
    - _Requirements: 4.4, 5.4_
  - [x] 5.2 Create `src/features/beneficiaries/types/beneficiary.types.ts`
    - Re-export `DemoBeneficiary`, `BeneficiaryType`, `BeneficiaryStatus` from `demo-data.service.ts`
    - _Requirements: 9.2_
  - [x] 5.3 Create `src/features/beneficiaries/services/beneficiary.service.ts`
    - `beneficiaryService.getAll()`, `beneficiaryService.getById(id)`, `beneficiaryService.getByUserId(userId)` wrap demo calls in `Promise.resolve`
    - _Requirements: 9.1, 9.3_
  - [x] 5.4 Create `src/features/beneficiaries/hooks/useBeneficiaries.ts`
    - `beneficiaryKeys`, `useBeneficiariesQuery()`, `useBeneficiaryQuery(id)`, `useBeneficiaryByUserIdQuery(userId)` with `staleTime: Infinity`
    - _Requirements: 4.8, 5.6_
  - [x] 5.5 Create `src/features/beneficiaries/components/ApplicationHistoryList.tsx`
    - Props: `applications: DemoApplication[]`; columns: Reference Number, Scheme Name, `<StatusBadge>`, Submission Date; each row links to `/applications/:id`; empty state: "No applications found"
    - _Requirements: 5.5_
  - [x] 5.6 Create `src/features/beneficiaries/pages/BeneficiaryListPage.tsx`
    - Accessible to ADMIN, DISTRICT_OFFICER, FINANCE_APPROVER, FIELD_OFFICER; renders `<PermissionDeniedState>` for BENEFICIARY role immediately
    - State: `{ search, statusFilter, page }` with per-keystroke search (no debounce); filter pipeline: status → text → paginate (PAGE_SIZE = 20)
    - Columns: Reference ID, Full Name, Type, Region, Status; `nationalId`/`ssn` NOT shown in list
    - Renders `<DemoBadge>`, loading skeletons, empty state
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9_
  - [x] 5.7 Create `src/features/beneficiaries/pages/BeneficiaryDetailPage.tsx`
    - Route `/admin/beneficiaries/:id`; reads from `useBeneficiaryQuery(id)` via service
    - Displays all profile fields; `nationalId`/`ssn` rendered through `maskField()`
    - Shows `<ApplicationHistoryList>` filtered to this beneficiary
    - `<EmptyState>` with link to `/admin/beneficiaries` when ID not found; renders `<DemoBadge>`
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_
  - [x] 5.8 Create `src/features/beneficiaries/pages/BeneficiaryProfilePage.tsx`
    - Route `/beneficiary/profile`; calls `getBeneficiaryByUserId(user.id)` via service
    - Shows all fields including identity fields at their stored (pre-masked) value; renders `<DemoBadge>`
    - _Requirements: 5.1, 5.3, 5.6_

---

- [x] 6. Applications module
  - [x] 6.1 Create `src/features/applications/types/application.types.ts`
    - Re-export `DemoApplication`, `DemoApplicationEvent`, `WorkflowStage` from `demo-data.service.ts`
    - _Requirements: 9.2_
  - [x] 6.2 Create `src/features/applications/services/application.service.ts`
    - `applicationService.getAll()`, `applicationService.getById(id)`, `applicationService.add(app)` wrap demo calls in `Promise.resolve`
    - Export `getApplicationsForRole(applications, user)` with role-scope switch logic per design
    - _Requirements: 6.1–6.6, 9.1, 9.3_
  - [x] 6.3 Create `src/features/applications/hooks/useApplications.ts`
    - `applicationKeys`, `useApplicationsQuery()`, `useApplicationQuery(id)` with `staleTime: Infinity`
    - _Requirements: 6.12, 7.8_
  - [x] 6.4 Create `src/features/applications/components/ApplicationTimeline.tsx`
    - Props: `events: DemoApplicationEvent[]`; sorted ascending by `transitionDate`; each entry: stage label (bold), `format(parseISO(...), 'dd MMM yyyy HH:mm')`, remark or `—`
    - _Requirements: 7.4_
  - [x] 6.5 Create `src/features/applications/components/ApplicationWorkflowActions.tsx`
    - Renders three disabled `<Button>` elements: "Approve", "Reject", "Request Clarification"; each with `disabled` and `title="Coming soon"`; no `onClick`; no demo state mutation
    - _Requirements: 7.6_
  - [x] 6.6 Create `src/features/applications/schemas/application.schema.ts`
    - `submitApplicationSchema` using Zod: `schemeId: z.string().min(1)`, `requestedAmount: z.number()`; `superRefine` validates amount against scheme min/max via `getSchemeById`
    - _Requirements: 8.3, 8.6_
  - [x] 6.7 Create `src/features/applications/pages/ApplicationListPage.tsx`
    - Role-scope filter via `getApplicationsForRole` applied before rendering
    - State: `{ stageFilter, fromDate, toDate, sortField, sortDir, page }` (PAGE_SIZE = 20)
    - Filter pipeline: role-scope → stage → date range → sort → paginate; default sort: `submissionDate` desc
    - Date range: if `fromDate > toDate` set `dateRangeError` and skip range filter; both values retained
    - Columns: Reference Number, Beneficiary Name, Scheme Name, Requested Amount, `<StatusBadge>`, Submission Date; sortable column headers for Submission Date and Requested Amount
    - Renders `<DemoBadge>`, loading skeletons, empty state
    - _Requirements: 6.1–6.13_
  - [x] 6.8 Create `src/features/applications/pages/ApplicationDetailPage.tsx`
    - Reads `id` from `useParams()`; calls `useApplicationQuery(id)`
    - Displays all fields per R-7.2; `<ApplicationTimeline>`; `<ApplicationWorkflowActions>`
    - BENEFICIARY guard: if `application.beneficiaryId !== linkedBeneficiary.id` → `<PermissionDeniedState>` with no data visible
    - `<EmptyState>` with link to `/applications` when ID not found; renders `<DemoBadge>`; loading skeletons via `QueryState`
    - _Requirements: 7.1–7.8_
  - [x] 6.9 Create `src/features/applications/pages/SubmitApplicationPage.tsx`
    - Non-BENEFICIARY: render `<PermissionDeniedState>` with link to dashboard; no form
    - Form: scheme selector (name + code), requested amount field; `react-hook-form` + `zodResolver(submitApplicationSchema)`
    - On valid submit: call `applicationService.add(newApp)`, show success toast with generated reference number
    - On error: toast error message; retain all field values
    - Renders `<DemoBadge>` adjacent to form title
    - _Requirements: 8.1–8.8_

- [x] 7. Checkpoint — build verification
  - Run `npm run build` and confirm zero TypeScript errors and zero Vite build errors before proceeding to tests.
  - _Requirements: 10.8_

---

- [ ] 8. Tests
  - [-] 8.1 `features/dashboard/pages/__tests__/DashboardPage.test.tsx`
    - Renders correct role dashboard for each of 5 roles
    - Loading skeleton visible while loading; demo badge present exactly once; `<PermissionDeniedState>` for unknown role
    - `GET /regions` failure → error scoped to chart panel; stat cards still visible
    - _Requirements: 1.1, 1.3, 1.12, 1.13, 1.14, 10.1–10.5_
  - [-] 8.2 `features/schemes/pages/__tests__/SchemeListPage.test.tsx`
    - Loading / empty / error / data states via `QueryState` branch coverage
    - Demo badge present exactly once; search and status filter reduce visible rows; pagination updates on filter change
    - _Requirements: 2.1–2.8, 10.1–10.5_
  - [ ] 8.3 `features/schemes/pages/__tests__/SchemeDetailPage.test.tsx`
    - Loading / empty state; eligibility criteria rendered; ADMIN "Edit" button disabled; demo badge present
    - _Requirements: 3.1–3.6, 10.1–10.5_
  - [ ] 8.4 `features/beneficiaries/pages/__tests__/BeneficiaryListPage.test.tsx`
    - `<PermissionDeniedState>` for BENEFICIARY role; loading / empty / data states; demo badge present
    - Search filters by name and reference ID; status filter reduces rows; `nationalId`/`ssn` absent from list
    - _Requirements: 4.1–4.9, 10.1–10.5_
  - [ ] 8.5 `features/beneficiaries/pages/__tests__/BeneficiaryDetailPage.test.tsx`
    - Identity fields rendered via `maskField`; application history renders; empty state on unknown ID; demo badge present
    - _Requirements: 5.2–5.7, 10.1–10.5_
  - [ ] 8.6 `features/beneficiaries/pages/__tests__/BeneficiaryProfilePage.test.tsx`
    - Shows stored (pre-masked) identity fields; demo badge present; loading skeletons while loading
    - _Requirements: 5.1, 5.3, 5.6, 10.1–10.5_
  - [ ] 8.7 `features/applications/pages/__tests__/ApplicationListPage.test.tsx`
    - Render once per role with mocked applications; assert only role-scoped rows visible and out-of-scope rows absent (by reference number)
    - Date range error when fromDate > toDate; sort toggles on column header click; demo badge present
    - Loading / empty / data states
    - _Requirements: 6.1–6.13, 10.1–10.5_
  - [ ] 8.8 `features/applications/pages/__tests__/ApplicationDetailPage.test.tsx`
    - Timeline renders sorted ascending; workflow actions disabled with no click handler; BENEFICIARY ownership guard; empty state on unknown ID; demo badge present
    - _Requirements: 7.1–7.8, 10.1–10.5_
  - [ ] 8.9 `features/applications/pages/__tests__/SubmitApplicationPage.test.tsx`
    - Non-BENEFICIARY → permission denied state, no form
    - Invalid field → inline error visible; `addApplication` not called
    - Amount outside scheme range → inline error on `requestedAmount`
    - Valid form → `addApplication` called once; success toast with generated reference number visible
    - Demo service error → error toast; field values retained
    - Demo badge present
    - _Requirements: 8.1–8.8, 10.1–10.6_

- [ ] 9. Final checkpoint — full test run
  - Run `npm run test -- --run` and confirm zero failing tests across all test files.
  - _Requirements: 10.7_

---

## Notes

- Tasks 1–6 build incrementally; each group depends on the groups before it.
- Tasks within groups 4, 5, 6 (types → service → hooks → components → pages) must be implemented in that order.
- Test tasks (T-8) depend on all implementation tasks completing successfully (T-7 build checkpoint must pass).
- Demo data fixtures use pre-masked identity values; no unmasked PII appears in source files.
- No real `axios`/`fetch` calls are made for scheme, beneficiary or application data — all go through `demo-data.service.ts`.
- Routes already exist in `src/app/router.tsx` from Phase 1–3; only the page files need to be created.

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["3.1", "3.2", "3.3", "3.4", "3.5", "4.1", "4.2", "5.1", "5.2", "5.3", "6.1", "6.2"] },
    { "id": 3, "tasks": ["3.6", "4.3", "4.4", "5.4", "5.5", "6.3", "6.4", "6.5", "6.6"] },
    { "id": 4, "tasks": ["3.7", "4.5", "4.6", "5.6", "5.7", "5.8", "6.7", "6.8", "6.9"] },
    { "id": 5, "tasks": ["8.1", "8.2", "8.3", "8.4", "8.5", "8.6", "8.7", "8.8", "8.9"] }
  ]
}
```
