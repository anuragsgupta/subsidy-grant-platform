# Frontend Admin — Requirements

Phase 3 of the GSDTS frontend. Builds on the merged Phase 1 (foundation) and
Phase 2 (auth) already in `main`. Integrates ONLY the REST endpoints that
exist in the backend controllers for **users, roles, regions, settings and
audit logs**. No endpoint is invented. The backend in `backend/` is read-only
reference; it is not run or modified.

All admin endpoints require `ADMIN` role (enforced server-side). Role and
region GET endpoints are open to any authenticated user. The backend is the
authorization authority; the frontend only hides/optimises UI and shows a
permission-denied state on a 403 — it never trusts a client role check as a
security boundary.

---

## Verified endpoint inventory

Response envelopes already exist in `src/types/api.types.ts`:
- `ApiResponse<T>` — `{ success, message, errorCode, data, fieldErrors, timestamp, correlationId }`.
- `PagedResponse<T>` — `{ content, currentPage, pageSize, totalElements, totalPages, last }`.

The response interceptor in `api-client.ts` already unwraps `ApiResponse.data`
and re-throws an `ApiError` (carrying `errorCode`, `message`, `fieldErrors`,
`httpStatus`). Services and pages build on that.

### Users — `UserController` `/api/v1/users` (ADMIN only)

| # | Method | Path | Body / Params | Response `data` | HTTP | Key errors |
|---|--------|------|---------------|-----------------|------|------------|
| U2 | GET | `/users` | `role?,regionId?,active?,q?,page=0,size=20(max100)` | `PagedResponse<UserSummaryResponse>` | 200 | 403 |
| U3 | GET | `/users/{id}` | — | `UserResponse` | 200 | 403,404 |
| U5 | PATCH | `/users/{id}/status` | `UserStatusRequest` | — (`Void`) | 200 | 400,403,404,422 |
| U7 | PUT | `/users/{id}/role` | `ChangeRoleRequest` | `UserResponse` | 200 | 400,403,404 |
| U8 | PUT | `/users/{id}/regions` | `ChangeRegionsRequest` | `UserResponse` | 200 | 400,403,404,422 |
| U9 | GET | `/users/{id}/roles` | — | `RoleResponse[]` | 200 | 403,404 |

**UserSummaryResponse** — `id:UUID, username, fullName, email, active:Boolean, role:String`
**UserResponse** — identical to the auth record already typed in `types/auth.ts` (`id, username, fullName, email, phone:String|null, active, role:UserRole, regionIds:number[], createdAt, updatedAt`). Reused, not redeclared.
**UserStatusRequest** — `{ active: boolean }` (NotNull)
**ChangeRoleRequest** — `{ roleId: number }` (NotNull)
**ChangeRegionsRequest** — `{ regionIds: number[] }` (NotNull)

**Deferred** (endpoints exist, NOT surfaced this phase): `POST /users` (create),
`PUT /users/{id}` (update fullName/phone), `DELETE /users/{id}`. The existing
`CreateUserPage` keeps its "coming soon" placeholder — never a fake action.

### Roles — `RoleController` `/api/v1/roles` (any authenticated, read-only)

| # | Method | Path | Response `data` | HTTP |
|---|--------|------|-----------------|------|
| R1 | GET | `/roles` | `RoleResponse[]` | 200 |
| R2 | GET | `/roles/{id}` | `RoleResponse` | 200 / 404 |
| R3 | GET | `/roles/name/{name}` | `RoleResponse` | 200 / 404 |

**RoleResponse** — `{ id:number, name:string, description:string|null, createdAt:string }`
No write endpoints exist. Used as picker reference data for role assignment.
`R2`/`R3` are available but not required for the UI (R1 suffices).

### Regions — `RegionController` `/api/v1/regions`

| # | Method | Path | Body / Params | Response `data` | HTTP | Roles | Key errors |
|---|--------|------|---------------|-----------------|------|-------|------------|
| RE1 | GET | `/regions` | `type?,parentId?` | `RegionResponse[]` | 200 | Any | — |
| RE2 | GET | `/regions/{id}` | — | `RegionResponse` | 200 | Any | 404 |
| RE3 | POST | `/regions` | `CreateRegionRequest` | `RegionResponse` | 201 | ADMIN | 400,403,409 |
| RE4 | PUT | `/regions/{id}` | `UpdateRegionRequest` | `RegionResponse` | 200 | ADMIN | 400,403,404 |

**RegionResponse** — `{ id:number, code, name, type:'STATE'|'DISTRICT', parentId:number|null }`
**RegionType** — `'STATE' | 'DISTRICT'`

**Deferred** (endpoints exist, NOT surfaced this phase): `POST /regions`
(create), `PUT /regions/{id}` (update name). The Region page is read-only
list/hierarchy. `GET /regions` also feeds the user region picker.

### Settings — `SettingController` `/api/v1/settings` (ADMIN only)

| # | Method | Path | Body | Response `data` | HTTP | Key errors |
|---|--------|------|------|-----------------|------|------------|
| S1 | GET | `/settings` | — | `SettingResponse[]` | 200 | 403 |
| S2 | PUT | `/settings/{key}` | `UpdateSettingRequest` | `SettingResponse` | 200 | 400,403,404 |

**SettingResponse** — `{ key, value, valueType:'INT'|'MONEY'|'ENUM'|'BOOL', description, updatedBy:UUID|null, createdAt, updatedAt }`
**UpdateSettingRequest** — `{ value: string }` (NotBlank). Value is validated
server-side against `valueType`.

### Audit — `AuditController` `/api/v1/audit` (ADMIN only)

| # | Method | Path | Params | Response `data` | HTTP | Key errors |
|---|--------|------|--------|-----------------|------|------------|
| AU1 | GET | `/audit` | `referenceNo?,entityType?,entityId?,actorId?(UUID),from?,to?(Instant),page=0,size=20(max100)` | `PagedResponse<AuditLogResponse>` | 200 | 403 |

Sort is fixed server-side: `occurredAt ASC, id ASC`.

**AuditLogResponse** — `{ id:number, occurredAt, actorId:UUID|null, actorRole, actorType:'USER'|'SYSTEM'|'API_CLIENT', action, entityType, entityId, referenceNo:string|null, oldValue:unknown, newValue:unknown, remark:string|null, correlationId:string|null, ipAddress:string|null }`

---

## Common UX requirements (apply to every page)

**C-1 States.** Every data page renders exactly one of: loading skeleton,
empty state (no rows), error state, permission-denied state. List pages also
render pagination controls.

**C-2 Error normalisation.** All services throw the existing `ApiError`
(`api-client.ts`). Pages branch on `errorCode`/`httpStatus`, never on raw axios
errors.

**C-3 Permission-denied.** When a query/mutation returns
`errorCode === 'ACCESS_DENIED'` (HTTP 403), the page renders a
permission-denied state ("You do not have permission to view this section") —
not a generic error.

**C-4 Backend not available.** When a query fails with a network error (no
response) or `errorCode === 'INTERNAL_ERROR'`, the page renders a "Backend not
available — unable to reach the server" state with a Retry button. This is
distinct from the empty state. No in-scope page fakes data.

**C-5 Confirmation dialogs.** Status change, role assignment and region
assignment each open an `AlertDialog` summarising the action and requiring an
explicit confirm before the mutation fires. Cancel does nothing.

**C-6 Toasts.** Successful mutations show a success toast (`sonner`); failed
mutations show an error toast with `ApiError.message`.

**C-7 No inline API calls.** Pages never call Axios directly; they use the
feature service + TanStack Query hooks.

**C-8 Reference-data staleness.** Roles and regions use `staleTime` ≥ 5 min;
user/audit/settings data use the default 30 s (`providers.tsx`).

**C-9 Filters & params.** Optional params are omitted (not sent as empty) so
the backend applies no filter. `active` is sent as a boolean. Date filters use
native date inputs serialised as ISO-8601 (`from` = start-of-day, `to` =
end-of-day). `actorId` is UUID-validated client-side before sending.

---

## R-1 User management

**R-1.1 List page** (`/admin/users`, `UserListPage`): server-side paginated
table from `GET /users`. Columns: Full name, Username, Email, Role, Status
(active/inactive badge). Controls: search box (`q`, debounced), role filter
(select from `GET /roles`), active filter (All/Active/Inactive), page-size
select, pagination. Any filter change resets to page 0. Clicking a row opens
the detail page.

**R-1.2 Detail page** (`/admin/users/:id`, `UserDetailPage`): `GET /users/{id}`
profile view showing username, full name, email, phone, active status, role,
bound regions (names resolved from `GET /regions`), and created/updated dates.
Also surfaces `GET /users/{id}/roles` as a read-only "Assigned role(s)" list.

**R-1.3 Status change** (on the detail page): an Activate/Deactivate button
opens a confirmation `AlertDialog` stating the target action; confirm calls
`PATCH /users/{id}/status` with `{ active }`. On success: toast + refetch
user. On `404`: "User not found". On `422`/`400`: inline message.

**R-1.4 Role assignment** (on the detail page): "Change role" opens a dialog
with a select populated by `GET /roles`; confirm calls `PUT /users/{id}/role`
with `{ roleId }`. On success: toast + refetch.

**R-1.5 Region assignment** (on the detail page): "Manage regions" opens a
dialog with a multi-select of regions (`GET /regions`); confirm calls
`PUT /users/{id}/regions` with `{ regionIds }`. A `422 INVALID_REGION_BINDING`
or `BUSINESS_RULE` error is shown inline in the dialog. On success: toast +
refetch.

**R-1.6 Validation.** Zod schemas (Design §5) guard the dialogs: `active`
boolean; `roleId` positive integer; `regionIds` non-empty number array.
`400 VALIDATION_FAILED` `fieldErrors` map back onto the active form.

---

## R-2 Roles (reference data)

**R-2.1** `role.service.ts` exposes `listRoles()`, `getRole(id)`,
`getRoleByName(name)` — all unwrapping `ApiResponse.data`.
**R-2.2** `useRolesQuery` caches the role list for the user role picker.
**R-2.3** Types `RoleResponse` live in `features/roles/types`. No Zod form
schema (read-only). No dedicated Roles page this phase.

---

## R-3 Regions

**R-3.1 List page** (`/admin/regions`, `RegionListPage`): read-only table from
`GET /regions` with a `type` filter (`STATE`/`DISTRICT`/All). Columns: Code,
Name, Type, Parent (resolved name via `parentId`).

**R-3.2 Hierarchy.** Regions are rendered as a hierarchy: STATE rows first,
then their DISTRICT children indented beneath. The tree is built client-side
from `parentId`; a flat sorted table with a "Parent" column is an acceptable
fallback, but the parent→child grouping must be derivable.

**R-3.3** `region.service.ts` exposes `listRegions(params)`, `getRegion(id)`.
`useRegionsQuery(params)` and `useRegionQuery(id)`.

**R-3.4** The region multi-select in the user region-assignment dialog reuses
`useRegionsQuery`.

---

## R-4 System settings

**R-4.1 Page** (`/admin/settings`, `SettingsPage`): read-only list from
`GET /settings` showing key, value, type, description, last-updated. Each row
has an "Edit" action.

**R-4.2 Inline edit.** "Edit" opens a dialog with a single `value` field whose
Zod validation depends on `valueType` (Design §5.3): INT → integer string;
MONEY → decimal string; BOOL → 'true'/'false' (toggle); ENUM → non-empty
string. Confirm calls `PUT /settings/{key}` with `{ value }`.

**R-4.3** On success: toast + refetch settings list. On `404`: "Setting not
found". On `400 VALIDATION_FAILED`: inline field error.

---

## R-5 Audit logs

**R-5.1 Page** (`/admin/audit`, `AuditLogPage`): read-only paginated table from
`GET /audit`. Sort is server-fixed; the table has no client sort.

**R-5.2 Filters** (`AuditFilters`): reference number (`referenceNo`, text),
entity type (`entityType`, text), entity id (`entityId`, text), actor
(`actorId`, UUID-validated text), date range (`from`, `to` — native date
inputs). Changing any filter resets to page 0. A "Clear filters" button resets
all.

**R-5.3 Columns**: Occurred at, Actor (id + role), Actor type, Action, Entity
(type + id), Reference no. Pagination at the bottom.

**R-5.4 Details view**: clicking a row opens a `Dialog` showing the full
`AuditLogResponse`, including `oldValue`/`newValue` rendered as pretty JSON
(`<pre>`), plus `remark`, `correlationId`, `ipAddress`, `actorType`, `actorId`,
`occurredAt`. The dialog is read-only.

**R-5.5** Empty state: "No audit entries match the filters." Error/permission
states per C-1..C-4.

---

## R-6 Tests (Vitest + RTL, mocked API)

All tests mock the feature service (`vi.mock`) or the axios instance
(`axios-mock-adapter`); no real backend.

- **R-6.1** `user.service.test.ts` — list/get/roles/status/role/regions calls
  send correct URLs, params and bodies; unwrap `data`.
- **R-6.2** `UserListPage.test.tsx` — renders rows, search debounces and
  resets page, role/active filter changes reset page, pagination, empty +
  error + permission-denied states.
- **R-6.3** `UserDetailPage.test.tsx` — loads user, shows regions by name,
  status-change confirmation → success toast + refetch, role + region
  assignment dialogs, 404 state.
- **R-6.4** `SettingsPage.test.tsx` — lists settings, edit dialog validates by
  `valueType`, success refetch, 404/400 states.
- **R-6.5** `RegionListPage.test.tsx` — type filter, hierarchy rendering,
  empty/error states.
- **R-6.6** `AuditLogPage.test.tsx` — filters drive query params, pagination,
  row → details dialog with JSON, empty/error/permission states.
- **R-6.7** `role.service` / `region.service` / `setting.service` /
  `audit.service` tests — correct URLs + unwrapping.

---

## Out of scope (this phase)

- Create / edit / delete user forms (endpoints exist; pages stay placeholder).
- Create / edit region forms (endpoints exist; page stays read-only).
- Dashboard, schemes, beneficiaries, applications (Phase 4, demo data).
- Eligibility / verification / disbursement / compliance / analytics.
