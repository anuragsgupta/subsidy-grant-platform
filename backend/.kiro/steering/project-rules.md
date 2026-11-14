---
inclusion: always
---

# Project Rules — Government Subsidy & Grant Disbursement Tracking System (GSDTS)

These rules apply to every AI agent (Kiro, Claude Code, Cursor, Copilot) and every team member.
The single source of truth for behaviour is #[[file:docs/requirements.md]].

## 1. Golden rules
1. Implement ONLY what is in `docs/requirements.md`. Do not add endpoints, fields, statuses or tables that are not specified.
2. Every task, commit, PR, migration and test MUST reference requirement IDs (e.g. `REQ-APP-03`, `AC-APP-03.2`).
3. If a requirement is ambiguous or conflicts with code, STOP, add an entry to "Open Questions" in `docs/requirements.md`, and do not invent behaviour.
4. Never implement anything marked **RESERVED** (Section 13 of requirements), except the "Design hooks" listed there.
5. Requirement IDs are immutable. Changes go through the Change Control process (requirements §0.3).

## 2. Technology (fixed)
| Item | Value |
|---|---|
| Language | Java 21 |
| Framework | Spring Boot 4.1.x (as in existing pom.xml; use BOM-managed versions) |
| Persistence | Spring Data JPA (Hibernate), PostgreSQL 15+ (Supabase-hosted in dev/prod, `postgres:15` in Docker/Testcontainers) |
| Migrations | Flyway ONLY. `spring.jpa.hibernate.ddl-auto=validate`. Never `create`, `create-drop`, `update` |
| Security | Spring Security + OAuth2 Resource Server with self-issued JWT (HS256, secret ≥ 256 bits from env), BCrypt (strength 12) |
| Mapping | MapStruct (no hand-written reflection mappers) |
| Validation | Jakarta Bean Validation + service-layer business rules |
| Docs | springdoc-openapi (release line compatible with Spring Boot 4; verify at build) |
| Scheduling | Spring `@Scheduled` + ShedLock (JDBC) |
| File storage | S3-compatible via `StoragePort` (Supabase Storage in cloud, MinIO in Docker) |
| Tests | JUnit 5, Mockito, MockMvc, Testcontainers (PostgreSQL), JaCoCo |
| Build | Maven |
| Deploy | Single `docker-compose.yml` (app + postgres + minio) |

## 3. Package structure
Base package = the existing project base package (`{base}`). Existing entity, enum and repository classes stay where they are until migrated by a task. New code is organized **by module**, and each module has the same internal layout:

```
{base}.{module}
  ├── api          // @RestController + request/response DTOs (Java records)
  ├── service      // business logic, @Transactional boundaries
  ├── domain       // JPA entities, enums, value objects
  ├── repository   // Spring Data interfaces
  └── mapper       // MapStruct mappers
```
Modules: `common, auth, user, region, setting, beneficiary, document, scheme, eligibility, application, verification, disbursement, compliance, analytics, audit, integration, notification, assistant (RESERVED, empty)`.

`common` holds: ApiResponse, PagedResponse, ErrorCode, GlobalExceptionHandler, BusinessException types, ActorContext, Money utils, correlation-id filter.

## 4. Coding conventions (mandatory)
- Constructor injection only (`final` fields). No `@Autowired` on fields.
- Controllers never return or accept JPA entities. DTOs are Java `record`s.
- Controllers contain no business logic. They validate (`@Valid`), call one service method, and wrap the result.
- Money: `BigDecimal`, scale 2, `RoundingMode.HALF_UP`, DB type `NUMERIC(14,2)`. Never float/double.
- IDs: `UUID` for business tables, `Long` only for `role.id` and `region.id`.
- Time: persist `timestamptz` (UTC, `Instant`/`OffsetDateTime`). Business dates (`LocalDate`) are evaluated in `Asia/Kolkata`.
- All associations `FetchType.LAZY`. No bidirectional collections serialized anywhere.
- Every mutable entity has `@Version long version`.
- Every state change goes through its module's service. Application status changes go ONLY through `ApplicationWorkflowService` (REQ-APP-06).
- Every state change writes an audit record in the SAME transaction (REQ-AUD-01).
- Service methods take an `ActorContext` (userId, roles, regionIds) parameter rather than reading the HTTP request, so they can be reused by jobs and the future MCP server.
- Never log national ID, bank account number, passwords, JWTs or full phone numbers.
- Error responses only via `GlobalExceptionHandler` with codes from `ErrorCode` (requirements §11.2).

## 5. Flyway rules (team-safe)
- File name: `V{yyyyMMddHHmm}__{module}_{description}.sql` (timestamp versions avoid collisions between teammates), e.g. `V202611071030__scheme_add_criteria.sql`.
- Never edit a migration that is merged to `main`. Create a new one.
- `outOfOrder=true` only in the `dev` profile.
- `V1__baseline.sql` = the existing DB-001 schema (6 tables). Use `baselineOnMigrate=true` against the existing Supabase DB.

## 6. Testing rules
- Test method names reference the acceptance criterion: `AC_APP_03_2_rejectsAmountAboveSchemeMax()`.
- Service-layer line coverage ≥ 70% (JaCoCo build gate, NFR-07).
- Integration tests use Testcontainers PostgreSQL with Flyway migrations (not H2).

## 7. Git workflow
- Branch: `feat/{module}/{REQ-ID}-{short-desc}`, e.g. `feat/eligibility/REQ-ELG-02-scoring`.
- PR title starts with REQ IDs. A PR must include tests for every AC it claims.
- `main` must always build and pass `mvn verify`.

## 8. Secrets
No credentials in any committed file. Required env vars: `DB_URL, DB_USERNAME, DB_PASSWORD, JWT_SECRET, PII_ENCRYPTION_KEY, NATIONAL_ID_HASH_KEY, STORAGE_ENDPOINT, STORAGE_ACCESS_KEY, STORAGE_SECRET_KEY, STORAGE_BUCKET, CORS_ALLOWED_ORIGINS, TREASURY_BASE_URL, TREASURY_API_KEY_HASH, BENEFICIARY_DB_API_KEY_HASH`. Commit `.env.example` with names only.