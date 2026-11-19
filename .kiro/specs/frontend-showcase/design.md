# Design Document: Frontend Showcase (Phase 4)

## Overview

Phase 4 adds four feature modules — Dashboard, Schemes, Beneficiaries, Applications — on top of
the existing Phase 1–3 foundation. All scheme, beneficiary and application data comes from
`src/services/demo-data.service.ts`. The only real API call in this phase is `GET /regions`,
used for regional chart labels on the dashboard. Every page served by demo data shows a
`<DemoBadge />`.

---

## Architecture

### Feature folder additions

```
src/
├── services/
│   └── demo-data.service.ts           # sole source for schemes/beneficiaries/applications
│
├── components/
│   └── common/
│       └── DemoBadge.tsx              # shared badge, data-testid="demo-badge"
│
├── features/
│   ├── dashboard/
│   │   ├── components/
│   │   │   ├── StatCard.tsx
│   │   │   ├── ApplicationStatusChart.tsx   # Recharts donut
│   │   │   ├── RegionalDistributionChart.tsx # Recharts bar
│   │   │   ├── RecentActivityList.tsx
│   │   │   ├── PendingWorkQueue.tsx
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── BeneficiaryDashboard.tsx
│   │   │   ├── FieldOfficerDashboard.tsx
│   │   │   ├── DistrictOfficerDashboard.tsx
│   │   │   └── FinanceApproverDashboard.tsx
│   │   └── pages/
│   │       └── DashboardPage.tsx      # role dispatcher
│   │
│   ├── schemes/
│   │   ├── components/
│   │   │   └── EligibilityCriteriaList.tsx
│   │   ├── pages/
│   │   │   ├── SchemeListPage.tsx
│   │   │   └── SchemeDetailPage.tsx
│   │   ├── hooks/
│   │   │   └── useSchemes.ts
│   │   ├── services/
│   │   │   └── scheme.service.ts      # thin wrapper over demo-data.service
│   │   └── types/
│   │       └── scheme.types.ts
│   │
│   ├── beneficiaries/
│   │   ├── components/
│   │   │   └── ApplicationHistoryList.tsx
│   │   ├── pages/
│   │   │   ├── BeneficiaryListPage.tsx
│   │   │   ├── BeneficiaryDetailPage.tsx
│   │   │   └── BeneficiaryProfilePage.tsx
│   │   ├── hooks/
│   │   │   └── useBeneficiaries.ts
│   │   ├── services/
│   │   │   └── beneficiary.service.ts
│   │   └── types/
│   │       └── beneficiary.types.ts
│   │
│   └── applications/
│       ├── components/
│       │   ├── ApplicationTimeline.tsx
│       │   └── ApplicationWorkflowActions.tsx
│       ├── pages/
│       │   ├── ApplicationListPage.tsx
│       │   ├── ApplicationDetailPage.tsx
│       │   └── SubmitApplicationPage.tsx
│       ├── hooks/
│       │   └── useApplications.ts
│       ├── services/
│       │   └── application.service.ts
│       └── types/
│           └── application.types.ts
```

---

## Components and Interfaces

### Shared components (new in Phase 4)

| Component | Location | Props summary |
|-----------|----------|---------------|
| `DemoBadge` | `src/components/common/DemoBadge.tsx` | none — renders a fixed amber pill with `data-testid="demo-badge"` |
| `StatCard` | `features/dashboard/components/StatCard.tsx` | `title, value, icon, variant?` |
| `ApplicationStatusChart` | `features/dashboard/components/ApplicationStatusChart.tsx` | `data: { status, count }[]` |
| `RegionalDistributionChart` | `features/dashboard/components/RegionalDistributionChart.tsx` | `regionData: { regionId, count }[]` — joins live regions from `useRegionsQuery` |
| `RecentActivityList` | `features/dashboard/components/RecentActivityList.tsx` | `events: DemoActivityEvent[]` |
| `PendingWorkQueue` | `features/dashboard/components/PendingWorkQueue.tsx` | `columns: ColumnDef[], rows: unknown[]` |
| `EligibilityCriteriaList` | `features/schemes/components/EligibilityCriteriaList.tsx` | `criteria: DemoEligibilityCriterion[]` |
| `ApplicationHistoryList` | `features/beneficiaries/components/ApplicationHistoryList.tsx` | `applications: DemoApplication[]` |
| `ApplicationTimeline` | `features/applications/components/ApplicationTimeline.tsx` | `events: DemoApplicationEvent[]` |
| `ApplicationWorkflowActions` | `features/applications/components/ApplicationWorkflowActions.tsx` | none — renders three disabled coming-soon buttons |

### Role dashboard components

Each role dashboard is a composition component that calls `demoDataService.getStats()` and
renders the shared components above with role-filtered data:

| Component | Visible to |
|-----------|-----------|
| `AdminDashboard` | ADMIN |
| `BeneficiaryDashboard` | BENEFICIARY |
| `FieldOfficerDashboard` | FIELD_OFFICER |
| `DistrictOfficerDashboard` | DISTRICT_OFFICER |
| `FinanceApproverDashboard` | FINANCE_APPROVER |

### Service interfaces

```ts
// scheme.service.ts
interface SchemeService {
  getAll(): Promise<DemoScheme[]>;
  getById(id: string): Promise<DemoScheme | undefined>;
}

// beneficiary.service.ts
interface BeneficiaryService {
  getAll(): Promise<DemoBeneficiary[]>;
  getById(id: string): Promise<DemoBeneficiary | undefined>;
  getByUserId(userId: string): Promise<DemoBeneficiary | undefined>;
}

// application.service.ts
interface ApplicationService {
  getAll(): Promise<DemoApplication[]>;
  getById(id: string): Promise<DemoApplication | undefined>;
  add(app: DemoApplication): Promise<void>;
  getForRole(applications: DemoApplication[], user: UserResponse): DemoApplication[];
}
```

---

## Data Models

The demo data layer defines all types for the showcase modules. These types are shared between
`demo-data.service.ts` and the feature-level `types/` files (which re-export rather than duplicate).

### Core demo types (`src/services/demo-data.service.ts`)

```ts
// v2 workflow stages (from requirements Glossary)
export type WorkflowStage =
  | 'SUBMITTED' | 'FIELD_PENDING' | 'DISTRICT_REVIEW' | 'SECOND_REVIEW'
  | 'FINANCE_REVIEW' | 'BUDGET_HOLD' | 'APPROVED' | 'REJECTED' | 'CLOSED' | 'TERMINATED';

export type SchemeStatus = 'DRAFT' | 'OPEN' | 'PAUSED' | 'CLOSED';
export type BeneficiaryType = 'INDIVIDUAL' | 'ORGANIZATION' | 'BUSINESS';
export type BeneficiaryStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING';

export interface DemoEligibilityCriterion {
  attribute: string;
  operator: 'EQ' | 'GTE' | 'LTE' | 'IN';
  threshold: string;
  mandatory: boolean;
  description?: string;
}

export interface DemoScheme {
  id: string;
  code: string;
  name: string;
  description: string;
  status: SchemeStatus;
  minGrantAmount: number;
  maxGrantAmount: number;
  startDate: string;    // ISO-8601 date
  endDate: string;
  eligibilityCriteria: DemoEligibilityCriterion[];
}

export interface DemoBeneficiary {
  id: string;
  referenceId: string;
  fullName: string;
  type: BeneficiaryType;
  regionId: number;
  regionName: string;
  email: string;
  phone: string;
  status: BeneficiaryStatus;
  nationalId: string;   // stored pre-masked: "****1234"
  ssn: string;          // stored pre-masked: "****5678"
  linkedUserId?: string; // matches UserResponse.id for BENEFICIARY users
}

export interface DemoApplicationEvent {
  stage: WorkflowStage;
  transitionDate: string; // ISO-8601 datetime
  remark?: string;
}

export interface DemoApplication {
  id: string;
  referenceNumber: string;
  beneficiaryId: string;
  beneficiaryName: string;
  schemeId: string;
  schemeName: string;
  requestedAmount: number;
  status: WorkflowStage;
  submissionDate: string; // ISO-8601 date
  assignedOfficerId?: string;   // for FIELD_PENDING scoping
  regionId?: number;            // for DISTRICT_REVIEW scoping
  timeline: DemoApplicationEvent[];
}
```

### Service exports

```ts
// All functions are synchronous — no async/await needed
export function getAllSchemes(): DemoScheme[]
export function getSchemeById(id: string): DemoScheme | undefined
export function getAllBeneficiaries(): DemoBeneficiary[]
export function getBeneficiaryById(id: string): DemoBeneficiary | undefined
export function getBeneficiaryByUserId(userId: string): DemoBeneficiary | undefined
export function getAllApplications(): DemoApplication[]
export function getApplicationById(id: string): DemoApplication | undefined
export function addApplication(app: DemoApplication): void  // in-memory mutation
export function getStats(): DemoStats  // pre-computed aggregates for dashboard

export interface DemoStats {
  totalApplications: number;
  pendingApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  totalRequestedAmount: number;
  applicationsByStatus: { status: WorkflowStage; count: number }[];
  applicationsByRegionId: { regionId: number; count: number }[];
  recentActivity: DemoActivityEvent[];  // last 10, newest first
}

export interface DemoActivityEvent {
  applicationRef: string;
  eventType: string;
  timestamp: string; // ISO-8601 datetime
}
```

**Fixture coverage requirements** (enforced at the fixture level, not runtime):
- ≥ 4 schemes: at least one per `SchemeStatus` value
- ≥ 10 beneficiaries with pre-masked identity fields
- ≥ 2 applications per role-relevant workflow stage

**Isolation rule:** No page or hook may call `axios`/`fetch` or use `useQuery` targeting a real
endpoint for scheme, beneficiary or application data. All reads go through the functions above.

---

## Dashboard Design

### `DashboardPage` — role dispatcher

```tsx
export function DashboardPage() {
  const { user } = useAuth();
  const dashboards: Record<UserRole, JSX.Element> = {
    ADMIN:            <AdminDashboard />,
    BENEFICIARY:      <BeneficiaryDashboard />,
    FIELD_OFFICER:    <FieldOfficerDashboard />,
    DISTRICT_OFFICER: <DistrictOfficerDashboard />,
    FINANCE_APPROVER: <FinanceApproverDashboard />,
  };
  return dashboards[user.role] ?? <PermissionDeniedState />;
}
```

Each role dashboard composes `StatCard`, the two charts, `RecentActivityList`,
and a role-specific `PendingWorkQueue`. They all call `demoDataService.getStats()`
synchronously — no TanStack Query needed for demo data.

### `StatCard`

```tsx
interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}
```

Each card wraps in a shadcn `Card`. The `DemoBadge` is rendered at the top of
the stat card grid, not per-card, to avoid repetition.

### `ApplicationStatusChart` (Recharts donut)

```tsx
// PieChart with innerRadius. Data from demoDataService.getStats().applicationsByStatus
// Each cell coloured by the existing status-colour map from frontend-analysis §5.2
// Legend below chart: status name + count
```

### `RegionalDistributionChart` (Recharts bar)

Region names come from `useRegionsQuery()` (real `GET /regions`). Region counts
come from `demoDataService.getStats().applicationsByRegionId`. The two are
joined by `regionId` client-side.

```tsx
// If useRegionsQuery.isLoading: render <LoadingSkeleton rows={1} />
// If useRegionsQuery.isError:   render <ErrorState /> scoped to the chart panel only
// If regions.length === 0:      render <EmptyState message="No regions configured" />
// Otherwise: BarChart with XAxis=regionName, YAxis=count
```

### `RecentActivityList`

Renders exactly the 10 events from `demoDataService.getStats().recentActivity`.
Each entry: application reference + event type as `<span>`, timestamp formatted
with `format(parseISO(ts), 'yyyy-MM-dd HH:mm')` from date-fns.

### `PendingWorkQueue`

Accepts `columns` and `rows` props; each role dashboard passes filtered data
and column definitions. Renders a plain `<table>` (not DataTable) since there
is no server pagination on demo data. Empty state via `<EmptyState />`.

---

## Scheme Module Design

### Types (`scheme.types.ts`)

Re-export `DemoScheme`, `DemoEligibilityCriterion`, `SchemeStatus` from
`demo-data.service.ts` — no duplication.

### `scheme.service.ts`

```ts
export const schemeService = {
  getAll: () => Promise.resolve(getAllSchemes()),
  getById: (id: string) => Promise.resolve(getSchemeById(id)),
};
```

Wraps synchronous demo calls in resolved promises so hooks can use the same
`useQuery` pattern as real services.

### `useSchemes` hook

```ts
export const schemeKeys = {
  list: ['schemes', 'list'] as const,
  detail: (id: string) => ['schemes', 'detail', id] as const,
};
export function useSchemesQuery() {
  return useQuery({ queryKey: schemeKeys.list, queryFn: schemeService.getAll, staleTime: Infinity });
}
export function useSchemeQuery(id: string) {
  return useQuery({ queryKey: schemeKeys.detail(id), queryFn: () => schemeService.getById(id), staleTime: Infinity });
}
```

### `SchemeListPage` — client-side filter/search/pagination

State: `{ search: string; statusFilter: SchemeStatus | 'ALL'; page: number }`

Filter pipeline (applied in this order):
1. Status filter: `status === 'ALL' ? all : schemes.filter(s => s.status === statusFilter)`
2. Text search (debounced 400 ms): case-insensitive match on `name` OR `code`
3. Pagination: slice `[page * PAGE_SIZE, (page + 1) * PAGE_SIZE]` where `PAGE_SIZE = 20`

Both filter changes reset `page` to `0`. Pass `isEmpty={filtered.length === 0}` to
`<QueryState>`.

Grant amount range displayed as `formatCurrency(min) – formatCurrency(max)` using
the existing `formatCurrency` utility. Application period as
`format(parseISO(startDate), 'dd MMM yyyy') – format(parseISO(endDate), 'dd MMM yyyy')`.

### `SchemeDetailPage`

Reads `id` from `useParams()`. Calls `useSchemeQuery(id)`. If `data === undefined`
after loading, renders `<EmptyState>` with a link back to `/schemes`.

`EligibilityCriteriaList` renders a `<ul>` where each `<li>` shows:
`attribute operator threshold · (Mandatory | Optional) · description?`

ADMIN edit button: rendered as a disabled `<Button>` with `title="Coming soon"`.
No `onClick` handler. No navigation.

---

## Beneficiary Module Design

### `maskField` utility (`src/utils/mask.ts`)

```ts
export function maskField(value: string): string {
  // Returns "****" + last four characters of value
  // If value.length <= 4, returns "****"
  return '****' + value.slice(-4);
}
```

Fixtures store values already masked. `maskField` is used only in list/detail
views for the officer-facing pages; the beneficiary's own profile shows the
raw stored value (which is also pre-masked in fixtures per requirement 9.6).

### `beneficiary.service.ts`

```ts
export const beneficiaryService = {
  getAll: () => Promise.resolve(getAllBeneficiaries()),
  getById: (id: string) => Promise.resolve(getBeneficiaryById(id)),
  getByUserId: (userId: string) => Promise.resolve(getBeneficiaryByUserId(userId)),
};
```

### `BeneficiaryListPage`

Accessible only to ADMIN, DISTRICT_OFFICER, FINANCE_APPROVER, FIELD_OFFICER.
If `user.role === 'BENEFICIARY'`, render `<PermissionDeniedState />` immediately.

State: `{ search: string; statusFilter: BeneficiaryStatus | 'ALL'; page: number }`

Search is applied on every keystroke (no debounce per requirement 4.5): case-insensitive
match on `fullName` OR `referenceId`. Status filter resets page to 0.

Columns: Reference ID, Full Name, Type, Region, Status. The `nationalId` and `ssn`
columns are **not** shown in the list — masking applies only in the detail view.

### `BeneficiaryDetailPage` (`/admin/beneficiaries/:id`)

`nationalId` and `ssn` rendered via `maskField()`. Application history list
calls `getAllApplications().filter(a => a.beneficiaryId === beneficiary.id)`,
rendered as `<ApplicationHistoryList>`.

`ApplicationHistoryList` props: `applications: DemoApplication[]`. Each row:
Reference Number | Scheme Name | `<StatusBadge status={app.status}>` | Submission Date.
Row links to `/applications/:id`. Empty state: "No applications found".

### `BeneficiaryProfilePage` (`/beneficiary/profile`)

Calls `getBeneficiaryByUserId(user.id)`. Shows all fields including identity
fields at their stored value (pre-masked). Renders `<DemoBadge />`.

---

## Application Module Design

### Role-scope filter logic (`application.service.ts`)

```ts
export function getApplicationsForRole(
  applications: DemoApplication[],
  user: UserResponse,
): DemoApplication[] {
  switch (user.role) {
    case 'BENEFICIARY':
      // filter by linked beneficiaryId via getBeneficiaryByUserId(user.id)
    case 'FIELD_OFFICER':
      return applications.filter(a => a.status === 'FIELD_PENDING' && a.assignedOfficerId === user.id);
    case 'DISTRICT_OFFICER':
      return applications.filter(
        a => ['DISTRICT_REVIEW', 'SECOND_REVIEW'].includes(a.status) && user.regionIds.includes(a.regionId ?? -1)
      );
    case 'FINANCE_APPROVER':
      return applications.filter(a => ['FINANCE_REVIEW', 'BUDGET_HOLD'].includes(a.status));
    case 'ADMIN':
    default:
      return applications;
  }
}
```

### `ApplicationListPage`

State:
```ts
{ stageFilter: WorkflowStage | 'ALL'; fromDate: string; toDate: string;
  sortField: 'submissionDate' | 'requestedAmount'; sortDir: 'asc' | 'desc'; page: number }
```

Filter pipeline:
1. Role-scope filter via `getApplicationsForRole`
2. Stage filter
3. Date range filter (validate: fromDate ≤ toDate; if invalid, skip and show inline error)
4. Sort (client-side toggle)
5. Paginate (PAGE_SIZE = 20)

Default sort: `submissionDate` descending.

Date range validation: if `fromDate > toDate`, set a `dateRangeError` state string
and do **not** apply the range filter. No filter is wiped — both values are retained.

### `ApplicationDetailPage`

`ApplicationTimeline` props:
```tsx
interface ApplicationTimelineProps {
  events: DemoApplicationEvent[];
}
```
Renders events sorted ascending by `transitionDate`. Each entry: stage label (bold),
date formatted as `format(parseISO(e.transitionDate), 'dd MMM yyyy HH:mm')`, remark
or `—`.

`ApplicationWorkflowActions` renders three disabled `<Button>` elements:
- "Approve" / "Reject" / "Request Clarification"
- Each has `disabled` and `title="Coming soon"`. No `onClick`. No Demo_Service mutation.

If `user.role === 'BENEFICIARY'` and `application.beneficiaryId !== linkedBeneficiary.id`,
render `<PermissionDeniedState />` without displaying any application fields.

### `SubmitApplicationPage`

Non-BENEFICIARY users: render `<PermissionDeniedState>` with link to dashboard.

Zod schema:
```ts
export const submitApplicationSchema = z.object({
  schemeId: z.string().min(1, 'Select a scheme'),
  requestedAmount: z.number({ invalid_type_error: 'Enter an amount' }),
}).superRefine((val, ctx) => {
  const scheme = getSchemeById(val.schemeId);
  if (!scheme) return;
  if (val.requestedAmount < scheme.minGrantAmount) {
    ctx.addIssue({ code: 'too_small', path: ['requestedAmount'],
      message: `Minimum is ${formatCurrency(scheme.minGrantAmount)}` });
  }
  if (val.requestedAmount > scheme.maxGrantAmount) {
    ctx.addIssue({ code: 'too_big', path: ['requestedAmount'],
      message: `Maximum is ${formatCurrency(scheme.maxGrantAmount)}` });
  }
});
```

On valid submit, call `demoDataService.addApplication(newApp)`. Generate reference:
```ts
function generateReferenceNumber(counter: number): string {
  const date = format(new Date(), 'yyyyMMdd');
  return `APP-${date}-${String(counter).padStart(6, '0')}`;
}
```
Counter is a module-level variable in `demo-data.service.ts`, incremented on each
`addApplication` call. On success, show a toast and display the reference number.
On Demo_Service error, retain all field values (no reset).

---

## DemoBadge Component

```tsx
// src/components/common/DemoBadge.tsx
export function DemoBadge() {
  return (
    <span
      data-testid="demo-badge"
      className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200"
    >
      Demo data
    </span>
  );
}
```

Placement: rendered once near the page title, inside `<PageContainer>`, before
the main content area. Never rendered inside individual table rows or chart segments.

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| `GET /regions` fails | `<ErrorState>` scoped to `RegionalDistributionChart` panel only; rest of dashboard unaffected |
| Demo scheme/beneficiary/application not found by ID | `<EmptyState>` with back link |
| BENEFICIARY accesses `/admin/beneficiaries` | `<PermissionDeniedState>` immediately (no data loaded) |
| BENEFICIARY accesses another's `/applications/:id` | `<PermissionDeniedState>` after loading and checking beneficiaryId |
| Non-BENEFICIARY accesses `/applications/new` | `<PermissionDeniedState>` without rendering form |
| `addApplication` throws | Toast error; form values preserved |
| Date range `fromDate > toDate` | Inline error on date range filter; filter not applied |

No real API errors can occur for demo data calls since they are synchronous resolved promises.

---

## Testing Strategy

PBT is **not applicable** to this feature. The modules are UI rendering, demo data display,
client-side filtering, and in-memory form submission — there are no pure functions with
large input spaces that benefit from generative testing. Example-based tests with
React Testing Library cover all requirements.

### Module mock pattern

```ts
// At the top of every page test file:
vi.mock('../../../services/demo-data.service', () => ({
  getAllSchemes: vi.fn(() => []),
  getSchemeById: vi.fn(() => undefined),
  getAllBeneficiaries: vi.fn(() => []),
  getBeneficiaryById: vi.fn(() => undefined),
  getAllApplications: vi.fn(() => []),
  getApplicationById: vi.fn(() => undefined),
  addApplication: vi.fn(),
  getStats: vi.fn(() => ({
    totalApplications: 0, pendingApplications: 0,
    approvedApplications: 0, rejectedApplications: 0,
    totalRequestedAmount: 0, applicationsByStatus: [],
    applicationsByRegionId: [], recentActivity: [],
  })),
}));
```

Each test that needs data calls `vi.mocked(getAllSchemes).mockReturnValue([...testFixtures])`.

### Role context wrapper

```tsx
function renderWithRole(ui: ReactElement, role: UserRole, overrides?: Partial<UserResponse>) {
  const user: UserResponse = {
    id: 'test-user-id', username: 'testuser', fullName: 'Test User',
    email: 'test@example.com', phone: null, active: true, role,
    regionIds: [1], createdAt: '', updatedAt: '', ...overrides,
  };
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={{ user, isAuthenticated: true, isInitializing: false, login: vi.fn(), logout: vi.fn() }}>
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
          {ui}
        </QueryClientProvider>
      </AuthContext.Provider>
    </MemoryRouter>
  );
}
```

### QueryState branch coverage

Each page test covers four states by controlling the mock:

| State | Setup | Assert |
|-------|-------|--------|
| Loading | Make service return a pending promise | Skeleton visible; no data rows |
| Empty | Service returns `[]` | Empty state message visible; no rows |
| Error | Service throws | Error message visible |
| Permission denied | Render with wrong role | Permission denied message visible; no rows |

### DemoBadge assertion

Every page test asserts exactly one element with `data-testid="demo-badge"`:
```ts
expect(screen.getAllByTestId('demo-badge')).toHaveLength(1);
```

### Role-scope filter tests

For `ApplicationListPage`, render once per role with mocked applications covering
all stages. Assert:
- Rows present match the role's scope
- Rows from other scopes are absent (by reference number)

### Form submission tests

For `SubmitApplicationPage`:
- Invalid field → inline error visible; `addApplication` not called
- Valid form → `addApplication` called once; success message with reference number visible
- Amount outside scheme range → inline error on `requestedAmount`
- Non-BENEFICIARY role → permission denied state; no form rendered

### File locations

Each page component has a `__tests__` directory adjacent to `pages/`:

```
features/dashboard/pages/__tests__/DashboardPage.test.tsx
features/schemes/pages/__tests__/SchemeListPage.test.tsx
features/schemes/pages/__tests__/SchemeDetailPage.test.tsx
features/beneficiaries/pages/__tests__/BeneficiaryListPage.test.tsx
features/beneficiaries/pages/__tests__/BeneficiaryDetailPage.test.tsx
features/beneficiaries/pages/__tests__/BeneficiaryProfilePage.test.tsx
features/applications/pages/__tests__/ApplicationListPage.test.tsx
features/applications/pages/__tests__/ApplicationDetailPage.test.tsx
features/applications/pages/__tests__/SubmitApplicationPage.test.tsx
```

---

## Route Additions

All routes listed below **already exist** in `src/app/router.tsx` from Phase 1–3 scaffolding.
No new route entries are needed. The page files referenced by the existing lazy imports
must be created:

| Route | Page file to create |
|-------|-------------------|
| `/dashboard` | `features/dashboard/pages/DashboardPage.tsx` |
| `/schemes` | `features/schemes/pages/SchemeListPage.tsx` |
| `/schemes/:id` | `features/schemes/pages/SchemeDetailPage.tsx` |
| `/applications` | `features/applications/pages/ApplicationListPage.tsx` |
| `/applications/new` | `features/applications/pages/SubmitApplicationPage.tsx` |
| `/applications/:id` | `features/applications/pages/ApplicationDetailPage.tsx` |
| `/admin/beneficiaries` | `features/beneficiaries/pages/BeneficiaryListPage.tsx` |
| `/admin/beneficiaries/:id` | `features/beneficiaries/pages/BeneficiaryDetailPage.tsx` |
| `/beneficiary/profile` | `features/beneficiaries/pages/BeneficiaryProfilePage.tsx` |

Role-alias dashboard routes (`/admin/dashboard`, `/portal/dashboard`, `/field/dashboard`,
`/district/dashboard`, `/finance/dashboard`) already point to `DashboardPage` and require
no change.
