# GSDTS Frontend Analysis

**Prepared from backend inspection — do not write frontend code until this document is approved.**

Base package: `com.govgrants.subsidygrant`  
API prefix: `/api/v1`  
JWT: HS256, 30-minute expiry, `Authorization: Bearer <token>` header  
Response envelope: `ApiResponse<T>` and `PagedResponse<T>` (see §1.6)

---

## 1. API Inventory

Only endpoints that exist in source-code controllers are listed here.
Modules whose REST APIs are not yet implemented are called out in §1.7.

---

### 1.1 Auth — `AuthController` (`/api/v1/auth`)

| # | Method | Path | Auth required | Roles | Request body | Response `data` | Success HTTP | Key errors |
|---|--------|------|---------------|-------|--------------|-----------------|--------------|------------|
| A1 | POST | `/auth/register` | No | — | `RegisterRequest` | `UserResponse` | 201 | 409 `DUPLICATE_RESOURCE`, 422 `VALIDATION_FAILED` |
| A2 | POST | `/auth/login` | No | — | `LoginRequest` | `TokenResponse` | 200 | 401 `UNAUTHENTICATED`, 429 `TOO_MANY_ATTEMPTS` |
| A3 | GET | `/auth/me` | Yes | Any | — | `UserResponse` | 200 | 401, 404 |

**RegisterRequest fields**

| Field | Type | Constraints |
|-------|------|-------------|
| `username` | String | 4–50, `^[a-zA-Z0-9._-]+$` |
| `password` | String | 8–72, ≥1 letter AND ≥1 digit |
| `fullName` | String | 2–150 |
| `email` | String | valid email |
| `phone` | String? | `^(\+91)?[6-9]\d{9}$`, optional |

**LoginRequest fields**

| Field | Type |
|-------|------|
| `username` | String (NotBlank) |
| `password` | String (NotBlank) |

**TokenResponse fields**

| Field | Type | Notes |
|-------|------|-------|
| `accessToken` | String | Compact HS256 JWT |
| `tokenType` | String | Always `"Bearer"` |
| `expiresAt` | Instant | ISO-8601 UTC timestamp |

**UserResponse fields** (returned by register, me, and user endpoints)

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | |
| `username` | String | |
| `fullName` | String | |
| `email` | String | |
| `phone` | String? | |
| `active` | Boolean | |
| `role` | String? | Single role name, e.g. `"BENEFICIARY"` |
| `regionIds` | `List<Long>` | Bound region IDs |
| `createdAt` | Instant | |
| `updatedAt` | Instant | |

---

### 1.2 Users — `UserController` (`/api/v1/users`)

All endpoints require `ADMIN` role.

| # | Method | Path | Request body | Response `data` | Success HTTP | Key errors |
|---|--------|------|--------------|-----------------|--------------|------------|
| U1 | POST | `/users` | `CreateUserRequest` | `UserResponse` | 201 | 400, 409, 422 `INVALID_REGION_BINDING` |
| U2 | GET | `/users` | — | `PagedResponse<UserSummaryResponse>` | 200 | — |
| U3 | GET | `/users/{id}` | — | `UserResponse` | 200 | 404 |
| U4 | PUT | `/users/{id}` | `UpdateUserRequest` | `UserResponse` | 200 | 400, 404 |
| U5 | PATCH | `/users/{id}/status` | `UserStatusRequest` | — (`Void`) | 200 | 400, 404, 422 |
| U6 | DELETE | `/users/{id}` | — | — | 204 | 409 `RESOURCE_IN_USE` |
| U7 | PUT | `/users/{id}/role` | `ChangeRoleRequest` | `UserResponse` | 200 | 400, 404 |
| U8 | PUT | `/users/{id}/regions` | `ChangeRegionsRequest` | `UserResponse` | 200 | 400, 404, 422 |
| U9 | GET | `/users/{id}/roles` | — | `List<RoleResponse>` | 200 | 404 |

**CreateUserRequest**

| Field | Type | Constraints |
|-------|------|-------------|
| `username` | String | 4–50, `^[a-zA-Z0-9._-]+$` |
| `password` | String | 8–72 |
| `fullName` | String | 2–150 |
| `email` | String | valid email |
| `phone` | String? | `^(\+91)?[6-9]\d{9}$` |
| `roleId` | Long | NotNull |
| `regionIds` | `List<Long>` | NotNull |

**UpdateUserRequest** — `fullName` (2–150, required), `phone` (optional)

**UserStatusRequest** — `active: Boolean` (NotNull)

**ChangeRoleRequest** — `roleId: Long` (NotNull)

**ChangeRegionsRequest** — `regionIds: List<Long>` (NotNull)

**Query params for GET `/users`**

| Param | Type | Notes |
|-------|------|-------|
| `role` | String? | Filter by role name |
| `regionId` | Long? | Filter by region |
| `active` | Boolean? | Filter by status |
| `q` | String? | Name or email contains |
| `page` | int | Default 0 |
| `size` | int | Default 20, max 100 |

**UserSummaryResponse** — `id`, `username`, `fullName`, `email`, `active`, `role`

---

### 1.3 Roles — `RoleController` (`/api/v1/roles`)

All endpoints require authentication. No write endpoints exist.

| # | Method | Path | Response `data` | Success HTTP | Key errors |
|---|--------|------|-----------------|--------------|------------|
| R1 | GET | `/roles` | `List<RoleResponse>` | 200 | — |
| R2 | GET | `/roles/{id}` | `RoleResponse` | 200 | 404 |
| R3 | GET | `/roles/name/{name}` | `RoleResponse` | 200 | 404 |

**RoleResponse** — `id: Long`, `name: String`, `description: String?`, `createdAt: Instant`

---

### 1.4 Regions — `RegionController` (`/api/v1/regions`)

GET endpoints: any authenticated user. POST/PUT: ADMIN only.

| # | Method | Path | Request body | Response `data` | Success HTTP | Key errors |
|---|--------|------|--------------|-----------------|--------------|------------|
| RE1 | GET | `/regions` | — | `List<RegionResponse>` | 200 | — |
| RE2 | GET | `/regions/{id}` | — | `RegionResponse` | 200 | 404 |
| RE3 | POST | `/regions` | `CreateRegionRequest` | `RegionResponse` | 201 | 400, 403, 409 |
| RE4 | PUT | `/regions/{id}` | `UpdateRegionRequest` | `RegionResponse` | 200 | 400, 403, 404 |

**Query params for GET `/regions`** — `type: RegionType?` (`STATE`|`DISTRICT`), `parentId: Long?`

**CreateRegionRequest** — `code` (2–20, `^[A-Z0-9_-]{2,20}$`), `name` (≤100), `type` (`STATE`|`DISTRICT`), `parentId` (required for DISTRICT)

**UpdateRegionRequest** — `name` (≤100, required) — code and type are immutable

**RegionResponse** — `id: Long`, `code`, `name`, `type`, `parentId: Long?`

---

### 1.5 Settings — `SettingController` (`/api/v1/settings`)

Both endpoints require `ADMIN` role.

| # | Method | Path | Request body | Response `data` | Success HTTP | Key errors |
|---|--------|------|--------------|-----------------|--------------|------------|
| S1 | GET | `/settings` | — | `List<SettingResponse>` | 200 | 403 |
| S2 | PUT | `/settings/{key}` | `UpdateSettingRequest` | `SettingResponse` | 200 | 400, 403, 404 |

**UpdateSettingRequest** — `value: String` (NotBlank)

**SettingResponse** — `key`, `value`, `valueType` (`INT`|`MONEY`|`ENUM`|`BOOL`), `description`, `updatedBy: UUID?`, `createdAt`, `updatedAt`

Seeded keys: `risk.low.minScore`, `risk.low.maxAmount`, `risk.medium.minScore`, `risk.medium.maxAmount`, `compliance.graceDays`, `analytics.agingThresholdDays`, `treasury.mode`, `beneficiaryRegistry.verifyOnRegister`, `auth.maxFailedLogins`, `auth.lockMinutes`

---

### 1.6 Audit — `AuditController` (`/api/v1/audit`)

Requires `ADMIN` role.

| # | Method | Path | Response `data` | Success HTTP | Key errors |
|---|--------|------|-----------------|--------------|------------|
| AU1 | GET | `/audit` | `PagedResponse<AuditLogResponse>` | 200 | 403 |

**Query params**

| Param | Type |
|-------|------|
| `referenceNo` | String? |
| `entityType` | String? |
| `entityId` | String? |
| `actorId` | UUID? |
| `from` | Instant? |
| `to` | Instant? |
| `page` | int (default 0) |
| `size` | int (default 20, max 100) |

Sort: `occurredAt ASC, id ASC`

**AuditLogResponse** — `id: Long`, `occurredAt`, `actorId: UUID?`, `actorRole`, `actorType` (`USER`|`SYSTEM`|`API_CLIENT`), `action`, `entityType`, `entityId`, `referenceNo?`, `oldValue: Object?`, `newValue: Object?`, `remark?`, `correlationId?`, `ipAddress?`

---

### 1.6 Standard response envelopes

**`ApiResponse<T>`** (all endpoints)

```json
{
  "success": true,
  "message": "...",
  "errorCode": null,
  "data": { ... },
  "fieldErrors": null,
  "timestamp": "2025-01-01T00:00:00Z",
  "correlationId": "..."
}
```

On error, `success` is `false`, `errorCode` is populated, `data` is `null`.
Validation errors include `fieldErrors: [{ field, message }]`.

**`PagedResponse<T>`** (list endpoints)

```json
{
  "content": [ ... ],
  "currentPage": 0,
  "pageSize": 20,
  "totalElements": 142,
  "totalPages": 8,
  "last": false
}
```

---

### 1.7 Backend modules NOT yet implemented (no REST controller exists)

The following modules have entities and/or repositories but no REST controllers:

| Module | Backend status | Frontend impact |
|--------|---------------|-----------------|
| Beneficiaries | Entity + repo only (old schema, pre-v2 columns) | No real API — demo data needed |
| Schemes | Entity + repo only (old schema) | No real API — demo data needed |
| Applications | Entity + repo only (old schema, pre-v2 statuses) | No real API — demo data needed |
| Eligibility | Not implemented | Placeholder UI only |
| Verification | Not implemented | Placeholder UI only |
| Disbursement | Not implemented | Placeholder UI only |
| Compliance | Not implemented | Placeholder UI only |
| Analytics | Not implemented | Placeholder UI only |
| Integration | Not implemented | Not visible in UI |

> **Note on legacy enums:** The `ApplicationStatus` and `Beneficiary` entity in the existing
> `entity/` and `enums/` packages reflect the old DB-001 schema (statuses: DRAFT, SUBMITTED,
> UNDER_REVIEW, CLARIFICATION_REQUIRED, FIELD_VERIFIED, DISTRICT_APPROVED, FINANCE_APPROVED,
> REJECTED, DISBURSEMENT_IN_PROGRESS, COMPLETED, ON_HOLD). The requirements spec (§6.1) defines
> a different v2 status set. These legacy classes have no REST controllers. The frontend must
> not integrate them as real APIs.

---

## 2. Role and Permission Matrix

### 2.1 Seeded roles (immutable, from migration)

| ID | Name | Description |
|----|------|-------------|
| 1 | BENEFICIARY | Citizen applying for subsidies |
| 2 | FIELD_OFFICER | On-ground verification officer, bound to one DISTRICT |
| 3 | DISTRICT_OFFICER | District-level review and approval, bound to one DISTRICT |
| 4 | FINANCE_APPROVER | Financial authorization, bound to one or more regions |
| 5 | ADMIN | Global administrative access |

### 2.2 Permission matrix for implemented endpoints

| Endpoint | BENEFICIARY | FIELD_OFFICER | DISTRICT_OFFICER | FINANCE_APPROVER | ADMIN |
|----------|:-----------:|:-------------:|:----------------:|:----------------:|:-----:|
| POST `/auth/register` | ✔ (self) | ✔ | ✔ | ✔ | ✔ |
| POST `/auth/login` | ✔ | ✔ | ✔ | ✔ | ✔ |
| GET `/auth/me` | ✔ | ✔ | ✔ | ✔ | ✔ |
| GET `/roles` | ✔ | ✔ | ✔ | ✔ | ✔ |
| GET `/roles/{id}` | ✔ | ✔ | ✔ | ✔ | ✔ |
| GET `/roles/name/{name}` | ✔ | ✔ | ✔ | ✔ | ✔ |
| GET `/regions` | ✔ | ✔ | ✔ | ✔ | ✔ |
| GET `/regions/{id}` | ✔ | ✔ | ✔ | ✔ | ✔ |
| POST `/regions` | ✖ | ✖ | ✖ | ✖ | ✔ |
| PUT `/regions/{id}` | ✖ | ✖ | ✖ | ✖ | ✔ |
| POST `/users` | ✖ | ✖ | ✖ | ✖ | ✔ |
| GET `/users` | ✖ | ✖ | ✖ | ✖ | ✔ |
| GET `/users/{id}` | ✖ | ✖ | ✖ | ✖ | ✔ |
| PUT `/users/{id}` | ✖ | ✖ | ✖ | ✖ | ✔ |
| PATCH `/users/{id}/status` | ✖ | ✖ | ✖ | ✖ | ✔ |
| DELETE `/users/{id}` | ✖ | ✖ | ✖ | ✖ | ✔ |
| PUT `/users/{id}/role` | ✖ | ✖ | ✖ | ✖ | ✔ |
| PUT `/users/{id}/regions` | ✖ | ✖ | ✖ | ✖ | ✔ |
| GET `/users/{id}/roles` | ✖ | ✖ | ✖ | ✖ | ✔ |
| GET `/settings` | ✖ | ✖ | ✖ | ✖ | ✔ |
| PUT `/settings/{key}` | ✖ | ✖ | ✖ | ✖ | ✔ |
| GET `/audit` | ✖ | ✖ | ✖ | ✖ | ✔ |

### 2.3 Role-based navigation summary

| Nav area | BENEFICIARY | FIELD_OFFICER | DISTRICT_OFFICER | FINANCE_APPROVER | ADMIN |
|----------|:-----------:|:-------------:|:----------------:|:----------------:|:-----:|
| Dashboard | Personal portal | Work queue | District queue | Finance queue | System overview |
| Schemes | Browse (demo) | Browse (demo) | Browse (demo) | Browse (demo) | Manage (demo) |
| Applications | Own only (demo) | Assigned (demo) | District scope (demo) | Scope (demo) | All (demo) |
| Users | ✖ | ✖ | ✖ | ✖ | ✔ real |
| Regions | Read-only (real) | Read-only (real) | Read-only (real) | Read-only (real) | Manage (real) |
| Settings | ✖ | ✖ | ✖ | ✖ | ✔ real |
| Audit Logs | ✖ | ✖ | ✖ | ✖ | ✔ real |

---

## 3. Frontend Page and Route Map

### 3.1 Public routes (no auth required)

| Route | Page | Purpose |
|-------|------|---------|
| `/login` | `LoginPage` | Username/password, JWT retrieval |
| `/register` | `RegisterPage` | Beneficiary self-registration |

### 3.2 Protected routes (all require valid JWT)

Role abbreviations: BEN = BENEFICIARY, FO = FIELD_OFFICER, DO = DISTRICT_OFFICER, FA = FINANCE_APPROVER, ADM = ADMIN

#### Shared / role-aware

| Route | Page | Roles | Backend |
|-------|------|-------|---------|
| `/` → redirect | — | All | — |
| `/dashboard` | `DashboardPage` | All (role-specific view) | Demo data only |
| `/profile` | `ProfilePage` | All | GET `/auth/me` (real) |

#### ADMIN-only

| Route | Page | Backend |
|-------|------|---------|
| `/admin/users` | `UserListPage` | GET `/users` (real) |
| `/admin/users/new` | `CreateUserPage` | POST `/users` (real) |
| `/admin/users/:id` | `UserDetailPage` | GET `/users/:id` (real) |
| `/admin/users/:id/edit` | `EditUserPage` | PUT `/users/:id` (real) |
| `/admin/regions` | `RegionListPage` | GET `/regions` (real) |
| `/admin/regions/new` | `CreateRegionPage` | POST `/regions` (real) |
| `/admin/regions/:id/edit` | `EditRegionPage` | PUT `/regions/:id` (real) |
| `/admin/settings` | `SettingsPage` | GET/PUT `/settings` (real) |
| `/admin/audit` | `AuditLogPage` | GET `/audit` (real) |

#### Schemes (demo — no backend controller)

| Route | Page | Backend |
|-------|------|---------|
| `/schemes` | `SchemeListPage` | Demo data |
| `/schemes/:id` | `SchemeDetailPage` | Demo data |
| `/admin/schemes/new` | `CreateSchemePage` (ADM only) | Demo / coming soon |
| `/admin/schemes/:id/edit` | `EditSchemePage` (ADM only) | Demo / coming soon |

#### Beneficiaries (demo — no backend controller)

| Route | Page | Roles | Backend |
|-------|------|-------|---------|
| `/beneficiary/profile` | `BeneficiaryProfilePage` | BEN | Demo |
| `/admin/beneficiaries` | `BeneficiaryListPage` | ADM, DO, FA | Demo |
| `/admin/beneficiaries/:id` | `BeneficiaryDetailPage` | ADM, DO, FA, FO | Demo |

#### Applications (demo — no backend controller)

| Route | Page | Roles | Backend |
|-------|------|-------|---------|
| `/applications` | `ApplicationListPage` | FO, DO, FA, ADM | Demo |
| `/applications/:id` | `ApplicationDetailPage` | All (role-filtered) | Demo |
| `/applications/new` | `SubmitApplicationPage` | BEN | Demo |
| `/applications/:id/history` | `ApplicationHistoryPage` | All | Demo |

#### Workflow placeholders (not yet implemented)

| Route | Page | Note |
|-------|------|------|
| `/verification` | `VerificationQueuePage` | Coming soon |
| `/verification/:id` | `VerificationDetailPage` | Coming soon |
| `/disbursement` | `DisbursementPage` | Coming soon |
| `/compliance` | `CompliancePage` | Coming soon |
| `/analytics` | `AnalyticsPage` | Coming soon |

### 3.3 Route guards

- Unauthenticated users → redirect to `/login`
- Authenticated users on `/login` or `/register` → redirect to `/dashboard`
- Role mismatch → 403 page (not redirect, so the URL is preserved for debugging)
- Token stored in `localStorage` as `gsdts_access_token` (see §4 of this document)

---

## 4. Backend-to-Frontend Integration Matrix

| Feature | Endpoint | Real / Demo | Frontend service | Notes |
|---------|----------|-------------|-----------------|-------|
| Register | POST `/auth/register` | **Real** | `auth.service.ts` | Maps `RegisterRequest` |
| Login | POST `/auth/login` | **Real** | `auth.service.ts` | Stores `accessToken` in localStorage |
| Current user | GET `/auth/me` | **Real** | `auth.service.ts` | Called on app init |
| List roles | GET `/roles` | **Real** | `role.service.ts` | Used in create-user form |
| Get role by ID | GET `/roles/{id}` | **Real** | `role.service.ts` | — |
| Get role by name | GET `/roles/name/{name}` | **Real** | `role.service.ts` | — |
| List regions | GET `/regions` | **Real** | `region.service.ts` | Used in region pickers |
| Get region | GET `/regions/{id}` | **Real** | `region.service.ts` | — |
| Create region | POST `/regions` | **Real** | `region.service.ts` | ADMIN only |
| Update region | PUT `/regions/{id}` | **Real** | `region.service.ts` | ADMIN only |
| List users | GET `/users` | **Real** | `user.service.ts` | Paginated, filtered |
| Get user | GET `/users/{id}` | **Real** | `user.service.ts` | — |
| Create user | POST `/users` | **Real** | `user.service.ts` | ADMIN only |
| Update user | PUT `/users/{id}` | **Real** | `user.service.ts` | fullName + phone only |
| Set user status | PATCH `/users/{id}/status` | **Real** | `user.service.ts` | Activate / deactivate |
| Delete user | DELETE `/users/{id}` | **Real** | `user.service.ts` | 409 if referenced |
| Change user role | PUT `/users/{id}/role` | **Real** | `user.service.ts` | — |
| Change user regions | PUT `/users/{id}/regions` | **Real** | `user.service.ts` | — |
| Get user roles | GET `/users/{id}/roles` | **Real** | `user.service.ts` | — |
| List settings | GET `/settings` | **Real** | `setting.service.ts` | ADMIN only |
| Update setting | PUT `/settings/{key}` | **Real** | `setting.service.ts` | ADMIN only |
| Audit log | GET `/audit` | **Real** | `audit.service.ts` | ADMIN only |
| Schemes CRUD | — | **Demo** | `demo-data.service.ts` | No controller exists |
| Beneficiary CRUD | — | **Demo** | `demo-data.service.ts` | No controller exists |
| Applications | — | **Demo** | `demo-data.service.ts` | No controller exists |
| Eligibility | — | **Demo** | Placeholder page | Not implemented |
| Verification | — | **Demo** | Placeholder page | Not implemented |
| Disbursement | — | **Demo** | Placeholder page | Not implemented |
| Compliance | — | **Demo** | Placeholder page | Not implemented |
| Analytics | — | **Demo** | Placeholder page | Not implemented |

**Token storage note:** The backend returns the JWT in the response body (`TokenResponse.accessToken`).
No `Set-Cookie` header is issued. The frontend must store it in `localStorage`. This means the token
is accessible to JavaScript and subject to XSS. Document this trade-off in the README; it is a
known limitation of the current backend design and cannot be changed without backend work.

---

## 5. Component Architecture

### 5.1 Directory structure

```
frontend/
├── public/
│   └── favicon.ico
│
├── src/
│   ├── app/
│   │   ├── App.tsx              # Root component, QueryClientProvider, AuthProvider
│   │   ├── router.tsx           # React Router v6 route tree with lazy loading
│   │   └── providers.tsx        # Composable providers (QueryClient, Toaster)
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx     # Sidebar + Header wrapper for protected pages
│   │   │   ├── Sidebar.tsx      # Collapsible nav, role-filtered menu items
│   │   │   ├── Header.tsx       # Top bar with breadcrumb slot and user menu
│   │   │   ├── Breadcrumbs.tsx  # Path-driven breadcrumbs
│   │   │   └── PageContainer.tsx # Max-width + consistent page padding
│   │   │
│   │   └── ui/                  # shadcn/ui components (auto-generated)
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── data-table.tsx   # TanStack Table wrapper with sort/filter/pagination
│   │       ├── dialog.tsx
│   │       ├── form.tsx
│   │       ├── input.tsx
│   │       ├── select.tsx
│   │       ├── skeleton.tsx
│   │       ├── status-badge.tsx # Government colour-coded status pill
│   │       ├── table.tsx
│   │       └── toast.tsx
│   │
│   ├── features/
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   └── RegisterForm.tsx
│   │   │   ├── pages/
│   │   │   │   ├── LoginPage.tsx
│   │   │   │   └── RegisterPage.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useAuth.ts         # Wraps AuthContext
│   │   │   ├── schemas/
│   │   │   │   ├── login.schema.ts
│   │   │   │   └── register.schema.ts
│   │   │   └── types/
│   │   │       └── auth.types.ts      # TokenResponse, UserResponse shapes
│   │   │
│   │   ├── dashboard/
│   │   │   ├── components/
│   │   │   │   ├── AdminDashboard.tsx
│   │   │   │   ├── BeneficiaryDashboard.tsx
│   │   │   │   ├── FieldOfficerDashboard.tsx
│   │   │   │   ├── DistrictOfficerDashboard.tsx
│   │   │   │   ├── FinanceApproverDashboard.tsx
│   │   │   │   ├── StatCard.tsx
│   │   │   │   └── ApplicationStatusChart.tsx
│   │   │   └── pages/
│   │   │       └── DashboardPage.tsx  # Renders correct role dashboard
│   │   │
│   │   ├── users/
│   │   │   ├── components/
│   │   │   │   ├── UserTable.tsx
│   │   │   │   ├── CreateUserDialog.tsx
│   │   │   │   ├── EditUserDialog.tsx
│   │   │   │   ├── UserStatusToggle.tsx
│   │   │   │   └── ChangeRoleDialog.tsx
│   │   │   ├── pages/
│   │   │   │   ├── UserListPage.tsx
│   │   │   │   └── UserDetailPage.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useUsers.ts        # TanStack Query hooks for all user endpoints
│   │   │   ├── services/
│   │   │   │   └── user.service.ts
│   │   │   ├── schemas/
│   │   │   │   └── user.schema.ts     # Zod schemas mirroring backend constraints
│   │   │   └── types/
│   │   │       └── user.types.ts
│   │   │
│   │   ├── roles/
│   │   │   ├── hooks/
│   │   │   │   └── useRoles.ts
│   │   │   ├── services/
│   │   │   │   └── role.service.ts
│   │   │   └── types/
│   │   │       └── role.types.ts
│   │   │
│   │   ├── regions/
│   │   │   ├── components/
│   │   │   │   ├── RegionTable.tsx
│   │   │   │   ├── CreateRegionDialog.tsx
│   │   │   │   └── EditRegionDialog.tsx
│   │   │   ├── pages/
│   │   │   │   └── RegionListPage.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useRegions.ts
│   │   │   ├── services/
│   │   │   │   └── region.service.ts
│   │   │   ├── schemas/
│   │   │   │   └── region.schema.ts
│   │   │   └── types/
│   │   │       └── region.types.ts
│   │   │
│   │   ├── settings/
│   │   │   ├── components/
│   │   │   │   └── SettingRow.tsx
│   │   │   ├── pages/
│   │   │   │   └── SettingsPage.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useSettings.ts
│   │   │   ├── services/
│   │   │   │   └── setting.service.ts
│   │   │   └── types/
│   │   │       └── setting.types.ts
│   │   │
│   │   ├── audit/
│   │   │   ├── components/
│   │   │   │   ├── AuditTable.tsx
│   │   │   │   └── AuditFilters.tsx
│   │   │   ├── pages/
│   │   │   │   └── AuditLogPage.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useAuditLogs.ts
│   │   │   ├── services/
│   │   │   │   └── audit.service.ts
│   │   │   └── types/
│   │   │       └── audit.types.ts
│   │   │
│   │   ├── schemes/
│   │   │   ├── components/
│   │   │   │   ├── SchemeCard.tsx
│   │   │   │   └── SchemeStatusBadge.tsx
│   │   │   ├── pages/
│   │   │   │   ├── SchemeListPage.tsx
│   │   │   │   └── SchemeDetailPage.tsx
│   │   │   ├── services/
│   │   │   │   └── scheme.service.ts   # Wraps demo data
│   │   │   └── types/
│   │   │       └── scheme.types.ts
│   │   │
│   │   ├── beneficiaries/
│   │   │   ├── pages/
│   │   │   │   ├── BeneficiaryListPage.tsx
│   │   │   │   └── BeneficiaryProfilePage.tsx
│   │   │   ├── services/
│   │   │   │   └── beneficiary.service.ts  # Wraps demo data
│   │   │   └── types/
│   │   │       └── beneficiary.types.ts
│   │   │
│   │   ├── applications/
│   │   │   ├── pages/
│   │   │   │   ├── ApplicationListPage.tsx
│   │   │   │   ├── ApplicationDetailPage.tsx
│   │   │   │   └── SubmitApplicationPage.tsx
│   │   │   ├── services/
│   │   │   │   └── application.service.ts  # Wraps demo data
│   │   │   └── types/
│   │   │       └── application.types.ts
│   │   │
│   │   └── placeholders/
│   │       └── ComingSoonPage.tsx      # Reusable "feature not yet available" page
│   │
│   ├── services/
│   │   ├── api-client.ts       # Central Axios instance with interceptors
│   │   └── demo-data.service.ts # Static demo data isolated from real API calls
│   │
│   ├── hooks/
│   │   └── useActorContext.ts   # Reads decoded user from AuthContext
│   │
│   ├── contexts/
│   │   └── AuthContext.tsx      # Provides user, login(), logout()
│   │
│   ├── types/
│   │   └── api.types.ts         # ApiResponse<T>, PagedResponse<T> shapes
│   │
│   ├── lib/
│   │   └── utils.ts             # cn(), formatDate(), formatCurrency()
│   │
│   └── main.tsx
│
├── .env.example
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### 5.2 Key design decisions

**Axios instance (`api-client.ts`)**
- `baseURL` = `import.meta.env.VITE_API_BASE_URL`
- Request interceptor: attaches `Authorization: Bearer <token>` from localStorage
- Response interceptor: unwraps `ApiResponse<T>.data`; on 401 clears token and redirects to `/login`
- Correlation ID header pass-through where the backend echos it in responses

**TanStack Query conventions**
- Query keys are centralized in a `queryKeys` object per feature (e.g., `queryKeys.users.list(params)`)
- Mutations call `queryClient.invalidateQueries` on the relevant list key after success
- Stale time: 30 s for reference data (roles, regions); 0 for user-specific or mutable data

**Form validation (Zod + React Hook Form)**
- Every form has a Zod schema that mirrors the backend constraints exactly
- Field errors from the backend `fieldErrors[]` array are merged into the form state on API failure

**Demo data isolation**
- `demo-data.service.ts` exports typed static fixtures for schemes, beneficiaries, and applications
- Real service files (e.g., `scheme.service.ts`) import from demo data in Phase 4; they are
  designed to swap to real API calls without touching the page components

**Status badge colour mapping**

| Status / state | Colour |
|----------------|--------|
| APPROVED, PAID, VERIFIED, OPEN | Green |
| SUBMITTED, FIELD_PENDING, DISTRICT_REVIEW, SECOND_REVIEW, FINANCE_REVIEW, PENDING | Amber |
| REJECTED, AUTO_REJECTED, FAILED | Red |
| BUDGET_HOLD, SUSPENDED | Orange |
| CLOSED, TERMINATED, CANCELLED | Grey |
| DRAFT, PAUSED | Blue-grey |

---

## 6. Implementation Task Breakdown

Tasks are ordered by dependency. Each references the phase from the frontend spec.

### Phase 1 — Foundation

| Task | Description | Key files |
|------|-------------|-----------|
| T1.1 | Scaffold Vite + React + TypeScript project in `frontend/` | `package.json`, `vite.config.ts`, `tsconfig.json` |
| T1.2 | Configure Tailwind CSS v4, design tokens (colour palette from spec §4) | `tailwind.config.ts`, `index.css` |
| T1.3 | Install and configure shadcn/ui with the government colour theme | `components/ui/` |
| T1.4 | Build `api-client.ts` (Axios instance, interceptors, error normalizer) | `src/services/api-client.ts` |
| T1.5 | Define `ApiResponse<T>` and `PagedResponse<T>` TypeScript types | `src/types/api.types.ts` |
| T1.6 | Build `AppShell`, `Sidebar`, `Header`, `Breadcrumbs`, `PageContainer` | `src/components/layout/` |
| T1.7 | Configure React Router with public + protected route groups and lazy loading | `src/app/router.tsx` |
| T1.8 | Create `.env.example` with `VITE_API_BASE_URL` only | `.env.example` |

### Phase 2 — Authentication

| Task | Description | Endpoints used |
|------|-------------|---------------|
| T2.1 | Build `AuthContext` + `useAuth` hook; store/clear JWT in localStorage | — |
| T2.2 | Build `LoginPage` with form, validation (Zod), loading state, error feedback | A2 |
| T2.3 | Build `RegisterPage` with all fields from `RegisterRequest`, validation | A1 |
| T2.4 | Implement JWT interceptor — attach token; on 401 clear and redirect | A3 on init |
| T2.5 | Implement `ProtectedRoute` guard and role-guard wrapper component | — |
| T2.6 | Build `ProfilePage` showing current user data | A3 |
| T2.7 | Build role-filtered `Sidebar` navigation using user role from context | — |

### Phase 3 — Real backend integration

| Task | Description | Endpoints used |
|------|-------------|---------------|
| T3.1 | `role.service.ts` + `useRoles` hook | R1, R2, R3 |
| T3.2 | `region.service.ts` + `useRegions` hook + `RegionListPage` with create/edit (ADMIN) | RE1–RE4 |
| T3.3 | `user.service.ts` + `useUsers` hooks + `UserListPage`, `UserDetailPage` | U1–U9 |
| T3.4 | `CreateUserPage` / `EditUserPage` with role picker (from T3.1) and region picker (from T3.2) | U1, U4, U7, U8 |
| T3.5 | User status toggle, delete with confirmation dialog | U5, U6 |
| T3.6 | `setting.service.ts` + `SettingsPage` with inline edit | S1, S2 |
| T3.7 | `audit.service.ts` + `AuditLogPage` with date/actor/entity filters and pagination | AU1 |

### Phase 4 — Government administration showcase (demo data)

| Task | Description |
|------|-------------|
| T4.1 | Build `demo-data.service.ts` with typed static fixtures for schemes, beneficiaries, and applications |
| T4.2 | `DashboardPage` routing to role-specific dashboards; stat cards and Recharts charts using demo data |
| T4.3 | `SchemeListPage` and `SchemeDetailPage` wired to demo data, with status badges and filters |
| T4.4 | `BeneficiaryListPage` and `BeneficiaryProfilePage` (ADMIN/officer view, demo data) |
| T4.5 | `ApplicationListPage` and `ApplicationDetailPage` (all roles, role-filtered demo data) |
| T4.6 | `SubmitApplicationPage` for BENEFICIARY (form against demo schemes, submission to demo) |
| T4.7 | Add "DEMO DATA" banner/indicator on all pages powered by `demo-data.service.ts` |

### Phase 5 — Workflow placeholders

| Task | Description |
|------|-------------|
| T5.1 | `ComingSoonPage` reusable component with feature description and expected timeline |
| T5.2 | Route stubs for verification, disbursement, compliance, and analytics pointing to `ComingSoonPage` |
| T5.3 | Sidebar entries for workflow features with "Coming Soon" badge |

### Phase 6 — Testing and polish

| Task | Description |
|------|-------------|
| T6.1 | Vitest + React Testing Library setup |
| T6.2 | Tests: login form validation, success, 401 and 429 error flows |
| T6.3 | Tests: register form validation and duplicate-username error |
| T6.4 | Tests: protected route redirects for unauthenticated user |
| T6.5 | Tests: role-guard blocks wrong roles, renders 403 |
| T6.6 | Tests: `api-client.ts` interceptors attach bearer token and handle 401 |
| T6.7 | Tests: `UserListPage` pagination and filter params forwarded to service |
| T6.8 | Tests: `AuditLogPage` filter state changes trigger correct query params |
| T6.9 | Tests: `SettingsPage` PUT optimistic update and error rollback |
| T6.10 | Accessibility pass: form labels, ARIA roles on tables, keyboard navigation |
| T6.11 | Responsive layout check: 1280px, 1024px, 768px breakpoints |
| T6.12 | `npm run build` must complete with zero TypeScript errors |
| T6.13 | `npm run test` must pass all tests |

---

## Appendix A — Enums reference

| Enum | Values | Source |
|------|--------|--------|
| `RegionType` | `STATE`, `DISTRICT` | `user.domain.RegionType` |
| `SettingValueType` | `INT`, `MONEY`, `ENUM`, `BOOL` | `user.domain.SettingValueType` |
| `ActorType` | `USER`, `SYSTEM`, `API_CLIENT` | `audit.domain.ActorType` |
| `BeneficiaryType` (legacy) | `INDIVIDUAL`, `ORGANIZATION`, `BUSINESS` | `enums.BeneficiaryType` (old schema, no controller) |
| `SchemeStatus` (legacy) | `DRAFT`, `OPEN`, `PAUSED`, `CLOSED` | `enums.SchemeStatus` (old schema, no controller) |
| `ApplicationStatus` (legacy) | `DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `CLARIFICATION_REQUIRED`, `FIELD_VERIFIED`, `DISTRICT_APPROVED`, `FINANCE_APPROVED`, `REJECTED`, `DISBURSEMENT_IN_PROGRESS`, `COMPLETED`, `ON_HOLD` | `enums.ApplicationStatus` (old schema, no controller) |
| Application status (v2, spec §6.1) | `SUBMITTED`, `AUTO_REJECTED`, `FIELD_PENDING`, `DISTRICT_REVIEW`, `SECOND_REVIEW`, `FINANCE_REVIEW`, `BUDGET_HOLD`, `APPROVED`, `REJECTED`, `CLOSED`, `TERMINATED` | Defined in requirements, not yet in backend controllers |

> Use the **v2 spec statuses** in demo-data fixtures and UI status badges — do not use the legacy enum values, which belong to the old schema and will be replaced when the application module is implemented.

---

## Appendix B — Error codes reference

| HTTP | Error code | Trigger |
|------|-----------|---------|
| 400 | `VALIDATION_FAILED` | Bean validation failure; `fieldErrors` array populated |
| 400 | `MALFORMED_JSON` | Unparseable request body |
| 400 | `INVALID_PARAMETER` | Type mismatch in path/query param |
| 401 | `UNAUTHENTICATED` | Missing, expired, or invalid token; inactive user |
| 403 | `ACCESS_DENIED` | Role not permitted |
| 403 | `SEPARATION_OF_DUTIES` | SoD violation |
| 403 | `REGION_SCOPE_VIOLATION` | Region out of actor's scope |
| 404 | `NOT_FOUND` | Resource does not exist |
| 409 | `DUPLICATE_RESOURCE` | Username/email/code already exists |
| 409 | `RESOURCE_IN_USE` | Cannot delete a referenced resource |
| 409 | `CONCURRENT_MODIFICATION` | Optimistic locking failure |
| 409 | `INVALID_STATUS_TRANSITION` | Illegal workflow state change |
| 422 | `INVALID_REGION_BINDING` | Region binding rules violated |
| 422 | `BUSINESS_RULE_VIOLATION` | General business rule failure |
| 429 | `TOO_MANY_ATTEMPTS` | Account lockout |
| 500 | `INTERNAL_ERROR` | Unhandled exception |
