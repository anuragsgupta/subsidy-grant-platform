# foundation — Module Requirements
> Slice of docs/requirements.md v2.0 (Baselined). The master wins on any conflict.
> Change only via CR on the master (§0.3), then re-sync this file.

---

## 1. Scope

- **Implements:** REQ-AUTH-01, REQ-AUTH-02, REQ-AUTH-03, REQ-USR-01, REQ-USR-02, REQ-USR-03, REQ-USR-04, REQ-AUD-01, REQ-AUD-02, REQ-AUD-03
- **Depends on specs:** none — this is the base slice
- **Out of scope for this slice:**
  - Beneficiary registration and documents (REQ-BEN-*, REQ-DOC-*) — owned by `beneficiary-documents`
  - Schemes and eligibility (REQ-SCH-*, REQ-ELG-*) — owned by `scheme-eligibility`
  - Applications and verification (REQ-APP-*, REQ-VER-*) — owned by `application-workflow`
  - Disbursement and compliance (REQ-DSB-*, REQ-CMP-*) — owned by `disbursement-compliance`
  - External integrations (REQ-INT-*) — owned by `integration`
  - Analytics (REQ-ANL-*) — owned by `analytics`

---

## 2. Shared references (not copied — read from master)

- Glossary §2, Response/error contract §11, NFRs §10,
  Steering `.kiro/steering/project-rules.md`

---

## 3. Relevant decisions

From `docs/requirements.md` §3 Decision Log:

| ID | Conflict | Decision | Reason |
|---|---|---|---|
| D-01 | SRS: Java 17 / Boot 3. Project: Boot 4.1.2, Java 17. Old doc: Java 21 | **Java 21, Spring Boot 4.1.x** | Existing pom already on Boot 4; Java 21 is LTS |
| D-02 | Old doc: schema owned by Supabase DB-001, ddl validate. SRS: Flyway only | **Flyway owns schema**. `V1__baseline` = DB-001 schema; `ddl-auto=validate` | Satisfies NFR-05 and protects the schema |
| D-03 | SRS: local login + BCrypt + JWT. Schema: `auth_user_id → auth.users` (Supabase Auth) | **Self-issued JWT** (`POST /auth/login`). `auth_user_id` kept nullable, RESERVED, never client-settable | Fully self-contained (NFR-08 Docker Compose); simpler testing |
| D-08 | Error codes: old doc 400 for rule violations; SRS 422 | **SRS model**: 400 malformed/bean validation, 401, 403, 404, 409 duplicate/invalid transition/concurrency, 422 business rule, 429 lockout, 500 | Matches SRS §3.1.4 |
| D-09 | Pagination default: old 10; SRS 20, max 100 | **Default 20, max 100** | NFR-03 |
| D-14 | Old doc: hard delete users | Users who appear in any workflow/audit record **cannot be deleted** (409). Deactivate instead | Audit integrity |
| D-15 | Multi-role users (user_role is M:N) | **Exactly one role per user in v2.0** (table stays M:N for future) | Simplifies SoD; avoids officer-as-beneficiary conflicts |
| D-16 | Object access by non-owner beneficiary | Return **404**, not 403 | Prevents resource enumeration |
| D-17 | Audit immutability on Supabase | App connects as dedicated role `gsdts_app` (not `postgres`). REVOKE UPDATE/DELETE/TRUNCATE on `audit_log` **and** a trigger raising an exception on UPDATE/DELETE | The `postgres` superuser bypasses grants |

---

## 4. Data model (tables owned by this slice)

From `docs/requirements.md` §5.1. `[E]` = exists in DB-001 and is altered. `[N]` = new. Every table has `created_at timestamptz NOT NULL DEFAULT now()`. Mutable tables also have `updated_at` and `version BIGINT NOT NULL DEFAULT 0`. Money is `NUMERIC(14,2)`.

| # | Table | Key columns (beyond id/timestamps/version) | Constraints |
|---|---|---|---|
| 1 | region [N] | id BIGSERIAL, code, name, type (STATE/DISTRICT), parent_id | code UNIQUE; DISTRICT must have STATE parent |
| 2 | app_user [E] | username, password_hash, full_name, email, phone, active, failed_login_count, locked_until, auth_user_id (RESERVED) | username UNIQUE; lower(email) UNIQUE |
| 3 | role [E] | id BIGINT, name, description | name UNIQUE; 5 seeded rows |
| 4 | user_role [E] | user_id, role_id, assigned_at | PK(user_id, role_id); FK cascade on user delete |
| 5 | user_region [N] | user_id, region_id, assigned_at | PK(user_id, region_id) |
| 6 | system_setting [N] | key, value, value_type, description, updated_by | key PK |
| 23 | audit_log [N] | id BIGSERIAL, occurred_at, actor_id, actor_role, actor_type (USER, SYSTEM, API_CLIENT), action, entity_type, entity_id, reference_no, old_value JSONB, new_value JSONB, remark, correlation_id, ip_address | append-only (D-17) |
| 24 | api_client [N] | name (TREASURY, BENEFICIARY_DB), key_hash, active | name UNIQUE |
| 25 | shedlock [N] | standard ShedLock table | — |

**Migration order** (from §5.3): Migration 2 — region, user_region, roles seed, app_user auth columns, system_setting + defaults, gsdts_app role grants. Migration 7 — audit_log + immutability trigger, api_client, shedlock.

**Default system settings** (from §5.4 — all settings are seeded and managed by this slice):

| key | default | type |
|---|---|---|
| risk.low.minScore | 75 | INT |
| risk.low.maxAmount | 50000.00 | MONEY |
| risk.medium.minScore | 50 | INT |
| risk.medium.maxAmount | 200000.00 | MONEY |
| compliance.graceDays | 7 | INT |
| analytics.agingThresholdDays | 15 | INT |
| treasury.mode | API (API or MANUAL) | ENUM |
| beneficiaryRegistry.verifyOnRegister | false | BOOL |
| auth.maxFailedLogins | 5 | INT |
| auth.lockMinutes | 15 | INT |

---

## 5. Roles and permissions

### 5.1 Roles (seeded, immutable) — from §4.1

| id | name | Region binding |
|---|---|---|
| 1 | BENEFICIARY | none (owns own data) |
| 2 | FIELD_OFFICER | exactly one DISTRICT |
| 3 | DISTRICT_OFFICER | exactly one DISTRICT |
| 4 | FINANCE_APPROVER | one or more regions (STATE or DISTRICT; covers descendants) |
| 5 | ADMIN | global |

### 5.2 Permission matrix (✔ allowed, ✖ 403, O = own records only) — from §4.2

| Capability | BEN | FO | DO | FA | ADMIN |
|---|---|---|---|---|---|
| Register own beneficiary profile / upload own docs | O | ✖ | ✖ | ✖ | ✔ (any) |
| View beneficiary | O | scope (assigned apps) | scope | scope | ✔ |
| Browse open schemes, eligibility preview | ✔ | ✔ | ✔ | ✔ | ✔ |
| Create/edit schemes, criteria, templates, budgets | ✖ | ✖ | ✖ | ✖ | ✔ |
| Submit application | O | ✖ | ✖ | ✖ | ✖ |
| View application | O (filtered) | assigned only (filtered) | scope | scope | ✔ |
| File field report | ✖ | assigned only | ✖ | ✖ | ✖ |
| District / second-district decision | ✖ | ✖ | scope | ✖ | ✖ |
| Finance decision | ✖ | ✖ | ✖ | scope | ✖ |
| Resume from BUDGET_HOLD, reassign field officer | ✖ | ✖ | ✖ | ✖ | ✔ |
| Submit milestone evidence | O | ✖ | ✖ | ✖ | ✖ |
| Verify milestone, act on compliance flag | ✖ | ✖ | scope | ✖ | ✖ |
| Release tranche, manual payment confirmation | ✖ | ✖ | ✖ | scope | ✖ |
| Analytics | ✖ | ✖ | compliance (scope) | utilization (scope) | ✔ all |
| Audit log | ✖ | ✖ | ✖ | ✖ | ✔ (read only) |
| Manage users, roles, regions, settings | ✖ | ✖ | ✖ | ✖ | ✔ |

### 5.3 Inverse requirements (from §4.3) — relevant to this slice

- INV-01: let a beneficiary see other beneficiaries, eligibility scores, risk tiers, internal comments or audit logs.

---

## 6. Requirements (verbatim REQ blocks)

### 8.1 AUTH — Authentication

**REQ-AUTH-01 Beneficiary self sign-up**
*User story: As a citizen, I want to create an account so that I can register as a beneficiary and apply.*
- AC-AUTH-01.1 WHEN `POST /auth/register` is received with a valid username (4–50, `^[a-zA-Z0-9._-]+$`), password (8–72 chars, ≥1 letter and ≥1 digit), fullName, email and optional phone, THE System SHALL create an active app_user with role BENEFICIARY, store a BCrypt hash, and return 201 without a password or hash.
- AC-AUTH-01.2 WHEN the username or email (case-insensitive) already exists, THE System SHALL return 409 `DUPLICATE_RESOURCE`.
- AC-AUTH-01.3 THE System SHALL NOT allow role, active, id or auth_user_id to be set through this endpoint.

**REQ-AUTH-02 Login**
- AC-AUTH-02.1 WHEN `POST /auth/login` is received with valid credentials for an active, unlocked user, THE System SHALL return a JWT access token (claims: sub = userId, roles, iat, exp) with 30-minute expiry, plus `expiresAt`.
- AC-AUTH-02.2 WHEN credentials are invalid, THE System SHALL return 401 `UNAUTHENTICATED` with a message that does not reveal whether the username exists, and SHALL increment failed_login_count.
- AC-AUTH-02.3 WHEN failed_login_count reaches `auth.maxFailedLogins`, THE System SHALL lock the account for `auth.lockMinutes`, and WHILE locked SHALL return 429 `TOO_MANY_ATTEMPTS`.
- AC-AUTH-02.4 WHEN login succeeds, THE System SHALL reset failed_login_count and audit `LOGIN_SUCCESS`. Failures SHALL be audited as `LOGIN_FAILURE` (username only).

**REQ-AUTH-03 Token enforcement**
- AC-AUTH-03.1 WHEN a protected endpoint is called without a token, or with an invalid or expired token, THE System SHALL return 401.
- AC-AUTH-03.2 WHEN the token's user is inactive or deleted, THE System SHALL return 401 (user status cache ≤ 60 s).
- AC-AUTH-03.3 WHEN the role is not permitted (§4.2), THE System SHALL return 403 `ACCESS_DENIED`.
- AC-AUTH-03.4 `GET /auth/me` SHALL return the current user's id, username, fullName, role and region scope.

---

### 8.2 USR — Users, Roles, Regions, Settings

**REQ-USR-01 Staff user management (ADMIN)**
- AC-USR-01.1 WHEN `POST /users` is received with username, initial password, fullName, email, phone, roleId and regionIds, THE System SHALL create the user and return 201.
- AC-USR-01.2 THE System SHALL enforce the region binding rules of §4.1. Violations → 422 `INVALID_REGION_BINDING`.
- AC-USR-01.3 `GET /users` SHALL be paginated with filters `role`, `regionId`, `active`, `q` (name/email contains). `GET /users/{id}` returns a single user (404 if missing).
- AC-USR-01.4 `PUT /users/{id}` SHALL update fullName and phone only. Email, username, id and auth_user_id SHALL NOT be changeable.
- AC-USR-01.5 `PATCH /users/{id}/status {active}` SHALL activate or deactivate (null active → 400). An admin SHALL NOT deactivate themselves (422).
- AC-USR-01.6 `DELETE /users/{id}` SHALL delete only users with no workflow or audit references; otherwise 409 `RESOURCE_IN_USE` (D-14). Success → 204.
- AC-USR-01.7 `PUT /users/{id}/role {roleId}` SHALL replace the user's single role (D-15). 404 for an unknown role.
- AC-USR-01.8 `PUT /users/{id}/regions {regionIds[]}` SHALL replace region bindings per §4.1.
- AC-USR-01.9 `GET /users/{id}/roles` SHALL return the assigned roles.

**REQ-USR-02 Roles are read-only**
- AC-USR-02.1 `GET /roles`, `GET /roles/{id}` and `GET /roles/name/{name}` SHALL return roles (404 if missing).
- AC-USR-02.2 THE System SHALL NOT expose create, update or delete for roles.

**REQ-USR-03 Regions**
- AC-USR-03.1 `GET /regions?type=&parentId=` (any authenticated user) and `GET /regions/{id}` SHALL return regions.
- AC-USR-03.2 ADMIN `POST /regions` and `PUT /regions/{id}` SHALL create or update regions (code `^[A-Z0-9_-]{2,20}$` unique → 409). A region in use SHALL NOT be deleted (no delete endpoint).

**REQ-USR-04 System settings (ADMIN)**
- AC-USR-04.1 `GET /settings` and `PUT /settings/{key} {value}` SHALL read and update settings. The value is validated against value_type (400), and an unknown key → 404.
- AC-USR-04.2 Every change SHALL be audited with old and new values (FR-28).
- AC-USR-04.3 Rule engines SHALL read settings at evaluation time (cache ≤ 60 s, evicted on update).

---

### 8.12 AUD — Audit (FR-28, FR-29)

**REQ-AUD-01 Audit writing**
- AC-AUD-01.1 Every state change SHALL write an audit_log row in the same transaction: user created/updated/role/region/status, login, setting, scheme/criterion/template/budget, beneficiary create/update, application status, score, tier, assignment, field report, verification decision, tranche status, milestone status, flag action, payment instruction and confirmation.
- AC-AUD-01.2 old_value/new_value SHALL contain changed fields only, with PII masked.
- AC-AUD-01.3 reference_no SHALL be set for every application-related entry. correlation_id = the request's `X-Correlation-Id` (generated if absent, echoed in the response header).

**REQ-AUD-02 Immutability** — per D-17.
- AC-AUD-02.1 An integration test proves UPDATE and DELETE on audit_log fail for the `gsdts_app` role and via the trigger.

**REQ-AUD-03 Query**
- AC-AUD-03.1 `GET /audit?referenceNo=&entityType=&entityId=&actorId=&from=&to=` (ADMIN) SHALL be paginated, ordered by occurred_at, id ascending.
- AC-AUD-03.2 No create, update or delete audit endpoints exist.

---

## 7. Endpoints

From `docs/requirements.md` §9 API Catalogue (prefix `/api/v1`), rows for REQ-AUTH-*, REQ-USR-*, REQ-AUD-*:

| Method | Path | Roles | REQ |
|---|---|---|---|
| POST | /auth/register | Public | AUTH-01 |
| POST | /auth/login | Public | AUTH-02 |
| GET | /auth/me | Any | AUTH-03 |
| GET/POST | /users | ADMIN | USR-01 |
| GET/PUT/DELETE | /users/{id} | ADMIN | USR-01 |
| PATCH | /users/{id}/status | ADMIN | USR-01 |
| GET | /users/{id}/roles | ADMIN | USR-01 |
| PUT | /users/{id}/role, /users/{id}/regions | ADMIN | USR-01 |
| GET | /roles, /roles/{id}, /roles/name/{name} | ADMIN | USR-02 |
| GET/POST/PUT | /regions, /regions/{id} | Any (GET) / ADMIN | USR-03 |
| GET/PUT | /settings, /settings/{key} | ADMIN | USR-04 |
| GET | /audit | ADMIN | AUD-03 |

---

## 8. Error codes used

From `docs/requirements.md` §11.2:

| HTTP | Codes used by this slice |
|---|---|
| 400 | `VALIDATION_FAILED`, `MALFORMED_JSON`, `INVALID_PARAMETER` |
| 401 | `UNAUTHENTICATED` |
| 403 | `ACCESS_DENIED` |
| 404 | `RESOURCE_NOT_FOUND` |
| 409 | `DUPLICATE_RESOURCE`, `RESOURCE_IN_USE`, `CONCURRENT_MODIFICATION` |
| 422 | `INVALID_REGION_BINDING` |
| 429 | `TOO_MANY_ATTEMPTS` |
| 500 | `INTERNAL_ERROR` |

---

## 9. Acceptance tests owned by this slice

From `docs/requirements.md` §12.2:

| ID | Scenario | Expected |
|---|---|---|
| AT-07 | UPDATE/DELETE on audit_log via the app DB role | DB error; row unchanged |
| AT-16 | Admin calls /decision | 403 |
| AT-17 | Unauthenticated call to a protected endpoint / wrong role | 401 / 403 |

> AT-16 and AT-17 exercise the JWT filter and role-enforcement infrastructure built here. The `/decision` endpoint itself belongs to `application-workflow`.

---

## 10. Interfaces this slice exposes to other slices

```java
// com.govgrants.subsidygrant.audit.service.AuditService
// Called by every other slice in the same transaction
void record(AuditEntry entry, ActorContext actor);

// com.govgrants.subsidygrant.setting.service.SettingsCacheService
// Cache ≤ 60 s, evicted on PUT /settings/{key}
String getValue(String key);
int getInt(String key);
BigDecimal getMoney(String key);
boolean getBool(String key);

// com.govgrants.subsidygrant.region.service.RegionQueryService
Region getById(Long regionId);                  // throws ResourceNotFoundException if absent
boolean isDescendantOf(Long regionId, Long ancestorId);
List<Long> getDescendantIds(Long regionId);     // includes self

// com.govgrants.subsidygrant.user.service.UserQueryService
AppUser getById(UUID userId);
boolean hasRole(UUID userId, String roleName);
List<Long> getRegionIds(UUID userId);           // bound regions

// com.govgrants.subsidygrant.auth.ActorContext  (value object, not a service)
// Constructed by the JWT filter; passed to every service method
record ActorContext(UUID userId, String role, List<Long> regionIds, String correlationId, String ipAddress) {}
```

---

## 11. Interfaces this slice consumes from other slices

None. `foundation` is the base; it has no upstream slice dependencies.

---

## 12. Traceability check

| ID | Section |
|---|---|
| REQ-AUTH-01 | §6 |
| AC-AUTH-01.1 | §6 |
| AC-AUTH-01.2 | §6 |
| AC-AUTH-01.3 | §6 |
| REQ-AUTH-02 | §6 |
| AC-AUTH-02.1 | §6 |
| AC-AUTH-02.2 | §6 |
| AC-AUTH-02.3 | §6 |
| AC-AUTH-02.4 | §6 |
| REQ-AUTH-03 | §6 |
| AC-AUTH-03.1 | §6 |
| AC-AUTH-03.2 | §6 |
| AC-AUTH-03.3 | §6 |
| AC-AUTH-03.4 | §6 |
| REQ-USR-01 | §6 |
| AC-USR-01.1 | §6 |
| AC-USR-01.2 | §6 |
| AC-USR-01.3 | §6 |
| AC-USR-01.4 | §6 |
| AC-USR-01.5 | §6 |
| AC-USR-01.6 | §6 |
| AC-USR-01.7 | §6 |
| AC-USR-01.8 | §6 |
| AC-USR-01.9 | §6 |
| REQ-USR-02 | §6 |
| AC-USR-02.1 | §6 |
| AC-USR-02.2 | §6 |
| REQ-USR-03 | §6 |
| AC-USR-03.1 | §6 |
| AC-USR-03.2 | §6 |
| REQ-USR-04 | §6 |
| AC-USR-04.1 | §6 |
| AC-USR-04.2 | §6 |
| AC-USR-04.3 | §6 |
| REQ-AUD-01 | §6 |
| AC-AUD-01.1 | §6 |
| AC-AUD-01.2 | §6 |
| AC-AUD-01.3 | §6 |
| REQ-AUD-02 | §6 |
| AC-AUD-02.1 | §6 |
| REQ-AUD-03 | §6 |
| AC-AUD-03.1 | §6 |
| AC-AUD-03.2 | §6 |
| D-01 | §3 |
| D-02 | §3 |
| D-03 | §3 |
| D-08 | §3 |
| D-09 | §3 |
| D-14 | §3 |
| D-15 | §3 |
| D-16 | §3 |
| D-17 | §3 |
| Tables #1–6, 23–25 | §4 |
| §5.4 settings | §4 |
| §4.1 roles | §5.1 |
| §4.2 permission matrix | §5.2 |
| AT-07, AT-16, AT-17 | §9 |
