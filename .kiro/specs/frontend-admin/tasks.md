# Frontend Admin — Tasks

Ordered by dependency. Tasks reference the requirements (R-x) and design
sections. Phases 1 & 2 are already merged in `main`; this phase replaces the
existing placeholder pages for users, regions, settings and audit.

---

## T-1 Shared state components

- [x] **T-1.1** `src/components/states/LoadingSkeleton.tsx` — table-row
  skeleton driven by a `rows` count.
- [x] **T-1.2** `src/components/states/EmptyState.tsx` — icon + message.
- [x] **T-1.3** `src/components/states/ErrorState.tsx` — "Backend not
  available" message + Retry button (C-4).
- [x] **T-1.4** `src/components/states/PermissionDeniedState.tsx` —
  permission-denied message (C-3).
- [x] **T-1.5** `src/components/states/QueryState.tsx` — resolves the four
  states per Design §6; export a single component used by every page.

---

## T-2 Roles feature (reference data)

- [x] **T-2.1** `features/roles/types/role.types.ts` — `RoleResponse`.
- [x] **T-2.2** `features/roles/services/role.service.ts` — `listRoles`,
  `getRole`, `getRoleByName`.
- [x] **T-2.3** `features/roles/hooks/useRoles.ts` — `roleKeys`,
  `useRolesQuery` (staleTime 5 min).
- [x] **T-2.4** `features/roles/__tests__/role.service.test.ts` — correct
  URLs + unwrapping.

---

## T-3 Regions feature

- [x] **T-3.1** `features/regions/types/region.types.ts` — `RegionType`,
  `RegionResponse`, `RegionListParams`.
- [x] **T-3.2** `features/regions/services/region.service.ts` — `listRegions`,
  `getRegion`.
- [x] **T-3.3** `features/regions/schemas/region.schema.ts` —
  `regionListParamsSchema`.
- [x] **T-3.4** `features/regions/hooks/useRegions.ts` — `regionKeys`,
  `useRegionsQuery(params)`, `useRegionQuery(id)` (staleTime 5 min).
- [x] **T-3.5** `features/regions/components/RegionTree.tsx` —
  `buildRegionTree(regions)` + indented render (Design §8).
- [x] **T-3.6** `features/regions/components/RegionTable.tsx` — flat table
  with Code/Name/Type/Parent columns (fallback view). Merged into RegionTree
  as the `flat` prop; a separate file was not needed.
- [x] **T-3.7** Replace `features/regions/pages/RegionListPage.tsx` — type
  filter, `RegionTree`, wrapped in `QueryState`.
- [x] **T-3.8** `features/regions/__tests__/region.service.test.ts` and
  `RegionListPage.test.tsx` (type filter, hierarchy, states).

---

## T-4 Settings feature

- [x] **T-4.1** `features/settings/types/setting.types.ts` —
  `SettingValueType`, `SettingResponse`, `UpdateSettingRequest`.
- [x] **T-4.2** `features/settings/services/setting.service.ts` —
  `getAllSettings`, `updateSetting`.
- [x] **T-4.3** `features/settings/schemas/setting.schema.ts` —
  `updateSettingSchema(valueType)` factory (Design §5.3).
- [x] **T-4.4** `features/settings/hooks/useSettings.ts` — `settingKeys`,
  `useSettingsQuery`, `useUpdateSettingMutation` (invalidate list).
- [x] **T-4.5** `features/settings/components/SettingRow.tsx` — key, value,
  type, description, updated-at, Edit button.
- [x] **T-4.6** `features/settings/components/EditSettingDialog.tsx` —
  `react-hook-form` + `zodResolver(updateSettingSchema(valueType))`, inline
  `400`/`404` handling.
- [x] **T-4.7** Replace `features/settings/pages/SettingsPage.tsx` — list of
  `SettingRow`s, `EditSettingDialog`, wrapped in `QueryState`.
- [x] **T-4.8** `features/settings/__tests__/{setting.service.test.ts,
  SettingsPage.test.tsx}` (validation by type, 404/400, refetch).

---

## T-5 Users feature

- [x] **T-5.1** `features/users/types/user.types.ts` — `UserSummaryResponse`,
  `UserStatusRequest`, `ChangeRoleRequest`, `ChangeRegionsRequest`,
  `UserListParams` (reuse `UserResponse` from `types/auth`).
- [x] **T-5.2** `features/users/services/user.service.ts` — `listUsers`,
  `getUser`, `getUserRoles`, `setStatus`, `changeRole`, `changeRegions`.
- [x] **T-5.3** `features/users/schemas/user.schema.ts` — `setStatusSchema`,
  `changeRoleSchema`, `changeRegionsSchema`.
- [x] **T-5.4** `features/users/hooks/useUsers.ts` — `userKeys`,
  `useUsersQuery(params)`, `useUserQuery(id)`, `useUserRolesQuery(id)`,
  `useSetUserStatusMutation`, `useChangeUserRoleMutation`,
  `useChangeUserRegionsMutation`.
- [x] **T-5.5** `features/users/components/UserFilters.tsx` — debounced `q`
  search, role select (`useRolesQuery`), active select, page-size select.
- [x] **T-5.6** `features/users/components/UserTable.tsx` — columns + row
  click → `/admin/users/:id`, active status badge.
- [x] **T-5.7** `features/users/components/StatusChangeDialog.tsx` —
  confirmation dialog → `setStatus` (R-1.3).
- [x] **T-5.8** `features/users/components/ChangeRoleDialog.tsx` — role
  select → `changeRole` (R-1.4).
- [x] **T-5.9** `features/users/components/ChangeRegionsDialog.tsx` —
  multi-select regions (`useRegionsQuery`) → `changeRegions` (R-1.5), inline
  `422`/`BUSINESS_RULE` error.
- [x] **T-5.10** Replace `features/users/pages/UserListPage.tsx` —
  `UserFilters` + `UserTable` + pagination, wrapped in `QueryState`.
- [x] **T-5.11** Replace `features/users/pages/UserDetailPage.tsx` —
  `useUserQuery` + `useUserRolesQuery`; region names resolved from
  `useRegionsQuery`; the three action dialogs.
- [x] **T-5.12** `features/users/__tests__/{user.service.test.ts,
  UserListPage.test.tsx, UserDetailPage.test.tsx}` (R-6.1..R-6.3).

---

## T-6 Audit feature

- [x] **T-6.1** `features/audit/types/audit.types.ts` — `ActorType`,
  `AuditLogResponse`, `AuditQueryParams`.
- [x] **T-6.2** `features/audit/services/audit.service.ts` — `queryAudit`.
- [x] **T-6.3** `features/audit/schemas/audit.schema.ts` — `auditQuerySchema`.
- [x] **T-6.4** `features/audit/hooks/useAuditLogs.ts` — `auditKeys`,
  `useAuditLogsQuery(params)`.
- [x] **T-6.5** `features/audit/components/AuditFilters.tsx` — referenceNo,
  entityType, entityId, actorId (UUID), from/to date inputs, Clear filters.
- [x] **T-6.6** `features/audit/components/AuditTable.tsx` — columns per
  R-5.3, row click opens details dialog.
- [x] **T-6.7** `features/audit/components/AuditDetailDialog.tsx` — full
  record + pretty-printed `oldValue`/`newValue` JSON (Design §9).
- [x] **T-6.8** Replace `features/audit/pages/AuditLogPage.tsx` —
  `AuditFilters` + `AuditTable` + pagination, wrapped in `QueryState`.
- [x] **T-6.9** `features/audit/__tests__/{audit.service.test.ts,
  AuditLogPage.test.tsx}` (R-6.6).

---

## T-7 Router & placeholders

- [x] **T-7.1** Confirmed `app/router.tsx` already maps all four pages; no
  new routes needed. The `PermissionDeniedState` in `QueryState` provides
  defense-in-depth for 403 responses from the backend.
- [x] **T-7.2** `CreateUserPage.tsx` left as the existing "coming soon"
  placeholder — not presented as functional.

---

## T-8 Build & test verification

- [x] **T-8.1** `npm run build` — zero TypeScript errors, clean Vite build.
- [x] **T-8.2** `npm run test` — 83 tests across 16 test files, all passing.
  Existing Phase 1/2 tests unchanged and green.
