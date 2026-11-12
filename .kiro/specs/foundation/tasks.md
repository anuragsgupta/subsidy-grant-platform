# Implementation Plan: Foundation Slice (REQ-AUTH-01–03, REQ-USR-01–04, REQ-AUD-01–03)

## Overview

Implements the base module of GSDTS: authentication, user and region management, system settings, audit logging, and all shared infrastructure consumed by every other slice. All tasks are independently implementable in the order listed.

## Tasks

- [x] 1. Bootstrap pom.xml and project Java version
  - Change `<java.version>17</java.version>` to `<java.version>21</java.version>` (D-01)
  - Uncomment `spring-boot-starter-security` and `spring-boot-starter-security-test`
  - Add `spring-boot-starter-oauth2-resource-server` (BOM-managed)
  - Add `jjwt-api` 0.12.6, `jjwt-impl` 0.12.6 (runtime), `jjwt-jackson` 0.12.6 (runtime)
  - Add `flyway-core` (BOM) and `flyway-database-postgresql` (BOM)
  - Add `mapstruct` 1.6.3 (compile scope)
  - Add `spring-boot-starter-cache` (BOM) and `caffeine` (BOM via cache starter)
  - Add `shedlock-spring` 6.3.0 and `shedlock-provider-jdbc-template` 6.3.0
  - Add `spring-boot-starter-actuator` (BOM)
  - Add `mapstruct-processor` 1.6.3 to compiler plugin `annotationProcessorPaths` alongside Lombok
  - Run `mvn compile -q` and confirm zero errors
  - REQ: D-01, NFR-01, NFR-05, NFR-07, NFR-08
  - AC: N/A — build prerequisite

- [x] 2. Flyway migration V1 — baseline schema
  - Create `src/main/resources/db/migration/V1__baseline.sql` reproducing the DB-001 schema (6 tables: `app_user`, `role`, `user_role`, `scheme`, `beneficiary`, `application`) with the timestamp trigger, indexes, and seed data
  - Omit the `auth_user_id → auth.users` FK (Supabase-only; `auth` schema absent in Docker/Testcontainers)
  - Create `src/main/resources/application.yml`: datasource from env vars, `ddl-auto=validate`, flyway config (`baseline-on-migrate=true`, `out-of-order=false`), `app.jwt.*`, `app.security.*`, logging pattern with `%X{correlationId}`, `open-in-view=false`, Jackson `write-dates-as-timestamps=false`
  - Create `src/main/resources/application-dev.yml`: `flyway.out-of-order=true`, `show-sql=true`, DEBUG logging
  - Create `src/test/resources/application-test.yml`: `flyway.baseline-on-migrate=false`, `out-of-order=true`, `ddl-auto=validate`
  - Verify `.env.example` contains all required env var names from requirements §8: `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`, `PII_ENCRYPTION_KEY`, `NATIONAL_ID_HASH_KEY`, `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_BUCKET`, `CORS_ALLOWED_ORIGINS`, `TREASURY_BASE_URL`, `TREASURY_API_KEY_HASH`, `BENEFICIARY_DB_API_KEY_HASH`
  - REQ: D-02, NFR-05
  - AC: N/A — migration prerequisite
  - _Requires: 1_

- [x] 3. Flyway migration V2 — foundation auth schema
  - Create `src/main/resources/db/migration/V202611070001__foundation_auth_schema.sql`
  - `ALTER TABLE app_user ADD COLUMN IF NOT EXISTS`: `username VARCHAR(50) UNIQUE`, `password_hash VARCHAR(255)`, `failed_login_count INT NOT NULL DEFAULT 0`, `locked_until TIMESTAMPTZ`, `version BIGINT NOT NULL DEFAULT 0`
  - `CREATE TABLE region` (id BIGSERIAL PK, code UNIQUE with CHECK `^[A-Z0-9_-]{2,20}$`, name, type CHECK IN ('STATE','DISTRICT'), parent_id FK self RESTRICT, created_at, updated_at, version; constraint DISTRICT must have parent_id NOT NULL)
  - `CREATE TABLE user_region` (user_id FK app_user CASCADE, region_id FK region RESTRICT, assigned_at, PK(user_id,region_id))
  - `CREATE TABLE system_setting` (key VARCHAR(100) PK, value TEXT, value_type CHECK IN ('INT','MONEY','ENUM','BOOL'), description, updated_by FK app_user SET NULL, created_at, updated_at)
  - Create `updated_at` triggers for `region` and `system_setting`
  - INSERT all 10 default settings from requirements §5.4 (`ON CONFLICT DO NOTHING`)
  - Re-seed 5 roles (`ON CONFLICT DO NOTHING`)
  - Create `gsdts_app` DB role (DO $$IF NOT EXISTS$$); GRANT SELECT/INSERT/UPDATE/DELETE on all tables; GRANT USAGE/SELECT on sequences
  - Add comment: "REVOKE UPDATE/DELETE/TRUNCATE ON audit_log applied in migration 7"
  - REQ: D-02, D-03, D-15, D-17, REQ-AUTH-01, REQ-USR-01, REQ-USR-03, REQ-USR-04
  - AC: AC-AUTH-01.1, AC-USR-01.2, AC-USR-03.2
  - _Requires: 2_

- [~] 4. Common module — shared infrastructure
  - Create `com.govgrants.subsidygrant.common.domain.ActorContext` record: `UUID userId, String role, List<Long> regionIds, String correlationId, String ipAddress`; add `hasRole(String)` method and `ActorContext.system(String correlationId)` static factory
  - Create exception hierarchy in `common.exception`: `BusinessException` (abstract, fields HttpStatus + String errorCode), `ResourceNotFoundException` (404 RESOURCE_NOT_FOUND), `DuplicateResourceException` (409 DUPLICATE_RESOURCE), `ResourceInUseException` (409 RESOURCE_IN_USE), `ConcurrentModificationException` (409 CONCURRENT_MODIFICATION), `RegionScopeViolationException` (403 REGION_SCOPE_VIOLATION), `SeparationOfDutiesException` (403 SEPARATION_OF_DUTIES), `BusinessRuleException` (422, accepts named error code), `TooManyAttemptsException` (429 TOO_MANY_ATTEMPTS), `AccessDeniedException` (403 ACCESS_DENIED)
  - Migrate `dto/response/ApiResponse.java` → `common/response/ApiResponse.java`; update all existing imports
  - Migrate `dto/response/PagedResponse.java` → `common/response/PagedResponse.java`; update all existing imports
  - Create `common.filter.CorrelationIdFilter` (OncePerRequestFilter): read `X-Correlation-Id`; generate UUID if absent; store in MDC key `correlationId`; set response header; clean MDC in finally
  - Create `common.api.GlobalExceptionHandler` (@RestControllerAdvice): map `ResourceNotFoundException` → 404, `DuplicateResourceException` → 409, `ResourceInUseException` → 409, `ConcurrentModificationException` → 409, `AccessDeniedException` → 403, `RegionScopeViolationException` → 403, `SeparationOfDutiesException` → 403, `BusinessRuleException` → 422, `TooManyAttemptsException` → 429, `MethodArgumentNotValidException` → 400 VALIDATION_FAILED with field errors, `HttpMessageNotReadableException` → 400 MALFORMED_JSON, `MethodArgumentTypeMismatchException` → 400 INVALID_PARAMETER, `DataIntegrityViolationException` → 409 DUPLICATE_RESOURCE, `ObjectOptimisticLockingFailureException` → 409 CONCURRENT_MODIFICATION, Spring `AccessDeniedException` → 403, generic `Exception` → 500 INTERNAL_ERROR (log with correlationId, never expose stack trace)
  - Register `CorrelationIdFilter` as a Spring bean
  - Run `mvn compile -q`
  - REQ: NFR-06, REQ-AUD-01, D-08
  - AC: AC-AUD-01.3, AC-AUTH-03.1
  - _Requires: 1_

- [ ] 5. Auth domain — AppUser entity and repository migration
  - Migrate `entity/AppUser.java` → `auth/domain/AppUser.java`; keep all existing fields; add `username` VARCHAR(50) UNIQUE, `passwordHash` VARCHAR(255), `failedLoginCount int default 0`, `lockedUntil Instant`, `@Version long version`; replace `@PrePersist/@PreUpdate` with `@CreationTimestamp/@UpdateTimestamp`; keep `userRoles` as LAZY
  - Migrate `repository/AppUserRepository.java` → `auth/repository/AppUserRepository.java`; keep existing methods; add `findByUsername`, `findByUsernameIgnoreCase`, `existsByUsernameIgnoreCase`, `existsByEmailIgnoreCase`, `findByIdWithRoles` (JOIN FETCH userRoles → role), `findByUsernameWithRoles` (JOIN FETCH)
  - Migrate `entity/Role.java` → `user/domain/Role.java` (no structural changes)
  - Migrate `entity/UserRole.java` and `entity/UserRoleId.java` → `user/domain/` (no structural changes)
  - Migrate `repository/RoleRepository.java` → `user/repository/RoleRepository.java`; add `findByName(String)` and `existsByName(String)`
  - Migrate `repository/UserRoleRepository.java` → `user/repository/UserRoleRepository.java`; add `findByIdUserId(UUID)`, `deleteByIdUserId(UUID)`, `existsByIdUserIdAndRoleName(UUID, String)`
  - Update all import references in remaining files (`entity/Beneficiary.java`, `entity/Scheme.java`, `entity/Application.java`, existing repositories)
  - Run `mvn compile -q` to verify no broken imports
  - REQ: REQ-AUTH-01, REQ-AUTH-02, REQ-USR-01, D-03, D-15
  - AC: AC-AUTH-01.1, AC-AUTH-02.1, AC-AUTH-02.3, AC-USR-01.7
  - _Requires: 3, 4_

- [ ] 6. User module — Region entity and repository
  - Create `user/domain/RegionType` enum: STATE, DISTRICT
  - Create `user/domain/Region` entity: id Long (IDENTITY), code, name, RegionType type, Long parentId, @CreationTimestamp createdAt, @UpdateTimestamp updatedAt, @Version long version
  - Create `user/domain/UserRegionId` @Embeddable: UUID userId, Long regionId with equals/hashCode
  - Create `user/domain/UserRegion` entity: @EmbeddedId UserRegionId, @ManyToOne @MapsId("userId") AppUser, @ManyToOne @MapsId("regionId") Region, Instant assignedAt set in @PrePersist
  - Create `user/repository/RegionRepository`: `findByCode`, `existsByCode`, `findByType`, `findByParentId`, `findByTypeAndParentId`; native @Query recursive CTE `findDescendantIds(@Param("rootId") Long)` returning List<Long>
  - Create `user/repository/UserRegionRepository`: `findByIdUserId`, `deleteByIdUserId`, `findRegionIdsByUserId` (@Query JPQL); native SQL `countActiveFieldPendingByOfficer` querying `application` table directly (avoid compile-time dependency on application-workflow slice)
  - Run `mvn compile -q`
  - REQ: REQ-USR-01, REQ-USR-03, D-18
  - AC: AC-USR-01.2, AC-USR-03.2
  - _Requires: 5_

- [ ] 7. User module — SystemSetting entity and SettingsCacheService
  - Create `user/domain/SettingValueType` enum: INT, MONEY, ENUM, BOOL
  - Create `user/domain/SystemSetting` entity: @Id String key, String value, SettingValueType valueType, String description, UUID updatedBy, @CreationTimestamp createdAt, @UpdateTimestamp updatedAt (no @Version)
  - Create `user/repository/SystemSettingRepository` extending JpaRepository<SystemSetting, String> (no custom methods needed)
  - Create `user/service/SettingsCacheService` (@Component): Caffeine Cache<String,String> with `expireAfterWrite(60, SECONDS)`; implement `getValue(key)` loading from repo on miss and throwing ResourceNotFoundException if absent; implement `getInt`, `getMoney` (BigDecimal scale 2 HALF_UP), `getBool`; implement `evict(key)` calling cache.invalidate
  - Run `mvn compile -q`
  - REQ: REQ-USR-04, NFR-03
  - AC: AC-USR-04.1, AC-USR-04.3
  - _Requires: 5_

- [ ] 8. Audit module — AuditLog entity, AuditService, PiiMaskingUtil
  - Create `audit/domain/ActorType` enum: USER, SYSTEM, API_CLIENT
  - Create `audit/domain/AuditLog` entity: id Long (IDENTITY), all columns from design §3.1 (occurredAt, actorId nullable UUID, actorRole, actorType, action, entityType, entityId, referenceNo, oldValue JSONB string, newValue JSONB string, remark, correlationId, ipAddress, @CreationTimestamp createdAt); all fields updatable=false; no @Version, no updated_at
  - Create `audit/domain/ApiClient` entity: UUID id, name, keyHash, active boolean, @CreationTimestamp createdAt, @UpdateTimestamp updatedAt, @Version long version
  - Create `audit/repository/AuditLogRepository` extending JpaRepository<AuditLog,Long> and JpaSpecificationExecutor<AuditLog>
  - Create `audit/repository/ApiClientRepository`: `findByName(String)`, `findByKeyHash(String)`
  - Create `audit/service/AuditEntry` record: action, entityType, entityId, referenceNo, Map<String,Object> oldValue, Map<String,Object> newValue, remark
  - Create `audit/service/AuditFilter` record: referenceNo, entityType, entityId, UUID actorId, Instant from, Instant to
  - Create `audit/service/PiiMaskingUtil` (final, no Spring): `static String maskEmail(String)` → "j***@domain.com"; `static String maskPhone(String)` → "XXXXXX1234" (last 4 visible); handle nulls gracefully
  - Create `audit/service/AuditService` (@Service @Transactional): inject AuditLogRepository and ObjectMapper; implement `record(AuditEntry, ActorContext)` — apply PiiMaskingUtil to email/phone keys in oldValue/newValue, serialize to JSON, persist synchronously in caller's transaction; implement `recordSystem(AuditEntry)` — actorType=SYSTEM, actorId=null, actorRole="SYSTEM"; implement `queryAudit(AuditFilter, Pageable)` — dynamic JPA Specification, order by occurred_at ASC then id ASC
  - Create `audit/api/AuditLogResponse` record (all AuditLog fields)
  - Create `audit/mapper/AuditMapper` (@Mapper(componentModel="spring")): AuditLog → AuditLogResponse; deserialize JSONB strings to Object via Jackson default method
  - Create `audit/api/AuditController` (@RestController @RequestMapping("/api/v1/audit")): GET / requires ADMIN; query params referenceNo, entityType, entityId, actorId, from, to, page, size; returns ApiResponse<PagedResponse<AuditLogResponse>>
  - Run `mvn compile -q`
  - REQ: REQ-AUD-01, REQ-AUD-02, REQ-AUD-03, D-17, INV-01
  - AC: AC-AUD-01.1, AC-AUD-01.2, AC-AUD-01.3, AC-AUD-01.4, AC-AUD-03.1, AC-AUD-03.2
  - _Requires: 4, 5_

- [ ] 9. Security configuration, JwtService, audit schema migration
  - Create `src/main/resources/db/migration/V202611070007__foundation_audit_schema.sql`: CREATE TABLE audit_log (all columns from design §2.3), CREATE TABLE api_client, CREATE TABLE shedlock (standard DDL); create indexes `idx_audit_log_reference_no` and `idx_audit_log_entity`; GRANT SELECT/INSERT ON audit_log TO gsdts_app; REVOKE UPDATE/DELETE/TRUNCATE ON audit_log FROM gsdts_app; GRANT SELECT/INSERT/UPDATE/DELETE on api_client and shedlock; GRANT USAGE/SELECT on audit_log_id_seq; CREATE FUNCTION `audit_log_immutability()` raising exception; CREATE TRIGGER `trg_audit_log_immutable` BEFORE UPDATE OR DELETE
  - Create `auth/service/JwtService` (@Service): inject `@Value("${app.jwt.secret}")` and `@Value("${app.jwt.expiration-minutes:30}")`; use JJWT 0.12.x (`Keys.hmacShaKeyFor`, `Jwts.builder()`, `Jwts.parser()`); implement `generateToken(AppUser)` with claims sub=userId, roles=[roleName], iat, exp; implement `extractUserId`, `extractRole`, `isTokenValid` (catch JwtException → false), `isTokenExpired`
  - Create `auth/service/UserStatusCache` (@Component): Caffeine Cache<UUID,Boolean> TTL 60s; `isActive(UUID)` loading from AppUserRepository on miss (return false if absent); `evict(UUID)` calling cache.invalidate
  - Create `auth/filter/JwtAuthFilter` (OncePerRequestFilter): inject JwtService, AppUserRepository, UserStatusCache, UserRegionRepository; in `doFilterInternal` extract Bearer token, skip if absent, validate, check active, load regionIds, build UsernamePasswordAuthenticationToken, build ActorContext and set as request attribute "actorContext", handle all exceptions with 401 JSON response; implement `shouldNotFilter` to skip auth/register, auth/login, /v3/api-docs, /swagger-ui, /actuator/health
  - Create `auth/config/SecurityConfig` (@Configuration @EnableMethodSecurity): `PasswordEncoder` bean = new BCryptPasswordEncoder(12); `AuthenticationManager` bean from AuthenticationConfiguration; `SecurityFilterChain` bean: disable CSRF, STATELESS, permit public paths, authenticate all others, addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class), custom 401 AuthenticationEntryPoint and 403 AccessDeniedHandler both returning ApiResponse JSON shape
  - Run `mvn compile -q`
  - REQ: REQ-AUTH-02, REQ-AUTH-03, D-02, D-03, D-17, NFR-01, NFR-05
  - AC: AC-AUTH-02.1, AC-AUTH-03.1, AC-AUTH-03.2, AC-AUTH-03.3, AC-AUD-02.1
  - _Requires: 3, 4, 7, 8_

- [ ] 10. Auth service — registration and login
  - Create `auth/api/RegisterRequest` record: @NotBlank @Size(4-50) @Pattern(^[a-zA-Z0-9._-]+$) username, @NotBlank @Size(8-72) password, @NotBlank @Size(2-150) fullName, @NotBlank @Email email, @Pattern(^(\+91)?[6-9]\d{9}$) phone
  - Create `auth/api/LoginRequest` record: @NotBlank username, @NotBlank password
  - Create `auth/api/TokenResponse` record: accessToken, tokenType, Instant expiresAt
  - Create `auth/service/AuthService` (@Service @Transactional): inject AppUserRepository, UserRoleRepository, RoleRepository, PasswordEncoder, JwtService, AuditService, SettingsCacheService
  - Implement `register`: check username uniqueness (409 DUPLICATE_RESOURCE), check email uniqueness (409), validate password ≥1 letter AND ≥1 digit (400 VALIDATION_FAILED), BCrypt hash, set active=true failedLoginCount=0, assign BENEFICIARY role, audit USER_REGISTERED via AuditService.record() with ActorContext.system(correlationId), return UserResponse without any password field (AC-AUTH-01.1, AC-AUTH-01.3)
  - Implement `login`: (1) find by username case-insensitive; if not found audit LOGIN_FAILURE and return 401 without revealing existence (AC-AUTH-02.2); (2) if lockedUntil > now → 429 TOO_MANY_ATTEMPTS; (3) if lockedUntil ≤ now → reset failedLoginCount=0 lockedUntil=null (AC-AUTH-02.5); (4) on password mismatch increment failedLoginCount, if ≥ maxFailedLogins set lockedUntil, audit LOGIN_FAILURE, throw 429 or 401; (5) on success reset counters, audit LOGIN_SUCCESS, generate JWT, return TokenResponse (AC-AUTH-02.4)
  - Implement `getCurrentUser(ActorContext)`: load by idWithRoles, return UserResponse with role and regionIds
  - Create `auth/api/AuthController` (@RestController @RequestMapping("/api/v1/auth")): POST /register → 201, POST /login → 200, GET /me → 200; extract ActorContext from request attribute "actorContext" for /me
  - Run `mvn compile -q`
  - REQ: REQ-AUTH-01, REQ-AUTH-02, REQ-AUTH-03, D-03
  - AC: AC-AUTH-01.1, AC-AUTH-01.2, AC-AUTH-01.3, AC-AUTH-02.1, AC-AUTH-02.2, AC-AUTH-02.3, AC-AUTH-02.4, AC-AUTH-02.5, AC-AUTH-03.4
  - _Requires: 9_

- [ ] 11. User module — services, controllers, and DTOs
  - Create all DTO records in `user/api`: UserResponse, UserSummaryResponse, CreateUserRequest, UpdateUserRequest, UserStatusRequest, ChangeRoleRequest, ChangeRegionsRequest, RoleResponse, RegionResponse, CreateRegionRequest, UpdateRegionRequest, SettingResponse, UpdateSettingRequest
  - Create `UserQueryService` interface and impl: `AppUser getById(UUID)`, `boolean hasRole(UUID, String)`, `List<Long> getRegionIds(UUID)`
  - Create `RegionQueryService` interface and impl: `Region getById(Long)`, `boolean isDescendantOf(Long, Long)`, `List<Long> getDescendantIds(Long)`
  - Create `UserService` (@Service @Transactional): enforce region binding rules per §4.1 in createUser/changeRegions (FIELD_OFFICER: exactly 1 DISTRICT; DISTRICT_OFFICER: exactly 1 DISTRICT; FINANCE_APPROVER: ≥1 any type; ADMIN/BENEFICIARY: empty) → 422 INVALID_REGION_BINDING; in setStatus check self-deactivation → 422 SELF_DEACTIVATION_NOT_ALLOWED; call userStatusCache.evict; in deleteUser check references in application_status_history, field_report, verification_step, disbursement.released_by, audit_log.actor_id → 409 RESOURCE_IN_USE; in changeRole guard FIELD_PENDING count → 422 RESOURCE_IN_USE; write audit for every mutating operation
  - Create `RoleService` (@Service @Transactional(readOnly=true)): listRoles, getRole(Long), getRoleByName(String) all with 404 on missing
  - Create `RegionService` (@Service @Transactional): createRegion validates DISTRICT has STATE parent; duplicate code → 409; updateRegion updates name only; write audit
  - Create `SettingService` (@Service @Transactional): updateSetting validates value against valueType (400 on invalid), saves with updatedBy, calls settingsCache.evict, writes audit with old and new values (AC-USR-04.2)
  - Create MapStruct mappers in `user/mapper`: UserMapper (AppUser → UserResponse/UserSummaryResponse resolving role name), RegionMapper (Region → RegionResponse)
  - Create `UserController`, `RoleController`, `RegionController`, `SettingController` in `user/api` matching the endpoint table in design §7.2–7.5; no DELETE on /regions (AC-USR-03.2); no POST/PUT/DELETE on /roles (AC-USR-02.2); extract ActorContext from request attribute for all mutations
  - Run `mvn compile -q`
  - REQ: REQ-USR-01, REQ-USR-02, REQ-USR-03, REQ-USR-04
  - AC: AC-USR-01.1, AC-USR-01.2, AC-USR-01.3, AC-USR-01.4, AC-USR-01.5, AC-USR-01.6, AC-USR-01.7, AC-USR-01.8, AC-USR-01.9, AC-USR-02.1, AC-USR-02.2, AC-USR-03.1, AC-USR-03.2, AC-USR-04.1, AC-USR-04.2, AC-USR-04.3
  - _Requires: 6, 7, 8, 9, 10_

- [ ] 12. Unit tests — AuthService, JwtService, UserService, RegionService, SettingsCacheService
  - Create `AuthServiceTest` (Mockito, no Spring context, no DB): mock AppUserRepository, UserRoleRepository, RoleRepository, PasswordEncoder, JwtService, AuditService, SettingsCacheService; write tests: `AC_AUTH_02_3_locksAccountAfterMaxFailedAttempts`, `AC_AUTH_02_3_returnsLockedWhileLockedUntilInFuture`, `AC_AUTH_02_3_doesNotExtendLockOnSubsequentAttempts`, `AC_AUTH_02_5_unlocksAndResetsCountWhenLockExpired`, `AC_AUTH_02_4_resetsFailedCountOnSuccessfulLogin`, `AC_AUTH_01_1_throwsDuplicateOnExistingUsername`, `AC_AUTH_01_1_throwsDuplicateOnExistingEmail`
  - Create `JwtServiceTest` (JUnit 5, real 256-bit test secret): `generatesTokenWithCorrectClaims_userId_role_expiry`, `validatesTokenSuccessfully`, `rejectsExpiredToken` (expirationMinutes=-1), `rejectsTamperedToken`, `extractsUserIdFromValidToken`
  - Create `UserServiceTest` (Mockito): `AC_USR_01_5_throwsWhenAdminDeactivatesThemself`, `AC_USR_01_7_throwsWhenRoleChangedWithActiveFieldPendingAssignments`, `AC_USR_01_8_throwsWhenRegionsChangedWithActiveFieldPendingAssignments`, `AC_USR_01_6_throwsResourceInUseWhenUserHasAuditReferences`, `AC_USR_01_2_throwsOnInvalidRegionBinding_fieldOfficerNoDistrict`, `AC_USR_01_2_throwsOnInvalidRegionBinding_districtOfficerMultipleDistricts`
  - Create `RegionServiceTest` (Mockito): `createsStateRegionSuccessfully`, `throwsWhenDistrictCreatedWithoutParent`, `throwsWhenDistrictCreatedWithDistrictParent`, `isDescendantOf_returnsTrueForSelf`, `isDescendantOf_returnsTrueForDirectChild`, `isDescendantOf_returnsFalseForUnrelated`
  - Create `SettingsCacheServiceTest` (Mockito): `returnsValueFromCacheOnSecondCall_doesNotHitRepo`, `evictsCacheOnUpdate_nextCallHitsRepository`, `getInt_parsesIntValue`, `getMoney_parsesBigDecimalValue`, `getBool_parsesBooleanValue`, `throwsResourceNotFoundOnUnknownKey`
  - Run `mvn test -Dtest="AuthServiceTest,JwtServiceTest,UserServiceTest,RegionServiceTest,SettingsCacheServiceTest" -q` and confirm all pass
  - REQ: REQ-AUTH-01, REQ-AUTH-02, REQ-USR-01, REQ-USR-03, REQ-USR-04
  - AC: AC-AUTH-01.1, AC-AUTH-01.2, AC-AUTH-02.3, AC-AUTH-02.5, AC-USR-01.2, AC-USR-01.5, AC-USR-01.6, AC-USR-01.7, AC-USR-01.8, AC-USR-04.3
  - _Requires: 10, 11_

- [ ] 13. Integration tests — AuthController and AuditImmutability
  - Create `BaseIT` annotated @SpringBootTest(webEnvironment=RANDOM_PORT) @Testcontainers: declare static PostgreSQLContainer<>("postgres:15"); use @DynamicPropertySource to override datasource properties; set flyway.baseline-on-migrate=false and out-of-order=true for test profile
  - Create `AuthControllerIT` extending BaseIT with @AutoConfigureMockMvc and MockMvc injection; implement: `AC_AUTH_01_1_registersNewBeneficiaryAndReturns201` (assert 201, response has no password field, DB row exists), `AC_AUTH_01_2_returns409OnDuplicateUsername`, `AC_AUTH_01_2_returns409OnDuplicateEmail_caseInsensitive`, `AC_AUTH_01_3_ignoresClientSuppliedRoleAndActive` (verify role=BENEFICIARY active=true in DB), `AC_AUTH_02_1_returnsJwtOnValidCredentials` (decode Base64 and verify sub), `AC_AUTH_02_2_returns401OnBadPassword_withoutRevealingExistence`, `AC_AUTH_02_3_returns429AfterMaxFailedAttempts` (set maxFailedLogins=3 in DB), `AC_AUTH_02_5_unlocksAfterLockPeriodExpires` (set locked_until to past via JdbcTemplate), `AC_AUTH_03_1_returns401WithNoToken`, `AC_AUTH_03_1_returns401WithExpiredToken`, `AC_AUTH_03_3_returns403WhenRoleNotPermitted` (BENEFICIARY calling POST /users), `AC_AUTH_03_4_getMeReturnsCurrentUserProfile`, `AT_17_unauthenticatedCallToProtectedEndpointReturns401`, `AT_17_wrongRoleReturns403`
  - Create `AuditImmutabilityIT` extending BaseIT: create a secondary DataSource connecting as `gsdts_app` role; implement `AT_07_insertAuditLogSucceedsForGsdtsAppRole` (positive case), `AT_07_updateAuditLogThrowsExceptionViaTrigger` (assert DataAccessException), `AT_07_deleteAuditLogThrowsExceptionViaTrigger` (assert DataAccessException)
  - Run `mvn verify -q` and confirm all integration tests pass
  - REQ: REQ-AUTH-01, REQ-AUTH-02, REQ-AUTH-03, REQ-AUD-02
  - AC: AC-AUTH-01.1, AC-AUTH-01.2, AC-AUTH-01.3, AC-AUTH-02.1, AC-AUTH-02.2, AC-AUTH-02.3, AC-AUTH-02.5, AC-AUTH-03.1, AC-AUTH-03.3, AC-AUTH-03.4, AC-AUD-02.1
  - _Requires: 10, 11, 12_

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": [1] },
    { "wave": 2, "tasks": [2] },
    { "wave": 3, "tasks": [3] },
    { "wave": 4, "tasks": [4] },
    { "wave": 5, "tasks": [5] },
    { "wave": 6, "tasks": [6, 7, 8] },
    { "wave": 7, "tasks": [9] },
    { "wave": 8, "tasks": [10] },
    { "wave": 9, "tasks": [11] },
    { "wave": 10, "tasks": [12] },
    { "wave": 11, "tasks": [13] }
  ]
}
```

## Notes

- All migrations use `V{yyyyMMddHHmm}__{module}_{description}.sql` naming to avoid teammate collisions (see project rules §5)
- Tasks 6, 7, and 8 can be developed in parallel once Task 5 is complete
- Task 9 depends on 7 and 8 being complete because `JwtAuthFilter` injects `UserRegionRepository` (from 6) and `AuditService` (from 8), and `SettingsCacheService` (from 7) is consumed by `AuthService` (task 10)
- `countActiveFieldPendingByOfficer` in task 6 uses a native SQL query against the `application` table to avoid a compile-time dependency on the application-workflow slice — this is intentional and aligns with the slice boundary described in design §4
- The `gsdts_app` role is created in migration 3 and the REVOKE on `audit_log` is deferred to migration 7 (when the table is created) — both migrations reference this explicitly with comments
- JaCoCo service-layer line coverage ≥ 70% gate (NFR-07) is enforced by `mvn verify`; ensure the JaCoCo plugin is configured in pom.xml with a `check` execution
