# foundation — Module Design

> Implements: REQ-AUTH-01–03, REQ-USR-01–04, REQ-AUD-01–03  
> Spec slice: `.kiro/specs/foundation/requirements.md`  
> Master requirements: `docs/requirements.md` v2.0 (Baselined)

---

## Overview

The `foundation` slice is the base module of GSDTS. It provides:

- **Authentication**: BCrypt-hashed self-registration and JWT-based login with account lockout (REQ-AUTH-01–03).
- **User management**: ADMIN-managed staff users with a single role and region bindings (REQ-USR-01–02).
- **Region hierarchy**: Two-level STATE → DISTRICT tree; consumed by every other slice for scope enforcement (REQ-USR-03).
- **System settings**: Ten key-value settings read by rule engines at evaluation time with a 60-second cache (REQ-USR-04).
- **Audit log**: Append-only, immutable audit trail written synchronously in every state-change transaction (REQ-AUD-01–03).

This slice introduces sub-modules `common`, `auth`, `user` and `audit` and owns the first two Flyway migrations (baseline + auth schema) plus migration 7 (audit schema). No other slice may depend on a higher-numbered slice; all other slices depend on `foundation`.

---

## Architecture

```
                        ┌──────────────────────────────────────────────────────┐
                        │                HTTP Clients                           │
                        └───────────────────────┬──────────────────────────────┘
                                                 │ HTTPS /api/v1/**
                        ┌────────────────────────▼─────────────────────────────┐
                        │  CorrelationIdFilter  →  JwtAuthFilter               │
                        │          (common)              (auth)                 │
                        └────────────────────────┬─────────────────────────────┘
                                                  │ ActorContext attached to request
          ┌──────────────┬────────────────────────┼──────────────┬─────────────┐
          │              │                        │              │             │
    ┌─────▼─────┐  ┌─────▼─────┐  ┌──────────────▼───┐  ┌──────▼─────┐  ┌───▼────────┐
    │AuthCtrl   │  │UserCtrl   │  │RegionCtrl/Setting │  │RoleCtrl    │  │AuditCtrl   │
    │(auth.api) │  │(user.api) │  │Ctrl (user.api)    │  │(user.api)  │  │(audit.api) │
    └─────┬─────┘  └─────┬─────┘  └──────────────┬───┘  └──────┬─────┘  └───┬────────┘
          │              │                        │              │             │
    ┌─────▼─────┐  ┌─────▼─────┐  ┌──────────────▼───┐         │       ┌────▼────────┐
    │AuthService│  │UserService│  │Region/Setting     │   RoleService   │AuditService │
    │JwtService │  │           │  │Service            │   (read-only)   │             │
    │StatusCache│  │           │  │SettingsCacheService│                │PiiMasking   │
    └─────┬─────┘  └─────┬─────┘  └──────────────┬───┘                └────┬────────┘
          │              │                        │                          │
    ┌─────▼──────────────▼────────────────────────▼──────────────────────────▼────────┐
    │                    PostgreSQL 15  (Flyway-managed schema)                        │
    │  app_user · role · user_role · region · user_region · system_setting             │
    │  audit_log (immutable) · api_client · shedlock                                  │
    └──────────────────────────────────────────────────────────────────────────────────┘
```

**Key architectural decisions:**

| Decision | Detail |
|---|---|
| Self-issued JWT (D-03) | `JwtService` owns HS256 signing; no OAuth2 Resource Server auto-config |
| ActorContext threading | `JwtAuthFilter` builds `ActorContext` once and stores it as a request attribute; services accept it as a parameter (no `SecurityContextHolder` reads in business logic) |
| Caffeine caches | `UserStatusCache` (60 s TTL) and `SettingsCacheService` (60 s TTL, evict-on-write) avoid per-request DB lookups for hot paths |
| Synchronous audit writes | `AuditService.record()` writes in the caller's transaction — no outbox, no async — guaranteeing that audit and state changes are always consistent (AC-AUD-01.1) |
| Flyway schema ownership | `ddl-auto=validate`; Hibernate never alters the schema (D-02) |
| DB role immutability (D-17) | `gsdts_app` role has REVOKE on UPDATE/DELETE/TRUNCATE of `audit_log` plus a trigger that raises an exception even for the superuser's ORM path |

---

## Components and Interfaces

The slice exposes the following interfaces for consumption by other slices (verbatim from requirements §10):

```java
// AuditService — synchronous, same-transaction audit writing
void record(AuditEntry entry, ActorContext actor);
void recordSystem(AuditEntry entry);   // for scheduled jobs

// SettingsCacheService — 60 s cache; evicted on PUT /settings/{key}
String getValue(String key);
int getInt(String key);
BigDecimal getMoney(String key);
boolean getBool(String key);

// RegionQueryService — hierarchy traversal
Region getById(Long regionId);
boolean isDescendantOf(Long regionId, Long ancestorId);
List<Long> getDescendantIds(Long regionId);  // includes self

// UserQueryService — read-only user lookups
AppUser getById(UUID userId);
boolean hasRole(UUID userId, String roleName);
List<Long> getRegionIds(UUID userId);

// ActorContext — value record built by JwtAuthFilter
record ActorContext(UUID userId, String role, List<Long> regionIds,
                   String correlationId, String ipAddress) {}
```

Internal component interactions within this slice are described in detail in sections 5–7 below.

---

## Data Models

The foundation slice owns the following tables (from requirements §5.1):

| Table | Type | Key columns | Constraints |
|---|---|---|---|
| `app_user` | Existing (altered) | id UUID, username, password_hash, failed_login_count, locked_until, version | username UNIQUE; lower(email) UNIQUE |
| `role` | Existing | id BIGINT, name | name UNIQUE; 5 seeded rows |
| `user_role` | Existing | PK(user_id, role_id) | FK cascade on user delete |
| `region` | New | id BIGSERIAL, code, name, type, parent_id | code UNIQUE; DISTRICT must have STATE parent |
| `user_region` | New | PK(user_id, region_id) | append-only |
| `system_setting` | New | key PK, value, value_type | 10 seeded rows |
| `audit_log` | New | id BIGSERIAL, occurred_at, actor_type, action, entity_type | append-only; UPDATE/DELETE blocked by REVOKE + trigger (D-17) |
| `api_client` | New | id UUID, name, key_hash, active | name UNIQUE |
| `shedlock` | New | name PK | Standard ShedLock DDL |

Entity class designs and migration DDL are detailed in sections 2–3 below.

---

## 1. Module Layout

The foundation slice introduces four sub-modules under the base package `com.govgrants.subsidygrant`. Existing code in the flat `entity/`, `dto/`, `repository/`, `enums/` packages is migrated into the module structure during this slice.

```
com.govgrants.subsidygrant
├── common
│   ├── api
│   │   └── GlobalExceptionHandler.java       — @RestControllerAdvice; maps every exception to ErrorCode + ApiResponse
│   ├── domain
│   │   ├── ActorContext.java                  — Immutable record carrying userId, role, regionIds, correlationId, ipAddress; passed to every service method
│   │   └── ErrorCode.java                     — Enum of all error codes from requirements §11.2
│   ├── exception
│   │   ├── BusinessException.java             — Base unchecked exception carrying HTTP status + ErrorCode
│   │   ├── ResourceNotFoundException.java     — 404 wrapper
│   │   ├── DuplicateResourceException.java    — 409 DUPLICATE_RESOURCE
│   │   ├── ResourceInUseException.java        — 409 RESOURCE_IN_USE
│   │   ├── ConcurrentModificationException.java — 409 CONCURRENT_MODIFICATION
│   │   ├── AccessDeniedException.java         — 403 ACCESS_DENIED / SEPARATION_OF_DUTIES / REGION_SCOPE_VIOLATION
│   │   └── BusinessRuleException.java         — 422 for named business-rule violations
│   ├── filter
│   │   └── CorrelationIdFilter.java           — OncePerRequestFilter; reads/generates X-Correlation-Id, stores in MDC, echoes in response
│   └── response
│       ├── ApiResponse.java                   — EXISTING; standard success/error envelope (keep, migrate package)
│       └── PagedResponse.java                 — EXISTING; wraps Spring Page<T> (keep, migrate package)
│
├── auth
│   ├── api
│   │   ├── AuthController.java                — Handles /api/v1/auth/register, /login, /me
│   │   ├── RegisterRequest.java               — Record: username, password, fullName, email, phone
│   │   ├── LoginRequest.java                  — Record: username, password
│   │   └── TokenResponse.java                 — Record: accessToken, tokenType, expiresAt
│   ├── service
│   │   ├── AuthService.java                   — Orchestrates registration, login, lockout (AC-AUTH-01, AC-AUTH-02)
│   │   ├── JwtService.java                    — HS256 token generation and validation (AC-AUTH-02.1, AC-AUTH-03.1)
│   │   └── UserStatusCache.java               — Caffeine TTL-60 s cache of UUID→Boolean(active); evicted on status change (AC-AUTH-03.2)
│   └── filter
│       └── JwtAuthFilter.java                 — OncePerRequestFilter; validates Bearer token, sets SecurityContextHolder, injects ActorContext (AC-AUTH-03)
│
├── user
│   ├── api
│   │   ├── UserController.java                — /api/v1/users/**
│   │   ├── RoleController.java                — /api/v1/roles/**
│   │   ├── RegionController.java              — /api/v1/regions/**
│   │   ├── SettingController.java             — /api/v1/settings/**
│   │   ├── CreateUserRequest.java             — Record (replaces existing Lombok DTO)
│   │   ├── UpdateUserRequest.java             — Record (replaces existing Lombok DTO)
│   │   ├── UserStatusRequest.java             — Record (replaces existing Lombok DTO)
│   │   ├── ChangeRoleRequest.java             — Record: roleId
│   │   ├── ChangeRegionsRequest.java          — Record: regionIds (List<Long>)
│   │   ├── UserResponse.java                  — Record (replaces existing Lombok DTO)
│   │   ├── UserSummaryResponse.java           — Record: id, username, fullName, email, role, active
│   │   ├── RoleResponse.java                  — Record (replaces existing Lombok DTO)
│   │   ├── RegionResponse.java                — Record: id, code, name, type, parentId
│   │   ├── CreateRegionRequest.java           — Record: code, name, type, parentId
│   │   ├── UpdateRegionRequest.java           — Record: name (code and type immutable after create)
│   │   ├── SettingResponse.java               — Record: key, value, valueType, description, updatedBy
│   │   └── UpdateSettingRequest.java          — Record: value
│   ├── service
│   │   ├── UserService.java                   — CRUD + role/region management for staff users (REQ-USR-01)
│   │   ├── UserQueryService.java              — Read-only interface consumed by other slices: getById, hasRole, getRegionIds
│   │   ├── RegionService.java                 — CRUD and hierarchy validation for regions (REQ-USR-03)
│   │   ├── RegionQueryService.java            — Read-only interface consumed by other slices: getById, isDescendantOf, getDescendantIds
│   │   ├── SettingService.java                — Read/update settings; evicts cache; writes audit (REQ-USR-04)
│   │   └── SettingsCacheService.java          — Caffeine TTL-60 s wrapper; exposes getValue, getInt, getMoney, getBool (AC-USR-04.3)
│   ├── domain
│   │   ├── Region.java                        — JPA entity for the region table
│   │   ├── UserRegion.java                    — JPA entity for user_region (composite PK)
│   │   ├── UserRegionId.java                  — @Embeddable composite key (userId, regionId)
│   │   ├── SystemSetting.java                 — JPA entity for system_setting
│   │   ├── RegionType.java                    — Enum: STATE, DISTRICT
│   │   └── SettingValueType.java              — Enum: INT, MONEY, ENUM, BOOL
│   ├── repository
│   │   ├── RegionRepository.java              — JpaRepository<Region, Long>
│   │   ├── UserRegionRepository.java          — JpaRepository<UserRegion, UserRegionId>
│   │   └── SystemSettingRepository.java       — JpaRepository<SystemSetting, String>
│   └── mapper
│       ├── UserMapper.java                    — MapStruct: AppUser ↔ UserResponse / UserSummaryResponse
│       └── RegionMapper.java                  — MapStruct: Region ↔ RegionResponse
│
└── audit
    ├── api
    │   ├── AuditController.java               — GET /api/v1/audit (REQ-AUD-03)
    │   └── AuditLogResponse.java              — Record: all audit_log columns (PII masked)
    ├── service
    │   ├── AuditService.java                  — record() and recordSystem(); queryAudit() for GET /audit (REQ-AUD-01, REQ-AUD-03)
    │   ├── AuditEntry.java                    — Value record: action, entityType, entityId, referenceNo, oldValue (Map<String,Object>), newValue (Map<String,Object>), remark
    │   └── PiiMaskingUtil.java                — Static helpers: maskEmail(String), maskPhone(String)
    ├── domain
    │   ├── AuditLog.java                      — JPA entity for audit_log (append-only)
    │   ├── ActorType.java                     — Enum: USER, SYSTEM, API_CLIENT
    │   └── ApiClient.java                     — JPA entity for api_client
    ├── repository
    │   ├── AuditLogRepository.java            — JpaRepository + JpaSpecificationExecutor (REQ-AUD-03)
    │   └── ApiClientRepository.java           — JpaRepository<ApiClient, UUID>
    └── mapper
        └── AuditMapper.java                   — MapStruct: AuditLog ↔ AuditLogResponse

```

**Existing classes to migrate (package move only, no deletion):**

| Existing location | New location | Action |
|---|---|---|
| `entity/AppUser.java` | `auth/domain/AppUser.java` | Migrate + add new fields (see §3) |
| `entity/Role.java` | `user/domain/Role.java` | Migrate, no structural change |
| `entity/UserRole.java` | `user/domain/UserRole.java` | Migrate, no structural change |
| `entity/UserRoleId.java` | `user/domain/UserRoleId.java` | Migrate, no structural change |
| `repository/AppUserRepository.java` | `auth/repository/AppUserRepository.java` | Migrate + add methods (see §4) |
| `repository/RoleRepository.java` | `user/repository/RoleRepository.java` | Migrate, no structural change |
| `repository/UserRoleRepository.java` | `user/repository/UserRoleRepository.java` | Migrate, no structural change |
| `dto/response/ApiResponse.java` | `common/response/ApiResponse.java` | Migrate, no structural change |
| `dto/response/PagedResponse.java` | `common/response/PagedResponse.java` | Migrate, no structural change |
| `dto/response/UserResponse.java` | `user/api/UserResponse.java` | Replace with record (see §8) |
| `dto/response/RoleResponse.java` | `user/api/RoleResponse.java` | Replace with record (see §8) |
| `dto/request/CreateUserRequest.java` | `user/api/CreateUserRequest.java` | Replace with record (see §8) |
| `dto/request/UpdateUserRequest.java` | `user/api/UpdateUserRequest.java` | Replace with record (see §8) |
| `dto/request/UserStatusRequest.java` | `user/api/UserStatusRequest.java` | Replace with record (see §8) |

The `entity/Beneficiary.java`, `entity/Scheme.java`, `entity/Application.java` and their repositories are **not touched by the foundation slice**; they are migrated by the `beneficiary-documents` and `scheme-eligibility` slices. The old `enums/ApplicationStatus.java` is also left untouched — it will be replaced by the `application-workflow` slice.

---

## 2. Flyway Migrations

All migration files live in `src/main/resources/db/migration/`. File naming follows the rule `V{yyyyMMddHHmm}__{module}_{description}.sql`.

### 2.1 `V1__baseline.sql`

Reproduces the DB-001 schema exactly (REQ-DATA baseline, D-02). The FK `app_user.auth_user_id → auth.users(id)` is **omitted** — the `auth` schema does not exist in Docker Compose or Testcontainers and would cause Flyway to fail. The column remains nullable with no FK constraint.

```sql
-- V1__baseline.sql
-- Reproduces DB-001 (6 tables, seed data, triggers, indexes).
-- The auth_user_id FK to auth.users is intentionally omitted (Docker/test compat).

CREATE TABLE IF NOT EXISTS public.app_user (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id    UUID UNIQUE,
    full_name       VARCHAR(150) NOT NULL,
    email           VARCHAR(255) NOT NULL UNIQUE,
    phone           VARCHAR(20),
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.role (
    id          BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    name        VARCHAR(50)  NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_role (
    user_id     UUID   NOT NULL REFERENCES public.app_user(id) ON DELETE CASCADE,
    role_id     BIGINT NOT NULL REFERENCES public.role(id)     ON DELETE RESTRICT,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS public.scheme (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name             VARCHAR(200) NOT NULL,
    code             VARCHAR(50)  NOT NULL UNIQUE,
    description      TEXT,
    start_date       DATE NOT NULL,
    end_date         DATE NOT NULL,
    min_grant_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    max_grant_amount NUMERIC(15,2) NOT NULL,
    status           VARCHAR(20)  NOT NULL DEFAULT 'DRAFT'
                       CHECK (status IN ('DRAFT','OPEN','PAUSED','CLOSED')),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_scheme_dates        CHECK (end_date >= start_date),
    CONSTRAINT chk_scheme_grant_amount CHECK (min_grant_amount >= 0 AND max_grant_amount >= min_grant_amount)
);

CREATE TABLE IF NOT EXISTS public.beneficiary (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID UNIQUE REFERENCES public.app_user(id) ON DELETE SET NULL,
    beneficiary_type   VARCHAR(30) NOT NULL
                         CHECK (beneficiary_type IN ('INDIVIDUAL','ORGANIZATION','BUSINESS')),
    full_name          VARCHAR(150) NOT NULL,
    identity_reference VARCHAR(100) UNIQUE,
    email              VARCHAR(255),
    phone              VARCHAR(20),
    address            TEXT,
    region_code        VARCHAR(30),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.application (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_no     VARCHAR(40) NOT NULL UNIQUE,
    beneficiary_id   UUID NOT NULL REFERENCES public.beneficiary(id) ON DELETE RESTRICT,
    scheme_id        UUID NOT NULL REFERENCES public.scheme(id)      ON DELETE RESTRICT,
    requested_amount NUMERIC(15,2) NOT NULL,
    status           VARCHAR(30) NOT NULL DEFAULT 'DRAFT'
                       CHECK (status IN (
                         'DRAFT','SUBMITTED','UNDER_REVIEW','CLARIFICATION_REQUIRED',
                         'FIELD_VERIFIED','DISTRICT_APPROVED','FINANCE_APPROVED',
                         'REJECTED','DISBURSEMENT_IN_PROGRESS','COMPLETED','ON_HOLD'
                       )),
    submitted_at     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_application_amount CHECK (requested_amount > 0)
);

-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_app_user_updated_at   BEFORE UPDATE ON public.app_user    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_scheme_updated_at     BEFORE UPDATE ON public.scheme       FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_beneficiary_updated_at BEFORE UPDATE ON public.beneficiary FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_application_updated_at BEFORE UPDATE ON public.application FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_role_role_id      ON public.user_role(role_id);
CREATE INDEX IF NOT EXISTS idx_beneficiary_region     ON public.beneficiary(region_code);
CREATE INDEX IF NOT EXISTS idx_application_beneficiary ON public.application(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_application_scheme     ON public.application(scheme_id);
CREATE INDEX IF NOT EXISTS idx_application_status     ON public.application(status);
CREATE INDEX IF NOT EXISTS idx_application_submitted  ON public.application(submitted_at);

-- Seed roles (DB-001 seed data)
INSERT INTO public.role (name, description) VALUES
  ('BENEFICIARY',      'Can apply for schemes and track applications'),
  ('FIELD_OFFICER',    'Can verify beneficiary applications'),
  ('DISTRICT_OFFICER', 'Can review and approve applications at district level'),
  ('FINANCE_APPROVER', 'Can authorize grant disbursements'),
  ('ADMIN',            'Can manage schemes, users and platform configuration')
ON CONFLICT (name) DO NOTHING;

-- Seed demo users (DB-001 seed data)
INSERT INTO public.app_user (id, full_name, email, phone)
VALUES
  ('20000000-0000-4000-8000-000000000001', 'Rahul Sharma', 'rahul@example.com', '9876543210'),
  ('20000000-0000-4000-8000-000000000002', 'Priya Verma',  'priya@example.com', '9876543211')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.beneficiary (id, user_id, beneficiary_type, full_name, identity_reference, email, phone, address, region_code)
VALUES
  ('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','BUSINESS','Rahul Sharma','DEMO-BEN-001','rahul@example.com','9876543210','Bhopal, Madhya Pradesh','MP-BPL'),
  ('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','INDIVIDUAL','Priya Verma','DEMO-BEN-002','priya@example.com','9876543211','Vidisha, Madhya Pradesh','MP-VID')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_role (user_id, role_id)
SELECT u.id, r.id FROM public.app_user u CROSS JOIN public.role r
WHERE u.email IN ('rahul@example.com','priya@example.com') AND r.name = 'BENEFICIARY'
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO public.scheme (id, name, code, description, start_date, end_date, min_grant_amount, max_grant_amount, status)
VALUES ('10000000-0000-4000-8000-000000000001','Small Business Development Grant','SBDG-2026','Sample scheme for testing.',
        '2026-01-01','2027-12-31',10000.00,100000.00,'OPEN')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.application (id, reference_no, beneficiary_id, scheme_id, requested_amount, status, submitted_at)
VALUES
  ('40000000-0000-4000-8000-000000000001','APP-2026-0001','30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',75000.00,'SUBMITTED',NOW()),
  ('40000000-0000-4000-8000-000000000002','APP-2026-0002','30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001',50000.00,'SUBMITTED',NOW())
ON CONFLICT (id) DO NOTHING;
```

### 2.2 `V202611070001__foundation_auth_schema.sql`

Extends `app_user`, adds `region`, `user_region`, `system_setting`; seeds default settings; creates the `gsdts_app` DB role.

```sql
-- V202611070001__foundation_auth_schema.sql
-- Implements: REQ-AUTH-01..03, REQ-USR-01..04, D-02, D-03, D-15, D-17
-- Adds auth columns to app_user, creates region/user_region/system_setting, seeds settings.

-- ── app_user: add auth + version columns ─────────────────────────────────────
ALTER TABLE public.app_user
  ADD COLUMN IF NOT EXISTS username           VARCHAR(50)  UNIQUE,
  ADD COLUMN IF NOT EXISTS password_hash      VARCHAR(255),
  ADD COLUMN IF NOT EXISTS failed_login_count INT          NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS version            BIGINT       NOT NULL DEFAULT 0;

-- username/password_hash are NOT NULL for new rows; allow NULL during migration
-- (demo seed rows have no credentials — they are demonstration data only).
-- The application layer enforces NOT NULL via bean validation on registration.

-- ── region ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.region (
    id         BIGSERIAL PRIMARY KEY,
    code       VARCHAR(20)  NOT NULL UNIQUE
                 CONSTRAINT chk_region_code CHECK (code ~ '^[A-Z0-9_-]{2,20}$'),
    name       VARCHAR(100) NOT NULL,
    type       VARCHAR(10)  NOT NULL CHECK (type IN ('STATE','DISTRICT')),
    parent_id  BIGINT       REFERENCES public.region(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version    BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT chk_region_district_has_parent
        CHECK (type = 'STATE' OR parent_id IS NOT NULL)
);

CREATE TRIGGER trg_region_updated_at
  BEFORE UPDATE ON public.region
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ── user_region ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_region (
    user_id     UUID   NOT NULL REFERENCES public.app_user(id) ON DELETE CASCADE,
    region_id   BIGINT NOT NULL REFERENCES public.region(id)   ON DELETE RESTRICT,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, region_id)
);

-- ── system_setting ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.system_setting (
    key         VARCHAR(100) PRIMARY KEY,
    value       TEXT         NOT NULL,
    value_type  VARCHAR(10)  NOT NULL CHECK (value_type IN ('INT','MONEY','ENUM','BOOL')),
    description TEXT,
    updated_by  UUID         REFERENCES public.app_user(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_system_setting_updated_at
  BEFORE UPDATE ON public.system_setting
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ── Default system settings (requirements §5.4) ───────────────────────────────
INSERT INTO public.system_setting (key, value, value_type, description) VALUES
  ('risk.low.minScore',                '75',     'INT',  'Minimum score for LOW risk tier'),
  ('risk.low.maxAmount',               '50000.00','MONEY','Maximum amount for LOW risk tier'),
  ('risk.medium.minScore',             '50',     'INT',  'Minimum score for MEDIUM risk tier'),
  ('risk.medium.maxAmount',            '200000.00','MONEY','Maximum amount for MEDIUM risk tier'),
  ('compliance.graceDays',             '7',      'INT',  'Grace days before milestone becomes OVERDUE'),
  ('analytics.agingThresholdDays',     '15',     'INT',  'Days before an active application is considered aging'),
  ('treasury.mode',                    'API',    'ENUM', 'Treasury integration mode: API or MANUAL'),
  ('beneficiaryRegistry.verifyOnRegister','false','BOOL','Call BeneficiaryRegistryPort on registration'),
  ('auth.maxFailedLogins',             '5',      'INT',  'Failed login attempts before account lockout'),
  ('auth.lockMinutes',                 '15',     'INT',  'Account lockout duration in minutes')
ON CONFLICT (key) DO NOTHING;

-- ── Re-seed roles (idempotent; baseline already inserts them) ─────────────────
INSERT INTO public.role (name, description) VALUES
  ('BENEFICIARY',      'Can apply for schemes and track applications'),
  ('FIELD_OFFICER',    'Can verify beneficiary applications'),
  ('DISTRICT_OFFICER', 'Can review and approve applications at district level'),
  ('FINANCE_APPROVER', 'Can authorize grant disbursements'),
  ('ADMIN',            'Can manage schemes, users and platform configuration')
ON CONFLICT (name) DO NOTHING;

-- ── gsdts_app DB role (D-17) ──────────────────────────────────────────────────
-- Create the dedicated application role that the connection pool uses.
-- Grants SELECT/INSERT on all current tables; UPDATE/DELETE/TRUNCATE on audit_log
-- will be explicitly REVOKED in migration V202611070007 when that table is created.
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'gsdts_app') THEN
        CREATE ROLE gsdts_app LOGIN;
    END IF;
END
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO gsdts_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO gsdts_app;
-- NOTE: REVOKE UPDATE/DELETE/TRUNCATE ON audit_log FROM gsdts_app is applied in
--       V202611070007__foundation_audit_schema.sql once audit_log exists.
```

### 2.3 `V202611070007__foundation_audit_schema.sql`

Creates `audit_log`, `api_client`, `shedlock`; applies immutability controls (D-17, REQ-AUD-02).

```sql
-- V202611070007__foundation_audit_schema.sql
-- Implements: REQ-AUD-01..03, D-17 (audit immutability)
-- Depends on: V1__baseline, V202611070001__foundation_auth_schema

-- ── audit_log ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_log (
    id             BIGSERIAL    PRIMARY KEY,
    occurred_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    actor_id       UUID,                                     -- NULL for SYSTEM actor
    actor_role     VARCHAR(50),
    actor_type     VARCHAR(20)  NOT NULL
                     CHECK (actor_type IN ('USER','SYSTEM','API_CLIENT')),
    action         VARCHAR(100) NOT NULL,
    entity_type    VARCHAR(100) NOT NULL,
    entity_id      VARCHAR(100),
    reference_no   VARCHAR(40),
    old_value      JSONB,
    new_value      JSONB,
    remark         TEXT,
    correlation_id VARCHAR(100),
    ip_address     VARCHAR(45),
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    -- No updated_at, no version — append-only (D-17)
);

-- Required indexes (requirements §5.2)
CREATE INDEX IF NOT EXISTS idx_audit_log_reference_no   ON public.audit_log(reference_no, occurred_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity         ON public.audit_log(entity_type, entity_id);

-- ── api_client ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.api_client (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(50)  NOT NULL UNIQUE,       -- TREASURY, BENEFICIARY_DB
    key_hash   VARCHAR(255) NOT NULL,
    active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version    BIGINT       NOT NULL DEFAULT 0
);

CREATE TRIGGER trg_api_client_updated_at
  BEFORE UPDATE ON public.api_client
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ── shedlock (standard DDL) ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.shedlock (
    name       VARCHAR(64)  NOT NULL PRIMARY KEY,
    lock_until TIMESTAMPTZ  NOT NULL,
    locked_at  TIMESTAMPTZ  NOT NULL,
    locked_by  VARCHAR(255) NOT NULL
);

-- ── Immutability: grant + revoke for gsdts_app (D-17, AC-AUD-02.1) ───────────
GRANT SELECT, INSERT ON public.audit_log TO gsdts_app;
REVOKE UPDATE, DELETE, TRUNCATE ON public.audit_log FROM gsdts_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_client TO gsdts_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shedlock   TO gsdts_app;
GRANT USAGE, SELECT ON SEQUENCE public.audit_log_id_seq   TO gsdts_app;

-- ── Immutability trigger (D-17) ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.audit_log_immutability()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'audit_log rows are immutable';
END;
$$;

CREATE TRIGGER trg_audit_log_immutable
  BEFORE UPDATE OR DELETE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_immutability();
```

---

## 3. Entity Design

### 3.1 New entities

#### `Region` — `com.govgrants.subsidygrant.user.domain`

```java
@Entity
@Table(name = "region", schema = "public")
public class Region {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "code", nullable = false, unique = true, length = 20)
    private String code;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 10)
    private RegionType type;                         // STATE | DISTRICT

    @Column(name = "parent_id")
    private Long parentId;                           // null for STATE; set for DISTRICT

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    private long version;
}
```

#### `UserRegion` — `com.govgrants.subsidygrant.user.domain`

```java
@Entity
@Table(name = "user_region", schema = "public")
public class UserRegion {

    @EmbeddedId
    private UserRegionId id;                         // composite PK: userId (UUID) + regionId (Long)

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("userId")
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("regionId")
    @JoinColumn(name = "region_id", nullable = false)
    private Region region;

    @Column(name = "assigned_at", nullable = false, updatable = false)
    private Instant assignedAt;                      // set in @PrePersist; no version (append-only)

    @PrePersist
    protected void onCreate() { if (assignedAt == null) assignedAt = Instant.now(); }
}

@Embeddable
public class UserRegionId implements Serializable {
    @Column(name = "user_id")   private UUID userId;
    @Column(name = "region_id") private Long regionId;
    // equals, hashCode
}
```

#### `SystemSetting` — `com.govgrants.subsidygrant.user.domain`

```java
@Entity
@Table(name = "system_setting", schema = "public")
public class SystemSetting {

    @Id
    @Column(name = "key", length = 100)
    private String key;

    @Column(name = "value", nullable = false, columnDefinition = "TEXT")
    private String value;

    @Enumerated(EnumType.STRING)
    @Column(name = "value_type", nullable = false, length = 10)
    private SettingValueType valueType;              // INT | MONEY | ENUM | BOOL

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "updated_by")
    private UUID updatedBy;                          // actor who last changed this setting

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
    // No @Version — key is PK and value is replaced atomically; no concurrent-write use case
}
```

#### `AuditLog` — `com.govgrants.subsidygrant.audit.domain`

```java
@Entity
@Table(name = "audit_log", schema = "public")
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "occurred_at", nullable = false, updatable = false)
    private Instant occurredAt;

    @Column(name = "actor_id", updatable = false)
    private UUID actorId;                            // null when actor_type = SYSTEM

    @Column(name = "actor_role", length = 50, updatable = false)
    private String actorRole;

    @Enumerated(EnumType.STRING)
    @Column(name = "actor_type", nullable = false, length = 20, updatable = false)
    private ActorType actorType;                     // USER | SYSTEM | API_CLIENT

    @Column(name = "action", nullable = false, length = 100, updatable = false)
    private String action;

    @Column(name = "entity_type", nullable = false, length = 100, updatable = false)
    private String entityType;

    @Column(name = "entity_id", length = 100, updatable = false)
    private String entityId;

    @Column(name = "reference_no", length = 40, updatable = false)
    private String referenceNo;

    @Column(name = "old_value", columnDefinition = "jsonb", updatable = false)
    private String oldValue;                         // JSON string; serialized by AuditService

    @Column(name = "new_value", columnDefinition = "jsonb", updatable = false)
    private String newValue;

    @Column(name = "remark", columnDefinition = "TEXT", updatable = false)
    private String remark;

    @Column(name = "correlation_id", length = 100, updatable = false)
    private String correlationId;

    @Column(name = "ip_address", length = 45, updatable = false)
    private String ipAddress;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    // No updated_at, no @Version — immutable by design (D-17)
}
```

#### `ApiClient` — `com.govgrants.subsidygrant.audit.domain`

```java
@Entity
@Table(name = "api_client", schema = "public")
public class ApiClient {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "name", nullable = false, unique = true, length = 50)
    private String name;                             // TREASURY | BENEFICIARY_DB

    @Column(name = "key_hash", nullable = false, length = 255)
    private String keyHash;                          // BCrypt hash of the API key

    @Column(name = "active", nullable = false)
    private boolean active;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    private long version;
}
```

### 3.2 Existing entities: changes required

#### `AppUser` — add fields (REQ-AUTH-01, REQ-AUTH-02, D-03)

The following fields are added. All other existing fields are retained unchanged. The `@PrePersist`/`@PreUpdate` lifecycle methods are replaced by Hibernate `@CreationTimestamp`/`@UpdateTimestamp` for consistency with the new entities; the existing demo-seed rows already have timestamps so this is a safe swap.

```java
// New fields to add to AppUser (com.govgrants.subsidygrant.auth.domain)

@Column(name = "username", unique = true, length = 50)
private String username;                 // NOT NULL for new users; nullable only for legacy demo seed rows

@Column(name = "password_hash", length = 255)
private String passwordHash;             // BCrypt(12); nullable only for legacy demo seed rows

@Column(name = "failed_login_count", nullable = false)
private int failedLoginCount = 0;        // AC-AUTH-02.2, AC-AUTH-02.3

@Column(name = "locked_until")
private Instant lockedUntil;             // null = not locked; AC-AUTH-02.3, AC-AUTH-02.5

@Version
@Column(name = "version", nullable = false)
private long version;                    // optimistic locking (REQ-BEN-03.3 pattern)

// Replace @PrePersist/@PreUpdate with:
@CreationTimestamp
@Column(name = "created_at", nullable = false, updatable = false)
private Instant createdAt;

@UpdateTimestamp
@Column(name = "updated_at", nullable = false)
private Instant updatedAt;

// auth_user_id stays as-is; never set by the app (D-03, AC-AUTH-01.3)
```

---

## 4. Repository Design

### 4.1 `AppUserRepository` — `com.govgrants.subsidygrant.auth.repository`

```java
public interface AppUserRepository extends JpaRepository<AppUser, UUID> {

    Optional<AppUser> findByUsername(String username);
    Optional<AppUser> findByUsernameIgnoreCase(String username);
    boolean existsByUsernameIgnoreCase(String username);
    boolean existsByEmailIgnoreCase(String email);

    // Existing methods retained:
    Optional<AppUser> findByEmail(String email);
    boolean existsByEmail(String email);

    // Eager-load roles in one query (avoids N+1 in /auth/me and JWT filter)
    @Query("SELECT u FROM AppUser u LEFT JOIN FETCH u.userRoles ur LEFT JOIN FETCH ur.role WHERE u.id = :id")
    Optional<AppUser> findByIdWithRoles(@Param("id") UUID id);

    @Query("SELECT u FROM AppUser u LEFT JOIN FETCH u.userRoles ur LEFT JOIN FETCH ur.role WHERE u.username = :username")
    Optional<AppUser> findByUsernameWithRoles(@Param("username") String username);
}
```

### 4.2 `RegionRepository` — `com.govgrants.subsidygrant.user.repository`

```java
public interface RegionRepository extends JpaRepository<Region, Long> {

    Optional<Region> findByCode(String code);
    boolean existsByCode(String code);
    List<Region> findByType(RegionType type);
    List<Region> findByParentId(Long parentId);
    List<Region> findByTypeAndParentId(RegionType type, Long parentId);

    // Recursive CTE to find all descendant IDs including self (used by RegionQueryService)
    @Query(value = """
        WITH RECURSIVE descendants AS (
            SELECT id FROM public.region WHERE id = :rootId
            UNION ALL
            SELECT r.id FROM public.region r
            INNER JOIN descendants d ON r.parent_id = d.id
        )
        SELECT id FROM descendants
        """, nativeQuery = true)
    List<Long> findDescendantIds(@Param("rootId") Long rootId);
}
```

### 4.3 `UserRegionRepository` — `com.govgrants.subsidygrant.user.repository`

```java
public interface UserRegionRepository extends JpaRepository<UserRegion, UserRegionId> {

    List<UserRegion> findByIdUserId(UUID userId);
    void deleteByIdUserId(UUID userId);

    @Query("SELECT ur.id.regionId FROM UserRegion ur WHERE ur.id.userId = :userId")
    List<Long> findRegionIdsByUserId(@Param("userId") UUID userId);

    // Count active FIELD_PENDING assignments (used by AC-USR-01.7, AC-USR-01.8)
    @Query("""
        SELECT COUNT(a) FROM Application a
        WHERE a.assignedFieldOfficer.id = :officerId
          AND a.status = com.govgrants.subsidygrant.application.domain.ApplicationStatus.FIELD_PENDING
        """)
    long countActiveFieldPendingByOfficer(@Param("officerId") UUID officerId);
}
```

### 4.4 `SystemSettingRepository` — `com.govgrants.subsidygrant.user.repository`

```java
// All keys are known at seed time; basic JpaRepository suffices.
public interface SystemSettingRepository extends JpaRepository<SystemSetting, String> {
    // No custom methods needed; findById(key) and save(setting) cover all use cases.
}
```

### 4.5 `RoleRepository` — `com.govgrants.subsidygrant.user.repository`

```java
// Existing repository; migrated to new package.
public interface RoleRepository extends JpaRepository<Role, Long> {
    Optional<Role> findByName(String name);  // used by AC-USR-01.7, AC-USR-02.1
    boolean existsByName(String name);
}
```

### 4.6 `UserRoleRepository` — `com.govgrants.subsidygrant.user.repository`

```java
// Existing repository; migrated to new package. Add helper queries.
public interface UserRoleRepository extends JpaRepository<UserRole, UserRoleId> {
    List<UserRole> findByIdUserId(UUID userId);
    void deleteByIdUserId(UUID userId);
    boolean existsByIdUserIdAndRoleName(UUID userId, String roleName);
}
```

### 4.7 `AuditLogRepository` — `com.govgrants.subsidygrant.audit.repository`

```java
// JpaSpecificationExecutor enables the filtered GET /audit endpoint (REQ-AUD-03).
// No custom delete/update methods — the entity is immutable (D-17).
public interface AuditLogRepository
        extends JpaRepository<AuditLog, Long>, JpaSpecificationExecutor<AuditLog> {
    // Spring Data provides findAll(Specification, Pageable) automatically.
}
```

### 4.8 `ApiClientRepository` — `com.govgrants.subsidygrant.audit.repository`

```java
public interface ApiClientRepository extends JpaRepository<ApiClient, UUID> {
    Optional<ApiClient> findByName(String name);
    Optional<ApiClient> findByKeyHash(String keyHash);
}
```

---

## 5. Service Design

### 5.1 `common` module

#### `CorrelationIdFilter` — `com.govgrants.subsidygrant.common.filter`

```java
// OncePerRequestFilter (REQ-AUD-01, AC-AUD-01.3)
public class CorrelationIdFilter extends OncePerRequestFilter {
    public static final String HEADER = "X-Correlation-Id";
    public static final String MDC_KEY = "correlationId";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException;
    // Reads header; generates UUID if absent; stores in MDC; sets response header; cleans MDC in finally.
}
```

#### `GlobalExceptionHandler` — `com.govgrants.subsidygrant.common.api`

```java
// @RestControllerAdvice — maps every exception type to ApiResponse<Void> with appropriate HTTP status
// and ErrorCode from requirements §11.2 / §8 (D-08).
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNotFound(ResourceNotFoundException ex);       // 404

    @ExceptionHandler(DuplicateResourceException.class)
    public ResponseEntity<ApiResponse<Void>> handleDuplicate(DuplicateResourceException ex);    // 409

    @ExceptionHandler(ResourceInUseException.class)
    public ResponseEntity<ApiResponse<Void>> handleInUse(ResourceInUseException ex);            // 409

    @ExceptionHandler(ConcurrentModificationException.class)
    public ResponseEntity<ApiResponse<Void>> handleConcurrency(ConcurrentModificationException ex); // 409

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDenied(AccessDeniedException ex);      // 403

    @ExceptionHandler(BusinessRuleException.class)
    public ResponseEntity<ApiResponse<Void>> handleBusinessRule(BusinessRuleException ex);      // 422

    @ExceptionHandler(TooManyAttemptsException.class)
    public ResponseEntity<ApiResponse<Void>> handleTooManyAttempts(TooManyAttemptsException ex); // 429

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException ex); // 400

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Void>> handleMalformedJson(HttpMessageNotReadableException ex); // 400

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGeneric(Exception ex);                        // 500
}
```

### 5.2 `auth` module

#### `AuthService` — `com.govgrants.subsidygrant.auth.service`

```java
// Implements REQ-AUTH-01, REQ-AUTH-02 (AC-AUTH-01.1–01.3, AC-AUTH-02.1–02.5)
public class AuthService {

    private final AppUserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;    // BCrypt strength 12
    private final JwtService jwtService;
    private final AuditService auditService;
    private final SettingsCacheService settingsCache;

    // AC-AUTH-01.1–01.3: validates, hashes password, assigns BENEFICIARY role, writes audit
    public UserResponse register(RegisterRequest request);

    // AC-AUTH-02.1–02.5: validates credentials, handles lockout, generates JWT, writes audit
    public TokenResponse login(LoginRequest request);

    // AC-AUTH-03.4: returns current user's profile (called by controller after JWT filter runs)
    public UserResponse getCurrentUser(ActorContext actor);
}
```

#### `JwtService` — `com.govgrants.subsidygrant.auth.service`

```java
// HS256, 30-min expiry (AC-AUTH-02.1, AC-AUTH-03.1)
public class JwtService {

    // Secret injected from ${app.jwt.secret} (≥ 256-bit, from env JWT_SECRET)
    private final String secret;
    private final long expirationMinutes;            // 30

    // Claims: sub=userId, roles=[roleName], iat, exp
    public String generateToken(AppUser user);

    public UUID extractUserId(String token);
    public String extractRole(String token);
    public boolean isTokenValid(String token);       // signature + expiry check
    public boolean isTokenExpired(String token);
}
```

#### `JwtAuthFilter` — `com.govgrants.subsidygrant.auth.filter`

```java
// OncePerRequestFilter (AC-AUTH-03.1–03.3)
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final AppUserRepository userRepository;
    private final UserStatusCache userStatusCache;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException;
    // 1. Extract Bearer token from Authorization header; skip if absent.
    // 2. Validate token signature and expiry; return 401 if invalid.
    // 3. Load active status from UserStatusCache (TTL 60 s); return 401 if inactive.
    // 4. Build UsernamePasswordAuthenticationToken and set SecurityContextHolder.
    // 5. Build ActorContext (userId, role, regionIds, correlationId, ipAddress) and attach to request attribute.

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request);
    // Skips /api/v1/auth/register, /api/v1/auth/login, /v3/api-docs/**, /swagger-ui/**, /actuator/health
}
```

#### `UserStatusCache` — `com.govgrants.subsidygrant.auth.service`

```java
// Caffeine cache: UUID → Boolean(active), TTL 60 s (AC-AUTH-03.2)
@Component
public class UserStatusCache {

    // Built with Caffeine.newBuilder().expireAfterWrite(60, TimeUnit.SECONDS)
    private final Cache<UUID, Boolean> cache;
    private final AppUserRepository userRepository;

    public boolean isActive(UUID userId);
    public void evict(UUID userId);                  // called by UserService.setStatus()
}
```

### 5.3 `user` module

#### `UserService` — `com.govgrants.subsidygrant.user.service`

```java
// Implements REQ-USR-01 (AC-USR-01.1–01.9). All methods require ADMIN role (enforced inside).
public class UserService {

    private final AppUserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final UserRegionRepository userRegionRepository;
    private final RegionQueryService regionQueryService;
    private final AuditService auditService;
    private final UserStatusCache userStatusCache;
    private final PasswordEncoder passwordEncoder;

    // AC-USR-01.1: creates staff user with role and regions; validates region binding per §4.1
    public UserResponse createUser(CreateUserRequest request, ActorContext actor);

    // AC-USR-01.3: paginated list with filters role/regionId/active/q
    public Page<UserSummaryResponse> listUsers(UserFilter filter, Pageable pageable, ActorContext actor);

    // AC-USR-01.3: single user lookup; 404 if missing
    public UserResponse getUser(UUID id, ActorContext actor);

    // AC-USR-01.4: updates fullName and phone only
    public UserResponse updateUser(UUID id, UpdateUserRequest request, ActorContext actor);

    // AC-USR-01.5: activates or deactivates; evicts UserStatusCache; 422 if self-deactivation
    public void setStatus(UUID id, boolean active, ActorContext actor);

    // AC-USR-01.6: deletes only if no workflow/audit references; 409 otherwise
    public void deleteUser(UUID id, ActorContext actor);

    // AC-USR-01.7: replaces single role; 422 if active FIELD_PENDING assignments exist
    public UserResponse changeRole(UUID id, ChangeRoleRequest request, ActorContext actor);

    // AC-USR-01.8: replaces region bindings; 422 if active FIELD_PENDING assignments exist
    public UserResponse changeRegions(UUID id, ChangeRegionsRequest request, ActorContext actor);

    // AC-USR-01.9: returns assigned roles
    public List<RoleResponse> getUserRoles(UUID id, ActorContext actor);
}
```

#### `UserQueryService` — `com.govgrants.subsidygrant.user.service` (interface + impl)

```java
// Consumed by other slices (requirements §10)
public interface UserQueryService {
    AppUser getById(UUID userId);                    // throws ResourceNotFoundException
    boolean hasRole(UUID userId, String roleName);
    List<Long> getRegionIds(UUID userId);            // bound region IDs
}
```

#### `RegionService` — `com.govgrants.subsidygrant.user.service`

```java
// Implements REQ-USR-03 (AC-USR-03.1–03.2)
public class RegionService {

    private final RegionRepository regionRepository;
    private final AuditService auditService;

    // AC-USR-03.2: validates code format, ensures DISTRICT has a STATE parent
    public RegionResponse createRegion(CreateRegionRequest request, ActorContext actor);

    // AC-USR-03.2: updates name only (code and type immutable after create)
    public RegionResponse updateRegion(Long id, UpdateRegionRequest request, ActorContext actor);

    // AC-USR-03.1: single lookup; 404 if missing
    public RegionResponse getRegion(Long id);

    // AC-USR-03.1: list with optional type/parentId filters
    public List<RegionResponse> listRegions(RegionType type, Long parentId);
}
```

#### `RegionQueryService` — `com.govgrants.subsidygrant.user.service` (interface + impl)

```java
// Consumed by other slices (requirements §10)
public interface RegionQueryService {
    Region getById(Long regionId);                              // throws ResourceNotFoundException
    boolean isDescendantOf(Long regionId, Long ancestorId);    // includes self
    List<Long> getDescendantIds(Long regionId);                // includes self; uses recursive CTE
}
```

#### `SettingService` — `com.govgrants.subsidygrant.user.service`

```java
// Implements REQ-USR-04 (AC-USR-04.1–04.3)
public class SettingService {

    private final SystemSettingRepository settingRepository;
    private final SettingsCacheService settingsCache;
    private final AuditService auditService;

    // AC-USR-04.1: 404 if key unknown; validates value against value_type (400 if invalid)
    public SettingResponse updateSetting(String key, UpdateSettingRequest request, ActorContext actor);

    // AC-USR-04.1: returns all settings
    public List<SettingResponse> getAllSettings(ActorContext actor);

    // AC-USR-04.1: single setting by key; 404 if unknown
    public SettingResponse getSetting(String key, ActorContext actor);
}
```

#### `SettingsCacheService` — `com.govgrants.subsidygrant.user.service`

```java
// Caffeine TTL-60 s cache over SystemSettingRepository (AC-USR-04.3)
@Component
public class SettingsCacheService {

    // Cache eviction on update is called by SettingService.updateSetting()
    private final Cache<String, String> cache;
    private final SystemSettingRepository settingRepository;

    public String getValue(String key);
    public int getInt(String key);
    public BigDecimal getMoney(String key);
    public boolean getBool(String key);
    public void evict(String key);                   // called after every PUT /settings/{key}
}
```

### 5.4 `audit` module

#### `AuditService` — `com.govgrants.subsidygrant.audit.service`

```java
// Implements REQ-AUD-01, REQ-AUD-03 (AC-AUD-01.1–01.4, AC-AUD-03.1)
public class AuditService {

    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;         // Jackson; serializes old/new value maps to JSONB

    // AC-AUD-01.1: writes synchronously in the calling transaction; masks PII fields (AC-AUD-01.2)
    public void record(AuditEntry entry, ActorContext actor);

    // AC-AUD-01.4: actor_type=SYSTEM, actor_id=null, actor_role='SYSTEM' (for scheduled jobs)
    public void recordSystem(AuditEntry entry);

    // AC-AUD-03.1: filtered, paginated query; ordered by occurred_at ASC, id ASC
    public Page<AuditLogResponse> queryAudit(AuditFilter filter, Pageable pageable);
}
```

#### `AuditEntry` — `com.govgrants.subsidygrant.audit.service`

```java
// Immutable value record passed to AuditService.record() — no I/O, no Spring dependency
public record AuditEntry(
    String action,
    String entityType,
    String entityId,
    String referenceNo,                              // null for non-application entities
    Map<String, Object> oldValue,                    // only changed fields; PII excluded
    Map<String, Object> newValue,
    String remark
) {}
```

#### `PiiMaskingUtil` — `com.govgrants.subsidygrant.audit.service`

```java
// Static utility; no Spring context needed (AC-AUD-01.2)
public final class PiiMaskingUtil {

    private PiiMaskingUtil() {}

    // "john.doe@example.com" → "j***@example.com"
    public static String maskEmail(String email);

    // "9876543210" → "XXXXXX3210"  (last 4 visible)
    public static String maskPhone(String phone);
}
```

### 5.5 `ActorContext` record (shared across all slices)

```java
// com.govgrants.subsidygrant.common.domain — constructed by JwtAuthFilter; never constructed elsewhere
public record ActorContext(
    UUID userId,
    String role,
    List<Long> regionIds,
    String correlationId,
    String ipAddress
) {
    // Convenience: returns true if the user has the given role name
    public boolean hasRole(String roleName) { return roleName.equals(this.role); }

    // Factory for system/job context (AC-AUD-01.4)
    public static ActorContext system(String correlationId) {
        return new ActorContext(null, "SYSTEM", List.of(), correlationId, null);
    }
}
```

---

## 6. Security Configuration

```java
// com.govgrants.subsidygrant.auth.config.SecurityConfig
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                    "/api/v1/auth/register",
                    "/api/v1/auth/login",
                    "/v3/api-docs/**",
                    "/swagger-ui/**",
                    "/swagger-ui.html",
                    "/actuator/health"
                ).permitAll()
                .anyRequest().authenticated()
            )
            // JwtAuthFilter runs before the standard username/password filter.
            // It sets the SecurityContextHolder and attaches ActorContext to the request.
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(/* returns 401 JSON */)
                .accessDeniedHandler(/* returns 403 JSON */)
            )
            .build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);        // strength 12 (AC-AUTH-01.1)
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config)
            throws Exception {
        return config.getAuthenticationManager();
    }
}
```

**Notes:**
- No OAuth2 Resource Server auto-configuration is used. JWT validation is handled entirely by `JwtService` + `JwtAuthFilter`, which keeps the implementation self-contained (D-03).
- `spring-boot-starter-oauth2-resource-server` is listed in §9 as a declared dependency but its auto-configuration is left disabled; only the JJWT library is used for token operations.
- Role enforcement is done in service methods and controllers via `ActorContext.hasRole()` checks and `@PreAuthorize` annotations, not via Spring Security's `hasRole()` DSL, to keep it testable without a full security context.

---

## 7. Controller Design

### 7.1 `AuthController` — `com.govgrants.subsidygrant.auth.api`

| Method | Path | Request | Response | Service call | ACs |
|---|---|---|---|---|---|
| POST | `/api/v1/auth/register` | `@RequestBody RegisterRequest` | `201 ApiResponse<UserResponse>` | `authService.register(request)` | AC-AUTH-01.1–01.3 |
| POST | `/api/v1/auth/login` | `@RequestBody LoginRequest` | `200 ApiResponse<TokenResponse>` | `authService.login(request)` | AC-AUTH-02.1–02.5 |
| GET | `/api/v1/auth/me` | `@AuthenticationPrincipal` / request attribute | `200 ApiResponse<UserResponse>` | `authService.getCurrentUser(actor)` | AC-AUTH-03.4 |

### 7.2 `UserController` — `com.govgrants.subsidygrant.user.api`

All endpoints require role `ADMIN`.

| Method | Path | Request | Response | Service call | ACs |
|---|---|---|---|---|---|
| POST | `/api/v1/users` | `@RequestBody @Valid CreateUserRequest` | `201 ApiResponse<UserResponse>` | `userService.createUser(req, actor)` | AC-USR-01.1, AC-USR-01.2 |
| GET | `/api/v1/users` | Query params: `role`, `regionId`, `active`, `q`, `page`, `size` | `200 ApiResponse<PagedResponse<UserSummaryResponse>>` | `userService.listUsers(filter, pageable, actor)` | AC-USR-01.3 |
| GET | `/api/v1/users/{id}` | `@PathVariable UUID id` | `200 ApiResponse<UserResponse>` | `userService.getUser(id, actor)` | AC-USR-01.3 |
| PUT | `/api/v1/users/{id}` | `@RequestBody @Valid UpdateUserRequest` | `200 ApiResponse<UserResponse>` | `userService.updateUser(id, req, actor)` | AC-USR-01.4 |
| PATCH | `/api/v1/users/{id}/status` | `@RequestBody @Valid UserStatusRequest` | `200 ApiResponse<Void>` | `userService.setStatus(id, req.active(), actor)` | AC-USR-01.5 |
| DELETE | `/api/v1/users/{id}` | `@PathVariable UUID id` | `204` | `userService.deleteUser(id, actor)` | AC-USR-01.6 |
| PUT | `/api/v1/users/{id}/role` | `@RequestBody @Valid ChangeRoleRequest` | `200 ApiResponse<UserResponse>` | `userService.changeRole(id, req, actor)` | AC-USR-01.7 |
| PUT | `/api/v1/users/{id}/regions` | `@RequestBody @Valid ChangeRegionsRequest` | `200 ApiResponse<UserResponse>` | `userService.changeRegions(id, req, actor)` | AC-USR-01.8 |
| GET | `/api/v1/users/{id}/roles` | `@PathVariable UUID id` | `200 ApiResponse<List<RoleResponse>>` | `userService.getUserRoles(id, actor)` | AC-USR-01.9 |

### 7.3 `RoleController` — `com.govgrants.subsidygrant.user.api`

Requires role `ADMIN` (REQ-USR-02).

| Method | Path | Request | Response | Service call | ACs |
|---|---|---|---|---|---|
| GET | `/api/v1/roles` | — | `200 ApiResponse<List<RoleResponse>>` | `roleService.listRoles()` | AC-USR-02.1 |
| GET | `/api/v1/roles/{id}` | `@PathVariable Long id` | `200 ApiResponse<RoleResponse>` | `roleService.getRole(id)` | AC-USR-02.1 |
| GET | `/api/v1/roles/name/{name}` | `@PathVariable String name` | `200 ApiResponse<RoleResponse>` | `roleService.getRoleByName(name)` | AC-USR-02.1 |

No POST/PUT/DELETE endpoints — `AC-USR-02.2`.

`RoleService` is a thin read-only service wrapping `RoleRepository`.

### 7.4 `RegionController` — `com.govgrants.subsidygrant.user.api`

| Method | Path | Roles | Request | Response | Service call | ACs |
|---|---|---|---|---|---|---|
| GET | `/api/v1/regions` | Any authenticated | Query params: `type`, `parentId` | `200 ApiResponse<List<RegionResponse>>` | `regionService.listRegions(type, parentId)` | AC-USR-03.1 |
| GET | `/api/v1/regions/{id}` | Any authenticated | `@PathVariable Long id` | `200 ApiResponse<RegionResponse>` | `regionService.getRegion(id)` | AC-USR-03.1 |
| POST | `/api/v1/regions` | ADMIN | `@RequestBody @Valid CreateRegionRequest` | `201 ApiResponse<RegionResponse>` | `regionService.createRegion(req, actor)` | AC-USR-03.2 |
| PUT | `/api/v1/regions/{id}` | ADMIN | `@RequestBody @Valid UpdateRegionRequest` | `200 ApiResponse<RegionResponse>` | `regionService.updateRegion(id, req, actor)` | AC-USR-03.2 |

No DELETE endpoint — `AC-USR-03.2` (region in-use constraint enforced by FK; no delete route exposed).

### 7.5 `SettingController` — `com.govgrants.subsidygrant.user.api`

Requires role `ADMIN` (REQ-USR-04).

| Method | Path | Request | Response | Service call | ACs |
|---|---|---|---|---|---|
| GET | `/api/v1/settings` | — | `200 ApiResponse<List<SettingResponse>>` | `settingService.getAllSettings(actor)` | AC-USR-04.1 |
| PUT | `/api/v1/settings/{key}` | `@RequestBody @Valid UpdateSettingRequest` | `200 ApiResponse<SettingResponse>` | `settingService.updateSetting(key, req, actor)` | AC-USR-04.1, AC-USR-04.2 |

No POST/DELETE — all keys are seeded; unknown key returns 404.

### 7.6 `AuditController` — `com.govgrants.subsidygrant.audit.api`

Requires role `ADMIN` (REQ-AUD-03, INV-01).

| Method | Path | Request | Response | Service call | ACs |
|---|---|---|---|---|---|
| GET | `/api/v1/audit` | Query params: `referenceNo`, `entityType`, `entityId`, `actorId`, `from`, `to`, `page`, `size` | `200 ApiResponse<PagedResponse<AuditLogResponse>>` | `auditService.queryAudit(filter, pageable)` | AC-AUD-03.1, AC-AUD-03.2 |

---

## 8. DTO Design

All new DTOs are Java `record`s. Existing Lombok DTOs in `dto/request` and `dto/response` are converted to records during the migration step. `ApiResponse<T>` and `PagedResponse<T>` remain as Lombok classes (they use `@Builder` generics patterns that records handle differently and they have no migration benefit).

```java
// ── auth ──────────────────────────────────────────────────────────────────────

// AC-AUTH-01.1
public record RegisterRequest(
    @NotBlank @Size(min=4, max=50) @Pattern(regexp="^[a-zA-Z0-9._-]+$") String username,
    @NotBlank @Size(min=8, max=72)                                         String password,  // ≥1 letter, ≥1 digit validated in service
    @NotBlank @Size(min=2, max=150)                                        String fullName,
    @NotBlank @Email                                                        String email,
    @Pattern(regexp="^(\\+91)?[6-9]\\d{9}$")                              String phone      // optional
) {}

// AC-AUTH-02.1
public record LoginRequest(
    @NotBlank String username,
    @NotBlank String password
) {}

// AC-AUTH-02.1
public record TokenResponse(
    String accessToken,
    String tokenType,         // always "Bearer"
    Instant expiresAt
) {}

// ── user ──────────────────────────────────────────────────────────────────────

// REQ-USR-01; replaces existing Lombok UserResponse
public record UserResponse(
    UUID id,
    String username,
    String fullName,
    String email,
    String phone,
    Boolean active,
    String role,              // single role name (D-15)
    List<Long> regionIds,
    Instant createdAt,
    Instant updatedAt
) {}

// Lightweight list item (GET /users pagination)
public record UserSummaryResponse(
    UUID id,
    String username,
    String fullName,
    String email,
    Boolean active,
    String role
) {}

// AC-USR-01.1; replaces existing Lombok CreateUserRequest
public record CreateUserRequest(
    @NotBlank @Size(min=4, max=50) @Pattern(regexp="^[a-zA-Z0-9._-]+$") String username,
    @NotBlank @Size(min=8, max=72)                                         String password,
    @NotBlank @Size(min=2, max=150)                                        String fullName,
    @NotBlank @Email                                                        String email,
    @Pattern(regexp="^(\\+91)?[6-9]\\d{9}$")                              String phone,
    @NotNull                                                               Long roleId,
    @NotNull                                                               List<Long> regionIds
) {}

// AC-USR-01.4; replaces existing Lombok UpdateUserRequest
public record UpdateUserRequest(
    @NotBlank @Size(min=2, max=150)                String fullName,
    @Pattern(regexp="^(\\+91)?[6-9]\\d{9}$")      String phone
) {}

// AC-USR-01.5; replaces existing Lombok UserStatusRequest
public record UserStatusRequest(
    @NotNull Boolean active
) {}

// AC-USR-01.7
public record ChangeRoleRequest(
    @NotNull Long roleId
) {}

// AC-USR-01.8
public record ChangeRegionsRequest(
    @NotNull @Size(min=1) List<Long> regionIds
) {}

// REQ-USR-02; replaces existing Lombok RoleResponse
public record RoleResponse(
    Long id,
    String name,
    String description,
    Instant createdAt
) {}

// ── region ────────────────────────────────────────────────────────────────────

public record RegionResponse(
    Long id,
    String code,
    String name,
    RegionType type,
    Long parentId
) {}

// AC-USR-03.2
public record CreateRegionRequest(
    @NotBlank @Pattern(regexp="^[A-Z0-9_-]{2,20}$") String code,
    @NotBlank @Size(max=100)                          String name,
    @NotNull                                          RegionType type,
    Long parentId                                     // required when type=DISTRICT
) {}

public record UpdateRegionRequest(
    @NotBlank @Size(max=100) String name             // code and type are immutable after creation
) {}

// ── setting ───────────────────────────────────────────────────────────────────

public record SettingResponse(
    String key,
    String value,
    SettingValueType valueType,
    String description,
    UUID updatedBy,
    Instant updatedAt
) {}

// AC-USR-04.1
public record UpdateSettingRequest(
    @NotBlank String value
) {}

// ── audit ─────────────────────────────────────────────────────────────────────

public record AuditLogResponse(
    Long id,
    Instant occurredAt,
    UUID actorId,
    String actorRole,
    ActorType actorType,
    String action,
    String entityType,
    String entityId,
    String referenceNo,
    Object oldValue,          // deserialized from JSONB; returned as-is in response
    Object newValue,
    String remark,
    String correlationId,
    String ipAddress
) {}

// ── common ────────────────────────────────────────────────────────────────────

// Not a new record — ApiResponse<T> and PagedResponse<T> stay as Lombok classes.
// They are migrated to com.govgrants.subsidygrant.common.response.
```

---

## 9. `pom.xml` Additions Required

**Change the Java version property:**
```xml
<java.version>21</java.version>   <!-- was 17; D-01 requires Java 21 -->
```

**Dependencies to add or uncomment:**

| Dependency | GroupId | ArtifactId | Version | Note |
|---|---|---|---|---|
| Spring Security | `org.springframework.boot` | `spring-boot-starter-security` | BOM | Uncomment the existing commented block |
| Spring Security Test | `org.springframework.boot` | `spring-boot-starter-security-test` | BOM | Uncomment the existing commented block |
| JWT API | `io.jsonwebtoken` | `jjwt-api` | `0.12.6` | Explicit version; not in Boot BOM |
| JWT Impl | `io.jsonwebtoken` | `jjwt-impl` | `0.12.6` | `scope=runtime` |
| JWT Jackson | `io.jsonwebtoken` | `jjwt-jackson` | `0.12.6` | `scope=runtime` |
| Flyway Core | `org.flywaydb` | `flyway-core` | BOM | Add (BOM-managed by Spring Boot) |
| Flyway PostgreSQL | `org.flywaydb` | `flyway-database-postgresql` | BOM | Add (BOM-managed by Spring Boot 4) |
| MapStruct | `org.mapstruct` | `mapstruct` | `1.6.3` | Compile scope |
| MapStruct Processor | `org.mapstruct` | `mapstruct-processor` | `1.6.3` | Add to `annotationProcessorPaths` in compiler plugin |
| Caffeine | `com.github.ben-manes.caffeine` | `caffeine` | BOM | BOM-managed in Spring Boot (spring-boot-starter-cache pulls it) |
| Spring Cache | `org.springframework.boot` | `spring-boot-starter-cache` | BOM | Needed to wire Caffeine as the cache manager |
| ShedLock Spring | `net.javacrumbs.shedlock` | `shedlock-spring` | `6.3.0` | Explicit version |
| ShedLock JDBC | `net.javacrumbs.shedlock` | `shedlock-provider-jdbc-template` | `6.3.0` | Explicit version |
| Spring Boot Actuator | `org.springframework.boot` | `spring-boot-starter-actuator` | BOM | For `/actuator/health` |

**Compiler plugin annotation processor paths** — add alongside the existing Lombok path:
```xml
<path>
    <groupId>org.mapstruct</groupId>
    <artifactId>mapstruct-processor</artifactId>
    <version>1.6.3</version>
</path>
```

> **Note on `spring-boot-starter-oauth2-resource-server`**: This dependency is listed in requirements §9. It is declared to allow JWT auto-configuration to be available but its auto-configuration (`NimbusJwtDecoder`) is **not** activated — the custom `JwtService` + `JwtAuthFilter` handle all JWT operations directly (D-03). Do not add `spring.security.oauth2.resourceserver.jwt.*` configuration.

---

## 10. Test Design

All integration tests use Testcontainers (`postgres:15`) with Flyway migrations, never H2. Test method names reference acceptance criteria.

### 10.1 `AuthServiceTest` — unit, `com.govgrants.subsidygrant.auth.service`

```
// Mockito; covers lockout and auto-unlock edge cases
AC_AUTH_02_3_locksAccountAfterMaxFailedAttempts()
AC_AUTH_02_3_returnsLockedWhileLockedUntilInFuture()
AC_AUTH_02_3_doesNotExtendLockOnSubsequentAttempts()
AC_AUTH_02_5_unlocksAndResetsCountWhenLockExpired()
AC_AUTH_02_4_resetsFailedCountOnSuccessfulLogin()
AC_AUTH_01_1_throwsDuplicateOnExistingUsername()
AC_AUTH_01_1_throwsDuplicateOnExistingEmail()
```

### 10.2 `JwtServiceTest` — unit, `com.govgrants.subsidygrant.auth.service`

```
generatesTokenWithCorrectClaims_userId_role_expiry()
validatesTokenSuccessfully()
rejectsExpiredToken()
rejectsTamperedToken()
extractsUserIdFromValidToken()
```

### 10.3 `UserServiceTest` — unit, `com.govgrants.subsidygrant.user.service`

```
AC_USR_01_5_throwsWhenAdminDeactivatesThemself()
AC_USR_01_7_throwsWhenRoleChangedWithActiveFieldPendingAssignments()
AC_USR_01_8_throwsWhenRegionsChangedWithActiveFieldPendingAssignments()
AC_USR_01_6_throwsWhenUserHasWorkflowReferences()
AC_USR_01_2_throwsOnInvalidRegionBinding_districtOfficerMultipleDistricts()
AC_USR_01_2_throwsOnInvalidRegionBinding_fieldOfficerNoDistrict()
```

### 10.4 `AuthControllerIT` — Testcontainers + MockMvc

```
// Full end-to-end HTTP flow; @SpringBootTest + @AutoConfigureMockMvc
AC_AUTH_01_1_registersNewBeneficiaryAndReturns201()
AC_AUTH_01_2_returns409OnDuplicateUsername()
AC_AUTH_01_2_returns409OnDuplicateEmail_caseInsensitive()
AC_AUTH_01_3_ignoresRoleAndActiveInRegistrationPayload()
AC_AUTH_02_1_returnsJwtOnValidCredentials()
AC_AUTH_02_2_returns401OnBadPassword_withoutRevealingExistence()
AC_AUTH_02_3_returns429AfterMaxFailedAttempts()
AC_AUTH_02_5_unlocksAfterLockPeriodExpires()
AC_AUTH_03_1_returns401WithNoToken()
AC_AUTH_03_1_returns401WithExpiredToken()
AC_AUTH_03_4_getMeReturnsCurrentUser()
```

### 10.5 `AuditImmutabilityIT` — Testcontainers (AT-07, AC-AUD-02.1)

```java
// Connects as gsdts_app role using a dedicated DataSource.
// Verifies the trigger and REVOKE controls together.
AT_07_updateAuditLogThrowsException()     // UPDATE raises exception from trigger
AT_07_deleteAuditLogThrowsException()     // DELETE raises exception from trigger
AT_07_insertAuditLogSucceeds()            // INSERT is allowed for gsdts_app
```

### 10.6 `RegionServiceTest` — unit

```
createsStateRegionSuccessfully()
createsDistrictRegionWithValidStateParent()
throwsWhenDistrictCreatedWithoutParent()
throwsWhenDistrictCreatedWithDistrictParent()
isDescendantOf_returnsTrueForSelf()
isDescendantOf_returnsTrueForDirectChild()
isDescendantOf_returnsTrueForGrandchild()
isDescendantOf_returnsFalseForUnrelated()
getDescendantIds_includesSelf()
getDescendantIds_includesAllChildren()
```

### 10.7 `SettingsCacheServiceTest` — unit

```
returnsValueFromCacheOnSecondCall()
evictsCacheOnUpdate_nextCallHitsRepository()
getInt_parsesIntValue()
getMoney_parsesBigDecimalValue()
getBool_parsesBooleanValue()
throwsOnUnknownKey()
```

---

## 11. `application.yml` / `application-dev.yml` Structure

### `src/main/resources/application.yml`

```yaml
spring:
  application:
    name: subsidy-grant-platform

  datasource:
    url: ${DB_URL}
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
    hikari:
      connection-timeout: 30000
      maximum-pool-size: 10

  jpa:
    hibernate:
      ddl-auto: validate           # Flyway owns the schema (D-02). Never create/update.
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
        default_schema: public
    open-in-view: false            # Prevent lazy-load outside transaction

  flyway:
    enabled: true
    locations: classpath:db/migration
    baseline-on-migrate: true      # Required for existing Supabase DB (D-02)
    baseline-version: 1
    out-of-order: false            # Strict ordering in prod; overridden in dev profile

  jackson:
    default-property-inclusion: non_null
    serialization:
      write-dates-as-timestamps: false

app:
  jwt:
    secret: ${JWT_SECRET}          # ≥ 256-bit secret; never committed (§8 Secrets)
    expiration-minutes: 30         # AC-AUTH-02.1

  security:
    pii-encryption-key: ${PII_ENCRYPTION_KEY}
    national-id-hash-key: ${NATIONAL_ID_HASH_KEY}

logging:
  pattern:
    console: "%d{yyyy-MM-dd HH:mm:ss} [%X{correlationId}] [%thread] %-5level %logger{36} - %msg%n"
  level:
    com.govgrants: INFO
    org.flywaydb: INFO
```

### `src/main/resources/application-dev.yml`

```yaml
spring:
  flyway:
    out-of-order: true             # Allows teammates to merge migrations in any order locally

  jpa:
    show-sql: true
    properties:
      hibernate:
        format_sql: true

logging:
  level:
    com.govgrants: DEBUG
    org.hibernate.SQL: DEBUG
    org.hibernate.type.descriptor.sql: TRACE
```

### `src/test/resources/application-test.yml`

```yaml
spring:
  flyway:
    out-of-order: true             # Testcontainers may apply migrations in any order during test runs
    baseline-on-migrate: false     # Fresh DB in Testcontainers; no baseline needed

  jpa:
    hibernate:
      ddl-auto: validate
```

> **Testcontainers usage:** Integration tests annotated with `@Testcontainers` start a `postgres:15` container and run all Flyway migrations before each test class. The `gsdts_app` DB role is created by `V202611070001` — `AuditImmutabilityIT` creates a second `DataSource` pointing to the same container URL but connecting as `gsdts_app` to prove the REVOKE and trigger.
