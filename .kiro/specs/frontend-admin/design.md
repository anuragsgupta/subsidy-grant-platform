# Frontend Admin — Design

Conventions match the existing code: services use the central `apiClient`
(which unwraps `ApiResponse.data` and throws `ApiError`), types mirror the
backend records exactly, and TanStack Query owns server state. All admin
endpoints require `ADMIN`; non-ADMIN callers get a 403 the page renders as a
permission-denied state.

---

## 1. File map (new / changed)

```
src/
├── components/states/                 # shared query-state components (C-1..C-4)
│   ├── QueryState.tsx                 # resolves loading/empty/error/permission
│   ├── LoadingSkeleton.tsx
│   ├── EmptyState.tsx
│   ├── ErrorState.tsx                 # "Backend not available" + Retry (C-4)
│   └── PermissionDeniedState.tsx
│
├── features/
│   ├── users/
│   │   ├── pages/UserListPage.tsx        (replace placeholder)
│   │   ├── pages/UserDetailPage.tsx      (replace placeholder)
│   │   ├── components/UserTable.tsx
│   │   ├── components/UserFilters.tsx
│   │   ├── components/StatusChangeDialog.tsx
│   │   ├── components/ChangeRoleDialog.tsx
│   │   ├── components/ChangeRegionsDialog.tsx
│   │   ├── hooks/useUsers.ts
│   │   ├── services/user.service.ts
│   │   ├── schemas/user.schema.ts
│   │   └── types/user.types.ts
│   ├── roles/
│   │   ├── hooks/useRoles.ts
│   │   ├── services/role.service.ts
│   │   └── types/role.types.ts
│   ├── regions/
│   │   ├── pages/RegionListPage.tsx      (replace placeholder)
│   │   ├── components/RegionTable.tsx
│   │   ├── components/RegionTree.tsx
│   │   ├── hooks/useRegions.ts
│   │   ├── services/region.service.ts
│   │   ├── schemas/region.schema.ts
│   │   └── types/region.types.ts
│   ├── settings/
│   │   ├── pages/SettingsPage.tsx        (replace placeholder)
│   │   ├── components/SettingRow.tsx
│   │   ├── components/EditSettingDialog.tsx
│   │   ├── hooks/useSettings.ts
│   │   ├── services/setting.service.ts
│   │   ├── schemas/setting.schema.ts
│   │   └── types/setting.types.ts
│   └── audit/
│       ├── pages/AuditLogPage.tsx        (replace placeholder)
│       ├── components/AuditTable.tsx
│       ├── components/AuditFilters.tsx
│       ├── components/AuditDetailDialog.tsx
│       ├── hooks/useAuditLogs.ts
│       ├── services/audit.service.ts
│       ├── schemas/audit.schema.ts
│       └── types/audit.types.ts
│
└── app/router.tsx                        (no new routes; optional ADMIN guard)
```

`CreateUserPage.tsx` stays a placeholder (out of scope).

---

## 2. Types

```ts
// features/users/types/user.types.ts
import type { UserRole } from '../../../types/auth';
export interface UserSummaryResponse {
  id: string; username: string; fullName: string; email: string;
  active: boolean; role: UserRole | null;
}
// UserResponse is reused from src/types/auth.ts (same backend record).
export interface UserStatusRequest { active: boolean; }
export interface ChangeRoleRequest { roleId: number; }
export interface ChangeRegionsRequest { regionIds: number[]; }
export interface UserListParams {
  role?: string; regionId?: number; active?: boolean;
  q?: string; page?: number; size?: number;
}

// features/roles/types/role.types.ts
export interface RoleResponse {
  id: number; name: string; description: string | null; createdAt: string;
}

// features/regions/types/region.types.ts
export type RegionType = 'STATE' | 'DISTRICT';
export interface RegionResponse {
  id: number; code: string; name: string; type: RegionType; parentId: number | null;
}
export interface RegionListParams { type?: RegionType; parentId?: number; }

// features/settings/types/setting.types.ts
export type SettingValueType = 'INT' | 'MONEY' | 'ENUM' | 'BOOL';
export interface SettingResponse {
  key: string; value: string; valueType: SettingValueType;
  description: string | null; updatedBy: string | null;
  createdAt: string; updatedAt: string;
}
export interface UpdateSettingRequest { value: string; }

// features/audit/types/audit.types.ts
export type ActorType = 'USER' | 'SYSTEM' | 'API_CLIENT';
export interface AuditLogResponse {
  id: number; occurredAt: string; actorId: string | null; actorRole: string | null;
  actorType: ActorType; action: string; entityType: string; entityId: string;
  referenceNo: string | null; oldValue: unknown; newValue: unknown;
  remark: string | null; correlationId: string | null; ipAddress: string | null;
}
export interface AuditQueryParams {
  referenceNo?: string; entityType?: string; entityId?: string; actorId?: string;
  from?: string; to?: string; page?: number; size?: number;
}
```

---

## 3. Services

Each service uses `apiClient` (already unwraps `ApiResponse.data`) and
returns typed data. Optional params are omitted when undefined.

```ts
// features/users/services/user.service.ts
listUsers(params: UserListParams): Promise<PagedResponse<UserSummaryResponse>> // GET /users
getUser(id: string): Promise<UserResponse>                  // GET /users/{id}
getUserRoles(id: string): Promise<RoleResponse[]>          // GET /users/{id}/roles
setStatus(id: string, active: boolean): Promise<void>       // PATCH /users/{id}/status  (data: null)
changeRole(id: string, roleId: number): Promise<UserResponse>        // PUT /users/{id}/role
changeRegions(id: string, regionIds: number[]): Promise<UserResponse>// PUT /users/{id}/regions

// features/roles/services/role.service.ts
listRoles(): Promise<RoleResponse[]>            // GET /roles
getRole(id: number): Promise<RoleResponse>      // GET /roles/{id}
getRoleByName(name: string): Promise<RoleResponse> // GET /roles/name/{name}

// features/regions/services/region.service.ts
listRegions(params?: RegionListParams): Promise<RegionResponse[]> // GET /regions
getRegion(id: number): Promise<RegionResponse>                      // GET /regions/{id}

// features/settings/services/setting.service.ts
getAllSettings(): Promise<SettingResponse[]>               // GET /settings
updateSetting(key: string, value: string): Promise<SettingResponse> // PUT /settings/{key}

// features/audit/services/audit.service.ts
queryAudit(params: AuditQueryParams): Promise<PagedResponse<AuditLogResponse>> // GET /audit
```

`setStatus` returns 200 with `ApiResponse<Void>` (`data: null`); the service
returns `Promise<void>`.

---

## 4. Hooks & query keys

```ts
// features/users/hooks/useUsers.ts
export const userKeys = {
  all: ['users'] as const,
  list: (p: UserListParams) => ['users', 'list', p] as const,
  detail: (id: string) => ['users', 'detail', id] as const,
  roles: (id: string) => ['users', 'roles', id] as const,
};
useUsersQuery(params)                 // useQuery({ queryKey: userKeys.list(params), queryFn: () => userService.listUsers(params) })
useUserQuery(id)                      // enabled: !!id
useUserRolesQuery(id)                  // GET /users/{id}/roles
useSetUserStatusMutation()             // invalidate userKeys.detail + .list
useChangeUserRoleMutation()            // invalidate userKeys.detail + .list
useChangeUserRegionsMutation()         // invalidate userKeys.detail + .list

// features/roles/hooks/useRoles.ts   (staleTime: 5 * 60_000)
export const roleKeys = { all: ['roles'], list: ['roles', 'list'], detail: (id) => ['roles', id] };
useRolesQuery()

// features/regions/hooks/useRegions.ts  (staleTime: 5 * 60_000)
export const regionKeys = { all: ['regions'], list: (p) => ['regions', p], detail: (id) => ['regions', id] };
useRegionsQuery(params?)  useRegionQuery(id)

// features/settings/hooks/useSettings.ts
export const settingKeys = { all: ['settings'], list: ['settings', 'list'] };
useSettingsQuery()  useUpdateSettingMutation()   // invalidate settingKeys.list

// features/audit/hooks/useAuditLogs.ts
export const auditKeys = { all: ['audit'], list: (p) => ['audit', p] };
useAuditLogsQuery(params)
```

Mutations call `queryClient.invalidateQueries` on the relevant list key after
success, then show a success toast; on error they show an error toast and let
the dialog keep the `ApiError` for inline display.

---

## 5. Zod schemas

```ts
// features/users/schemas/user.schema.ts
export const setStatusSchema = z.object({ active: z.boolean() });
export const changeRoleSchema = z.object({ roleId: z.number().int().positive('Select a role') });
export const changeRegionsSchema = z.object({
  regionIds: z.array(z.number().int().positive()).min(1, 'Select at least one region'),
});

// features/regions/schemas/region.schema.ts  (query params only)
export const regionListParamsSchema = z.object({
  type: z.enum(['STATE', 'DISTRICT']).optional(),
  parentId: z.number().optional(),
});

// features/settings/schemas/setting.schema.ts  (per valueType)
export function updateSettingSchema(valueType: SettingValueType) {
  const value =
    valueType === 'INT'   ? z.string().regex(/^-?\d+$/, 'Must be a whole number')
  : valueType === 'MONEY' ? z.string().regex(/^-?\d+(\.\d{1,2})?$/, 'Must be a valid amount')
  : valueType === 'BOOL'  ? z.enum(['true', 'false'])
  :                         z.string().min(1, 'Value is required'); // ENUM
  return z.object({ value });
}

// features/audit/schemas/audit.schema.ts
export const auditQuerySchema = z.object({
  referenceNo: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  actorId: z.string().uuid('Invalid UUID').optional().or(z.literal('')),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.number().int().min(0).default(0),
  size: z.number().int().min(1).max(100).default(20),
});
```

`400 VALIDATION_FAILED` `fieldErrors` are merged into the active form via
`setError(field, { message })` (same pattern as the Phase 2 register form).

---

## 6. Shared state handling (`components/states/QueryState.tsx`)

```tsx
function QueryState({ isLoading, isError, error, isEmpty, onRetry, skeleton, empty, children }) {
  if (isLoading) return <LoadingSkeleton rows={skeleton} />;
  if (isError) {
    const code = (error as ApiError | undefined)?.errorCode;
    if (code === 'ACCESS_DENIED') return <PermissionDeniedState />;
    return <ErrorState onRetry={onRetry} />;   // network / INTERNAL_ERROR → "Backend not available"
  }
  if (isEmpty) return <EmptyState message={empty} />;
  return children;
}
```

Each page wraps its table in `<QueryState>` driven by its query's
`isLoading` / `isError` / `error` and a derived `isEmpty` (e.g. `totalElements
=== 0`). `onRetry` calls `refetch()`.

---

## 7. Confirmation & assignment dialogs

All three use the existing `dialog.tsx` (Radix) as an `AlertDialog`:

- **StatusChangeDialog** — shows "Activate / Deactivate <fullName>?" and the
  new status; confirm → `useSetUserStatusMutation.mutate({ id, active })`.
- **ChangeRoleDialog** — `Select` of roles from `useRolesQuery`; confirm →
  `useChangeUserRoleMutation.mutate({ id, roleId })`.
- **ChangeRegionsDialog** — multi-select (checkboxes) of regions from
  `useRegionsQuery`; confirm → `useChangeUserRegionsMutation.mutate({ id,
  regionIds })`.

Each dialog is `Form`-driven (`react-hook-form` + `zodResolver`) so client
validation runs before the call. A `422`/`BUSINESS_RULE`/`VALIDATION_FAILED`
error is shown as an inline `Alert` inside the dialog and the dialog stays
open. Success closes the dialog and invalidates the user detail/list.

---

## 8. Region hierarchy

`buildRegionTree(regions: RegionResponse[])` groups districts under their
state: returns `[{ ...state, children: districtsOf(state) }]`. `RegionTree`
renders states with their districts indented. When the `type` filter is
`DISTRICT` (no states shown), fall back to a flat list. The "Parent" column
shows the resolved parent name via a `Map<id, RegionResponse>`.

---

## 9. Audit details JSON

`AuditDetailDialog` renders `oldValue`/`newValue` via
`JSON.stringify(value, null, 2)` inside `<pre className="...overflow-x-auto">`.
If a value is `null`/`undefined`, render "—". The dialog title is
`${action} on ${entityType}`. All fields are read-only.

Filters serialise as query params: empty strings are dropped; `from` is sent
as `${date}T00:00:00Z`, `to` as `${date}T23:59:59Z`; `actorId` is validated by
the Zod schema before submit.

---

## 10. Test plan

| Test file | Scope | Mocking |
|-----------|-------|---------|
| `user.service.test.ts` | URLs, params, bodies, unwrapping | `axios-mock-adapter` on `apiClient` |
| `UserListPage.test.tsx` | rows, debounce, filter resets page, pagination, states | `vi.mock` service + `QueryClientProvider` |
| `UserDetailPage.test.tsx` | load, region names, 3 dialogs, 404 | same |
| `SettingsPage.test.tsx` | list, edit-by-type validation, 404/400 | same |
| `RegionListPage.test.tsx` | type filter, hierarchy, empty/error | same |
| `AuditLogPage.test.tsx` | filters→params, pagination, details JSON, states | same |
| `role/region/setting/audit.service.test.ts` | correct URLs + unwrapping | `axios-mock-adapter` |

Pages are tested by mocking the feature service module so TanStack Query
runs against stubbed promises, wrapped in a fresh `QueryClient` with
`retry: false`. No real HTTP is called.
