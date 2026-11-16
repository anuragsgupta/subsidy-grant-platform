# Implementation Plan: scheme-eligibility

## Overview

This plan implements full scheme lifecycle management (criteria, milestone templates, regional
budgets, status state machine) and the eligibility scoring engine on top of the existing
`foundation` slice. Work is organised into ten groups that build incrementally: database first,
then domain, repositories, pure-function evaluators, services, API layer, and finally test suites.

The implementation language is **Java 21** (Spring Boot 4.1.2, MapStruct 1.6.3, jqwik 1.9.1).

---

## Tasks

- [x] 1. Flyway migration — scheme_eligibility schema
  - [x] 1.1 Create `V202611070004__scheme_eligibility_schema.sql`
    - Write the migration file at `src/main/resources/db/migration/V202611070004__scheme_eligibility_schema.sql`
    - `ALTER TABLE scheme` to add columns: `category VARCHAR(30)`, `tranche_count INT NOT NULL DEFAULT 1 CHECK (1–10)`, `max_applications_per_beneficiary INT NOT NULL DEFAULT 1 CHECK (>=1)`, `version BIGINT NOT NULL DEFAULT 0`
    - Drop the existing `chk_scheme_grant_amount` constraint and re-add it with `min_grant_amount > 0`
    - Create table `scheme_criterion` with columns: id, scheme_id FK, attribute, operator, threshold, weight CHECK(1–100), mandatory, description, created_at, updated_at, version; add index on (scheme_id, created_at); add `update_updated_at` trigger; GRANT to `gsdts_app`
    - Create table `milestone_template` with columns: id, scheme_id FK, sequence, name, description, tranche_percentage NUMERIC(5,2) CHECK(>0), due_days CHECK(>=0), created_at, updated_at, version; UNIQUE(scheme_id, sequence); add trigger; GRANT
    - Create table `scheme_region_budget` with columns: (scheme_id, region_id) composite PK, allocated, committed DEFAULT 0, disbursed DEFAULT 0, created_at, updated_at, version; CHECK committed>=0, disbursed>=0, committed+disbursed<=allocated; add trigger; GRANT
    - `ALTER TABLE beneficiary` to add columns: `date_of_birth DATE`, `annual_income NUMERIC(14,2)`, `land_holding_acres NUMERIC(10,3)`, `gender VARCHAR(10) CHECK(...)`, `social_category VARCHAR(30) CHECK(...)`, `is_disabled BOOLEAN`
    - Create table `eligibility_result` with columns: id, application_id FK (CASCADE DELETE), criterion_id FK (RESTRICT), passed, points_awarded DEFAULT 0, beneficiary_value TEXT, created_at; no updated_at or version (append-only); index on application_id; GRANT SELECT, INSERT only
    - _Requirements: REQ-SCH-01, REQ-SCH-04, REQ-SCH-05, REQ-SCH-07, REQ-ELG-01, REQ-ELG-02, AC-SCH-01.1_

- [x] 2. Domain layer — enums and value records
  - [x] 2.1 Create eligibility domain enums
    - Create `eligibility/domain/CriterionAttribute.java` enum: `AGE, ANNUAL_INCOME, LAND_HOLDING, GENDER, SOCIAL_CATEGORY, IS_DISABLED, BENEFICIARY_TYPE, REGION`
    - Create `eligibility/domain/CriterionOperator.java` enum: `EQ, NEQ, GT, GTE, LT, LTE, BETWEEN, IN, NOT_IN`
    - Create `eligibility/domain/RiskTier.java` enum: `LOW, MEDIUM, HIGH`
    - Create `eligibility/domain/FieldFinding.java` enum: `NONE, MINOR_MISMATCH, MAJOR_MISMATCH`
    - Create `eligibility/domain/Gender.java` enum: `MALE, FEMALE, OTHER, PREFER_NOT_TO_SAY`
    - Create `eligibility/domain/SocialCategory.java` enum: `GENERAL, OBC, SC, ST, EWS, OTHER`
    - Create `scheme/domain/SchemeCategory.java` enum: `AGRICULTURE, EDUCATION, MSME, HOUSING, HEALTH, LIVELIHOOD, OTHER`
    - _Requirements: REQ-SCH-01, REQ-ELG-01, BR-ELG-2_

  - [x] 2.2 Create eligibility value records
    - Create `eligibility/domain/CriterionSpec.java` record: `attribute (CriterionAttribute), operator (CriterionOperator), threshold (String), weight (int), mandatory (boolean), description (String)`
    - Create `eligibility/domain/BeneficiaryAttributes.java` record: `age (int), annualIncome (BigDecimal), landHoldingAcres (BigDecimal), gender (Gender), socialCategory (SocialCategory), isDisabled (Boolean), beneficiaryType (BeneficiaryType), regionCode (String)` — all fields nullable except beneficiaryType
    - Create `eligibility/domain/CriterionResult.java` record: `criterionId (UUID), description (String), mandatory (boolean), passed (boolean), pointsAwarded (int), beneficiaryValue (String)`
    - Create `eligibility/domain/EligibilityOutcome.java` record: `score (int), autoRejected (boolean), criterionResults (List<CriterionResult>), failedMandatoryDescriptions (List<String>)`
    - Create `eligibility/domain/EligibilityPreviewResult.java` record: `eligible (boolean), criterionResults (List<CriterionResult>)`
    - Create `eligibility/domain/SettingsSnapshot.java` record: `lowMinScore (int), lowMaxAmount (BigDecimal), mediumMinScore (int), mediumMaxAmount (BigDecimal)`
    - _Requirements: REQ-ELG-01, REQ-ELG-03, BR-ELG-6, BR-ELG-8, BR-RISK-1_

  - [x] 2.3 Migrate and extend `Scheme` entity
    - Create `scheme/domain/Scheme.java`: copy all fields from `entity/Scheme.java`, replace `@PrePersist/@PreUpdate` with `@CreationTimestamp/@UpdateTimestamp`, add `@Enumerated(EnumType.STRING) SchemeCategory category`, add `int trancheCount` (default 1), add `int maxApplicationsPerBeneficiary` (default 1), add `@Version long version`; annotate with `@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder`
    - Retain `entity/Scheme.java` temporarily (do not delete yet — SchemeService and SchemeMapper still reference it; they will be updated in tasks 5 and 6)
    - _Requirements: REQ-SCH-01, AC-SCH-01.1, D-11_

  - [x] 2.4 Create `SchemeCriterion`, `MilestoneTemplate`, `SchemeRegionBudget` JPA entities
    - Create `scheme/domain/SchemeCriterion.java`: fields id, `@ManyToOne(LAZY) Scheme scheme`, `@Enumerated CriterionAttribute attribute`, `@Enumerated CriterionOperator operator`, `String threshold`, `int weight`, `boolean mandatory`, `String description`, created/updated timestamps (CreationTimestamp/UpdateTimestamp), `@Version long version`
    - Create `scheme/domain/MilestoneTemplate.java`: fields id, `@ManyToOne(LAZY) Scheme scheme`, `int sequence`, `String name`, `String description`, `BigDecimal tranchePercentage`, `int dueDays`, timestamps, version
    - Create `scheme/domain/SchemeRegionBudgetId.java` `@Embeddable` with `UUID schemeId` and `Long regionId`; implement `equals` and `hashCode`
    - Create `scheme/domain/SchemeRegionBudget.java`: `@EmbeddedId SchemeRegionBudgetId id`, `BigDecimal allocated`, `BigDecimal committed` (default ZERO), `BigDecimal disbursed` (default ZERO), timestamps, version; add `getRemaining()` convenience method
    - _Requirements: REQ-SCH-04, REQ-SCH-05, REQ-SCH-07, AC-SCH-04.2_

  - [x] 2.5 Create `EligibilityResult` JPA entity and extend `Beneficiary` entity
    - Create `eligibility/domain/EligibilityResult.java`: fields id, `UUID applicationId`, `UUID criterionId`, `boolean passed`, `int pointsAwarded`, `String beneficiaryValue`, `@CreationTimestamp Instant createdAt`; no updatedAt or version (append-only per BR-ELG-7)
    - Extend `entity/Beneficiary.java` with six new fields: `LocalDate dateOfBirth`, `BigDecimal annualIncome`, `BigDecimal landHoldingAcres`, `@Enumerated Gender gender`, `@Enumerated SocialCategory socialCategory`, `Boolean isDisabled`
    - _Requirements: REQ-ELG-02, AC-ELG-02.1, BR-ELG-7_

- [x] 3. Repository layer
  - [x] 3.1 Migrate `SchemeRepository` and create new scheme repositories
    - Create `scheme/repository/SchemeRepository.java` extending `JpaRepository<Scheme, UUID>` and `JpaSpecificationExecutor<Scheme>`: add `findByCode`, `existsByCode`, and `findAllOpenAndInWindow(@Param("today") LocalDate today)` JPQL query selecting OPEN schemes with startDate <= today and endDate >= today; use the new `scheme/domain/Scheme` import
    - Create `scheme/repository/SchemeCriterionRepository.java` extending `JpaRepository<SchemeCriterion, UUID>`: `findBySchemeIdOrderByCreatedAtAsc(UUID schemeId)`, `countBySchemeId(UUID schemeId)`, `deleteBySchemeId(UUID schemeId)`
    - Create `scheme/repository/MilestoneTemplateRepository.java` extending `JpaRepository<MilestoneTemplate, UUID>`: `findBySchemeIdOrderBySequenceAsc(UUID schemeId)`, `deleteBySchemeId(UUID schemeId)`
    - Create `scheme/repository/SchemeRegionBudgetRepository.java` extending `JpaRepository<SchemeRegionBudget, SchemeRegionBudgetId>`: `findByIdSchemeId(UUID schemeId)`, `findByIdSchemeIdAndIdRegionId(UUID schemeId, Long regionId)`, `existsByIdSchemeIdAndAllocatedGreaterThan(UUID schemeId, BigDecimal amount)`
    - _Requirements: REQ-SCH-02, REQ-SCH-04, REQ-SCH-05, REQ-SCH-07, AC-SCH-04.3_

  - [x] 3.2 Create `EligibilityResultRepository`
    - Create `eligibility/repository/EligibilityResultRepository.java` extending `JpaRepository<EligibilityResult, UUID>`: `findByApplicationId(UUID applicationId)`
    - _Requirements: REQ-ELG-02, AC-ELG-02.1, BR-ELG-7_

- [ ] 4. Pure-function components — EligibilityEvaluator and RiskTierPolicy
  - [-] 4.1 Implement `EligibilityEvaluator`
    - Create `eligibility/service/EligibilityEvaluator.java` annotated `@Component`
    - Implement `evaluate(List<CriterionSpec> criteria, BeneficiaryAttributes attributes) → EligibilityOutcome`:
      - For each criterion, extract the matching attribute value from `BeneficiaryAttributes` by `criterion.attribute()`
      - A null attribute value FAILS the criterion (BR-ELG-4); `pointsAwarded = 0`
      - Dispatch to per-operator evaluation: numeric types (AGE=int, ANNUAL_INCOME and LAND_HOLDING=BigDecimal) support EQ/NEQ/GT/GTE/LT/LTE/BETWEEN; ENUM types (GENDER, SOCIAL_CATEGORY, BENEFICIARY_TYPE) support EQ/NEQ/IN/NOT_IN; IS_DISABLED (BOOL) supports EQ; REGION supports IN/NOT_IN (matches exact code or any ancestor code using dot-notation prefix matching)
      - BETWEEN is **inclusive** at both boundaries (BR-ELG-2)
      - Compute score with `RoundingMode.HALF_UP` per formula `round(100 × sumPassedWeights / sumAllWeights)` (BR-ELG-6); use `BigDecimal` arithmetic throughout
      - If any mandatory criterion fails, set `autoRejected = true` and populate `failedMandatoryDescriptions` with that criterion's description (BR-ELG-5)
      - Return `EligibilityOutcome` with the computed score, autoRejected flag, per-criterion results, and failedMandatoryDescriptions
    - Package-private method `boolean evaluateSingleCriterion(CriterionSpec, BeneficiaryAttributes)` for direct unit testing
    - No Spring repositories or I/O — pure computation only (BR-ELG-8, AI-H1)
    - _Requirements: REQ-ELG-01, AC-ELG-01.1, AC-ELG-01.2, BR-ELG-2, BR-ELG-3, BR-ELG-4, BR-ELG-5, BR-ELG-6_

  - [ ] 4.2 Implement `RiskTierPolicy`
    - Create `eligibility/service/RiskTierPolicy.java` annotated `@Component`
    - Implement `evaluate(int score, BigDecimal amount, FieldFinding latestFinding, SettingsSnapshot settings) → RiskTier`:
      - **HIGH** (first match wins): `score < settings.mediumMinScore()` OR `amount.compareTo(settings.mediumMaxAmount()) > 0` OR `latestFinding == FieldFinding.MAJOR_MISMATCH`
      - **MEDIUM**: `score < settings.lowMinScore()` OR `amount.compareTo(settings.lowMaxAmount()) > 0`
      - **LOW**: otherwise
    - No Spring dependencies or I/O
    - _Requirements: REQ-ELG-04, AC-ELG-04.1, BR-RISK-1, BR-RISK-2_

- [ ] 5. Service layer
  - [~] 5.1 Implement `CriterionThresholdValidator`
    - Create `scheme/service/CriterionThresholdValidator.java` annotated `@Component`
    - Implement `validate(CriterionAttribute attribute, CriterionOperator operator, String threshold)`:
      - INT attributes (AGE): allow EQ/NEQ/GT/GTE/LT/LTE (single integer threshold) and BETWEEN ("min,max" where min < max, both parseable as int)
      - MONEY attributes (ANNUAL_INCOME) and DECIMAL (LAND_HOLDING): allow GT/GTE/LT/LTE/BETWEEN; threshold must parse as BigDecimal; BETWEEN threshold must be two comma-separated values with min < max
      - ENUM attributes (GENDER, SOCIAL_CATEGORY, BENEFICIARY_TYPE): allow EQ/NEQ (single valid enum value) and IN/NOT_IN (non-empty comma-separated list of valid enum values)
      - BOOL attribute (IS_DISABLED): allow EQ only; threshold must be "true" or "false"
      - REGION: allow IN/NOT_IN; threshold is non-empty comma-separated region codes
      - Any invalid combination throws `BusinessRuleException("INVALID_CRITERION", ...)`
    - _Requirements: REQ-SCH-04, AC-SCH-04.2, BR-ELG-2, BR-ELG-3_

  - [~] 5.2 Implement `SchemeActivationGate`
    - Create `scheme/service/SchemeActivationGate.java` annotated `@Component`
    - Implement `check(Scheme scheme, List<SchemeCriterion> criteria, List<MilestoneTemplate> templates, boolean hasBudget, LocalDate today) → List<String>`:
      - Collect all failures (do not short-circuit): `"NO_CRITERIA"` if criteria list is empty; `"INVALID_MILESTONE_TEMPLATES"` if template count ≠ scheme.trancheCount OR sum of tranchePercentages ≠ 100.00 (compare with scale 2); `"NO_ACTIVE_BUDGET"` if !hasBudget; `"END_DATE_PAST"` if scheme.endDate < today
    - Return empty list when all checks pass
    - _Requirements: REQ-SCH-06, AC-SCH-06.2_

  - [~] 5.3 Create `SchemeFilter` record and `SchemeQueryService`
    - Create `scheme/service/SchemeFilter.java` record: `SchemeStatus status`, `SchemeCategory category`, `boolean openNow`
    - Create `scheme/service/SchemeQueryService.java` interface with methods: `Scheme getOpenScheme(UUID schemeId, ActorContext actor)`, `Page<Scheme> listOpenSchemes(SchemeFilter filter, Pageable pageable, ActorContext actor)`, `List<SchemeCriterion> getCriteria(UUID schemeId)`, `List<MilestoneTemplate> getMilestoneTemplates(UUID schemeId)`
    - Create `scheme/service/SchemeQueryServiceImpl.java` implementing `SchemeQueryService`:
      - `getOpenScheme`: loads from `scheme/repository/SchemeRepository`, throws `ResourceNotFoundException` if not found or status ≠ OPEN
      - `listOpenSchemes`: builds a `Specification` from the filter (status, category, openNow = startDate<=today AND endDate>=today) and delegates to `JpaSpecificationExecutor`
      - `getCriteria` and `getMilestoneTemplates`: delegate to the new repositories
    - _Requirements: REQ-SCH-02, AC-SCH-02.1_

  - [~] 5.4 Implement `SchemeRegionBudgetService`
    - Create `scheme/service/SchemeRegionBudgetService.java` annotated `@Service @Transactional`
    - Implement `setBudget(UUID schemeId, Long regionId, SetBudgetRequest request, ActorContext actor) → BudgetResponse`:
      - Load scheme (404 if missing); validate regionId is DISTRICT via a `RegionQueryService` call (from foundation slice); throw `BusinessRuleException("BUDGET_BELOW_COMMITTED",...)` if `request.allocated < committed + disbursed` on an existing row; upsert the row; write audit log via `AuditService`
    - Implement `getBudgets(UUID schemeId, ActorContext actor) → List<BudgetResponse>`: return all rows for the scheme with computed `remaining`
    - Implement `getBudget(UUID schemeId, Long regionId) → SchemeRegionBudget` (cross-slice contract): return `null` when no row exists
    - _Requirements: REQ-SCH-07, AC-SCH-07.1, AC-SCH-07.2, AC-SCH-07.3_

  - [~] 5.5 Extend `SchemeService` with criteria, milestone template, and status gate logic
    - Migrate `SchemeService` to use `scheme/domain/Scheme` and `scheme/repository/SchemeRepository` (update imports); inject `SchemeCriterionRepository`, `MilestoneTemplateRepository`, `CriterionThresholdValidator`, `SchemeActivationGate`, `AuditService`
    - Extend `createScheme`: add `@Pattern` validation for code (`^[A-Z0-9_-]{3,30}$`); accept and set `category`, `trancheCount`, `maxApplicationsPerBeneficiary`; pass `ActorContext actor` parameter; write audit entry
    - Extend `listSchemes`: accept `SchemeFilter filter` and `ActorContext actor`; non-ADMIN roles must not see DRAFT schemes (filter by status ≠ DRAFT when role ≠ ADMIN)
    - Extend `updateScheme`: accept `ActorContext actor`; in OPEN or PAUSED status, throw `BusinessRuleException("SCHEME_LOCKED",...)` for attempts to modify `startDate`, `minGrantAmount`, `maxGrantAmount`, `category`, `trancheCount`, or `maxApplicationsPerBeneficiary`; allow `name`, `description`, `endDate` (endDate ≥ today check for non-DRAFT)
    - Extend `updateStatus`: call `SchemeActivationGate.check()` for DRAFT→OPEN transitions; throw `BusinessRuleException("SCHEME_NOT_READY", ...)` listing all failures if the gate returns a non-empty list; enforce state machine rules: CLOSED is terminal, DRAFT can only go to OPEN; throw `BusinessRuleException("INVALID_STATUS_TRANSITION",...)` for invalid transitions
    - Extend `deleteScheme`: throw `BusinessRuleException("SCHEME_LOCKED",...)` if scheme is not DRAFT (instead of only checking applications)
    - Add `addCriterion(UUID schemeId, CreateCriterionRequest request, ActorContext actor)`: scheme must be DRAFT; count ≤ 20; delegate threshold validation to `CriterionThresholdValidator`; return `CriterionResponse`
    - Add `updateCriterion(UUID schemeId, UUID cid, UpdateCriterionRequest request, ActorContext actor)`: DRAFT only; re-validate threshold
    - Add `deleteCriterion(UUID schemeId, UUID cid, ActorContext actor)`: DRAFT only
    - Add `listCriteria(UUID schemeId, ActorContext actor) → List<CriterionResponse>`: ordered by created_at ASC
    - Add `setMilestoneTemplates(UUID schemeId, SetMilestoneTemplatesRequest request, ActorContext actor)`: DRAFT only; replace full list atomically (delete all then insert); validate count == trancheCount and sum of percentages == 100.00
    - Add `getMilestoneTemplates(UUID schemeId, ActorContext actor) → List<MilestoneTemplateResponse>`
    - _Requirements: REQ-SCH-01–08, AC-SCH-01.1–08.1_

  - [~] 5.6 Implement `EligibilityPreviewService`
    - Create `eligibility/service/EligibilityPreviewService.java` annotated `@Service @Transactional(readOnly=true)`
    - Implement `preview(UUID schemeId, ActorContext actor) → EligibilityPreviewResult`:
      - Load open scheme via `SchemeQueryService.getOpenScheme()`
      - Load criteria via `SchemeQueryService.getCriteria()`
      - Load beneficiary profile via `BeneficiaryQueryService.getProfileForUser(actor.userId())`; throw `ResourceNotFoundException` if no profile
      - Build `BeneficiaryAttributes` from the beneficiary entity (compute `age` as whole years from `dateOfBirth` to today in IST; pass other fields directly)
      - Convert criteria to `List<CriterionSpec>`
      - Call `EligibilityEvaluator.evaluate()`
      - Return `EligibilityPreviewResult` with `eligible = !outcome.autoRejected()` and the per-criterion results (do NOT include score, weights, or risk tier — INV-01, AC-ELG-03.2)
    - _Requirements: REQ-ELG-03, AC-ELG-03.1, AC-ELG-03.2_

- [ ] 6. API layer — DTOs, mappers, and controllers
  - [~] 6.1 Create criterion and milestone template DTOs
    - Create `scheme/api/CreateCriterionRequest.java`: fields `@NotNull CriterionAttribute attribute`, `@NotNull CriterionOperator operator`, `@NotBlank String threshold`, `@NotNull @Min(1) @Max(100) Integer weight`, `@NotNull Boolean mandatory`, `String description`
    - Create `scheme/api/UpdateCriterionRequest.java`: same fields as `CreateCriterionRequest`
    - Create `scheme/api/CriterionResponse.java`: fields `UUID id`, `CriterionAttribute attribute`, `CriterionOperator operator`, `String threshold`, `int weight`, `boolean mandatory`, `String description`, `Instant createdAt`
    - Create `scheme/api/MilestoneTemplateItem.java`: fields `@NotBlank @Size(max=200) String name`, `String description`, `@NotNull @DecimalMin("0.01") BigDecimal tranchePercentage`, `@NotNull @Min(0) Integer dueDays`
    - Create `scheme/api/SetMilestoneTemplatesRequest.java`: field `@NotNull @Size(min=1) List<MilestoneTemplateItem> templates`
    - Create `scheme/api/MilestoneTemplateResponse.java`: fields `UUID id`, `int sequence`, `String name`, `String description`, `BigDecimal tranchePercentage`, `int dueDays`
    - Create `scheme/api/SetBudgetRequest.java`: field `@NotNull @DecimalMin("0.01") BigDecimal allocated`
    - Create `scheme/api/BudgetResponse.java`: fields `Long regionId`, `String regionCode`, `BigDecimal allocated`, `BigDecimal committed`, `BigDecimal disbursed`, `BigDecimal remaining`
    - _Requirements: REQ-SCH-04, REQ-SCH-05, REQ-SCH-07_

  - [~] 6.2 Extend existing scheme request/response DTOs
    - Extend `scheme/api/CreateSchemeRequest.java`: add `@NotNull SchemeCategory category`, `@NotNull @Min(1) @Max(10) Integer trancheCount`, `@Min(1) Integer maxApplicationsPerBeneficiary`; add `@Pattern(regexp = "^[A-Z0-9_-]{3,30}$")` to `code`
    - Extend `scheme/api/UpdateSchemeRequest.java`: add `SchemeCategory category`, `@Min(1) @Max(10) Integer trancheCount`, `@Min(1) Integer maxApplicationsPerBeneficiary`
    - Extend `scheme/api/SchemeResponse.java`: add `SchemeCategory category`, `int trancheCount`, `int maxApplicationsPerBeneficiary`, `List<CriterionResponse> criteria`, `List<MilestoneTemplateResponse> milestoneTemplates`
    - Extend `scheme/api/SchemeSummaryResponse.java`: add `SchemeCategory category`
    - _Requirements: REQ-SCH-01, AC-SCH-01.1, REQ-SCH-02, AC-SCH-02.2_

  - [~] 6.3 Create eligibility API DTOs
    - Create `eligibility/api/EligibilityCriterionResult.java`: fields `String description`, `boolean mandatory`, `boolean met`
    - Create `eligibility/api/EligibilityCheckResponse.java`: fields `boolean eligible`, `List<EligibilityCriterionResult> criteria`
    - Create `eligibility/api/EligibleSchemeResponse.java`: fields `UUID id`, `String name`, `String code`, `SchemeCategory category`, `LocalDate startDate`, `LocalDate endDate`, `BigDecimal minGrantAmount`, `BigDecimal maxGrantAmount`
    - _Requirements: REQ-ELG-03, AC-ELG-03.1, AC-ELG-03.2_

  - [~] 6.4 Create MapStruct mappers
    - Create `scheme/mapper/CriterionMapper.java` `@Mapper(componentModel="spring")`: `CriterionResponse toResponse(SchemeCriterion criterion)`, `CriterionSpec toSpec(SchemeCriterion criterion)`
    - Create `scheme/mapper/MilestoneTemplateMapper.java` `@Mapper(componentModel="spring")`: `MilestoneTemplateResponse toResponse(MilestoneTemplate template)`
    - Create `scheme/mapper/BudgetMapper.java` `@Mapper(componentModel="spring")`: `BudgetResponse toResponse(SchemeRegionBudget budget)` — map `id.regionId` to `regionId`; map computed `remaining`
    - Extend `scheme/mapper/SchemeMapper.java`: update source type to `scheme/domain/Scheme`; add mappings for `category`, `trancheCount`, `maxApplicationsPerBeneficiary`, `criteria`, `milestoneTemplates` to `SchemeResponse`; add `category` mapping to `SchemeSummaryResponse`
    - _Requirements: REQ-SCH-01, REQ-SCH-02, REQ-SCH-04, REQ-SCH-05, REQ-SCH-07_

  - [~] 6.5 Extend `SchemeController` with filter params and wire new DTOs
    - Update `SchemeController` to pass `ActorContext` (resolved from security context) to all `SchemeService` methods
    - Add `status`, `category`, and `openNow` query parameters to `GET /schemes`; build `SchemeFilter` from them and pass to `schemeService.listSchemes()`
    - _Requirements: REQ-SCH-02, AC-SCH-02.1_

  - [~] 6.6 Create `CriterionController`
    - Create `scheme/api/CriterionController.java` mapped to `/api/v1/schemes/{id}/criteria`:
      - `GET /` → `200 List<CriterionResponse>` (any authenticated role)
      - `POST /` → `201 CriterionResponse` (ADMIN only)
      - `PUT /{cid}` → `200 CriterionResponse` (ADMIN only)
      - `DELETE /{cid}` → `204` (ADMIN only)
    - Delegate to `SchemeService`; extract `ActorContext` from security context
    - _Requirements: REQ-SCH-04, AC-SCH-04.1, AC-SCH-04.2, AC-SCH-04.3_

  - [~] 6.7 Create `MilestoneTemplateController`
    - Create `scheme/api/MilestoneTemplateController.java` mapped to `/api/v1/schemes/{id}/milestone-templates`:
      - `GET /` → `200 List<MilestoneTemplateResponse>` (any authenticated)
      - `PUT /` → `200 List<MilestoneTemplateResponse>` (ADMIN only)
    - Delegate to `SchemeService`
    - _Requirements: REQ-SCH-05, AC-SCH-05.1, AC-SCH-05.2_

  - [~] 6.8 Create `BudgetController`
    - Create `scheme/api/BudgetController.java` mapped to `/api/v1/schemes/{id}/budgets`:
      - `GET /` → `200 List<BudgetResponse>` (ADMIN or FA role)
      - `PUT /{regionId}` → `200 BudgetResponse` (ADMIN only)
    - Delegate to `SchemeRegionBudgetService`
    - _Requirements: REQ-SCH-07, AC-SCH-07.1, AC-SCH-07.2_

  - [~] 6.9 Create `EligibilityController`
    - Create `eligibility/api/EligibilityController.java`:
      - `POST /api/v1/schemes/{id}/eligibility-check` (BENEFICIARY only) → `200 EligibilityCheckResponse`; delegate to `EligibilityPreviewService.preview()`; map `EligibilityPreviewResult` to response (do NOT expose score, weights, or risk tier)
      - `GET /api/v1/schemes/eligible` (BENEFICIARY only) → `200 PagedResponse<EligibleSchemeResponse>`; run `EligibilityPreviewService` to find OPEN in-window schemes where mandatory criteria pass for the caller's current profile; paginated
    - Return `403 ACCESS_DENIED` for non-BENEFICIARY callers
    - _Requirements: REQ-ELG-03, AC-ELG-03.1, AC-ELG-03.2, AC-ELG-03.3_

- [ ] 7. Unit tests — jqwik PBT and Mockito
  - [~] 7.1 Write property tests for `EligibilityEvaluator` (jqwik)
    - Create `src/test/java/.../eligibility/service/EligibilityEvaluatorTest.java`
    - **Property 1: null attribute always fails** — for any `CriterionSpec` and any nulled attribute in `BeneficiaryAttributes`, the corresponding criterion result must have `passed=false`
      - **Validates: AC-ELG-01.2, BR-ELG-4**
    - **Property 2: BETWEEN inclusive at both boundaries** — for any `min` and `range > 0`, threshold `"min,min+range"`, value=min → passed; value=min+range → passed; value=min-1 → failed; value=min+range+1 → failed
      - **Validates: AC-ELG-01.1, BR-ELG-2**
    - **Property 3: score formula correctness** — for any non-empty criteria list and any attributes, `outcome.score()` must equal `round_half_up(100 × sumPassedWeights / sumAllWeights)` computed independently
      - **Validates: AC-ELG-01.1, BR-ELG-6**
    - **Property 4: mandatory failure triggers auto-rejection** — for any criteria list with ≥1 mandatory criterion failing, `outcome.autoRejected()` must be true and `failedMandatoryDescriptions` non-empty
      - **Validates: AC-ELG-02.2, BR-ELG-5**
    - Add example-based tests for all operator × attribute-type combinations (EQ/NEQ int, EQ enum, GT/GTE/LT/LTE numeric boundaries, BETWEEN inclusive, IN/NOT_IN enum csv, IN region ancestor match) per AC-ELG-01.1
    - _Requirements: REQ-ELG-01, AC-ELG-01.1, AC-ELG-01.2_

  - [~] 7.2 Write property tests for `RiskTierPolicy` (jqwik)
    - Create `src/test/java/.../eligibility/service/RiskTierPolicyTest.java`
    - **Property 5: tier classification matches rule definition** — for any (score, amount, FieldFinding), verify the returned tier matches the first-match priority rule
      - **Validates: REQ-ELG-04, AC-ELG-04.1, BR-RISK-1**
    - **Property 6: risk tier is monotonically non-decreasing** — for any sequence of (score, amount, finding) inputs, the tier ordinal (LOW=0, MEDIUM=1, HIGH=2) must never decrease across the sequence
      - **Validates: BR-RISK-2**
    - Add boundary example tests: `score=49` → HIGH, `score=50` with NONE finding and low amount → MEDIUM, `score=74` → MEDIUM, `score=75` → LOW; `amount=50000.00` → LOW, `amount=50000.01` → MEDIUM, `amount=200000.00` → MEDIUM, `amount=200000.01` → HIGH; MAJOR_MISMATCH with score=80 → HIGH
    - _Requirements: REQ-ELG-04, AC-ELG-04.1_

  - [~] 7.3 Write unit tests for `SchemeActivationGate`
    - Create `src/test/java/.../scheme/service/SchemeActivationGateTest.java`
    - Each activation gate condition tested in isolation: `noCriteria_returnsNoCriteriaFailure`, `templateCountMismatch_returnsInvalidTemplateFailure`, `templatePercentagesNotSumTo100_returnsInvalidTemplateFailure`, `noBudget_returnsNoBudgetFailure`, `endDateInPast_returnsEndDateFailure`, `allConditionsMet_returnsEmptyList`, `multipleFailures_returnsAllFailures` (verify that ALL failures are collected, not just the first)
    - _Requirements: REQ-SCH-06, AC-SCH-06.2_

  - [~] 7.4 Write unit tests for `CriterionThresholdValidator`
    - Create `src/test/java/.../scheme/service/CriterionThresholdValidatorTest.java`
    - Test: `betweenThreshold_requiresTwoValues`, `betweenThreshold_requiresMinLessThanMax`, `inThreshold_requiresNonEmptyCsvList`, `boolThreshold_requiresTrueOrFalse`, `enumThreshold_rejectsInvalidEnumValue`, `incompatibleOperatorForAttribute_throwsInvalidCriterion` (GT on GENDER, IN on AGE, etc.)
    - _Requirements: REQ-SCH-04, AC-SCH-04.2, BR-ELG-3_

  - [~] 7.5 Write unit tests for `SchemeService` (Mockito)
    - Create `src/test/java/.../scheme/service/SchemeServiceTest.java`
    - `createScheme_throwsDuplicateCode`, `createScheme_throwsWhenStartDateAfterEndDate`, `createScheme_throwsWhenMaxAmountLessThanMin`, `updateScheme_throwsSchemeLockedWhenOpenAndModifyingLockedField`, `updateScheme_allowsNameChangeWhenOpen`, `updateScheme_throwsSchemeLockedWhenPausedAndModifyingLockedField`, `updateStatus_throwsInvalidTransitionFromClosed`, `updateStatus_throwsInvalidTransitionFromDraftToPaused`, `addCriterion_throwsSchemeLockedWhenNotDraft`, `addCriterion_throwsWhenMoreThan20Criteria`, `setMilestoneTemplates_throwsWhenCountMismatch`, `setMilestoneTemplates_throwsWhenPercentagesDontSum`, `deleteScheme_throwsResourceInUseWhenApplicationsExist`, `deleteScheme_throwsSchemeLockedWhenNotDraft`, `listSchemes_nonAdminDoesNotSeeDraftSchemes`
    - _Requirements: REQ-SCH-01, REQ-SCH-03, REQ-SCH-04, REQ-SCH-05, REQ-SCH-06, REQ-SCH-08_

- [ ] 8. Controller tests — @WebMvcTest MockMvc
  - [~] 8.1 Write `SchemeControllerTest`
    - Create `src/test/java/.../scheme/api/SchemeControllerTest.java` with `@WebMvcTest(SchemeController.class)` and mocked `SchemeService`
    - `POST /schemes` → 201 with valid body; → 400 when code pattern invalid; → 400 when endDate before startDate; → 409 on duplicate code
    - `GET /schemes` → 200 paginated; non-admin does not see DRAFT schemes
    - `GET /schemes/{id}` → 200 with criteria and milestone templates; → 404 for unknown id
    - `PUT /schemes/{id}` → 422 SCHEME_LOCKED when modifying a locked field on OPEN scheme
    - `PATCH /schemes/{id}/status` → 409 INVALID_STATUS_TRANSITION from CLOSED; → 422 SCHEME_NOT_READY on DRAFT→OPEN with missing criteria
    - `DELETE /schemes/{id}` → 204 for DRAFT with no applications; → 409 RESOURCE_IN_USE when applications exist; → 422 SCHEME_LOCKED when not DRAFT
    - _Requirements: REQ-SCH-01–03, REQ-SCH-06, REQ-SCH-08_

  - [~] 8.2 Write `CriterionControllerTest`
    - Create `src/test/java/.../scheme/api/CriterionControllerTest.java` with `@WebMvcTest(CriterionController.class)`
    - `POST /schemes/{id}/criteria` → 422 SCHEME_LOCKED when scheme not DRAFT; → 400 INVALID_CRITERION for incompatible operator/type combination; → 201 with valid body
    - `GET /schemes/{id}/criteria` → 200 ordered by creation time
    - _Requirements: REQ-SCH-04, AC-SCH-04.1, AC-SCH-04.2, AC-SCH-04.3_

  - [~] 8.3 Write `BudgetControllerTest` and `EligibilityControllerTest`
    - Create `src/test/java/.../scheme/api/BudgetControllerTest.java` with `@WebMvcTest(BudgetController.class)`
      - `PUT /schemes/{id}/budgets/{regionId}` → 400 when regionId is not a DISTRICT; → 422 BUDGET_BELOW_COMMITTED; → 200 for valid request
      - `GET /schemes/{id}/budgets` → 403 for BENEFICIARY role
    - Create `src/test/java/.../eligibility/api/EligibilityControllerTest.java` with `@WebMvcTest(EligibilityController.class)`
      - `POST /schemes/{id}/eligibility-check` → 200 with correct response shape (eligible flag + criteria list, NO score/weight/tier); → 403 when caller is not BENEFICIARY
      - `GET /schemes/eligible` → 200 paginated, only OPEN in-window schemes
    - _Requirements: REQ-SCH-07, REQ-ELG-03, AC-ELG-03.1, AC-ELG-03.2_

- [ ] 9. Integration tests — Testcontainers
  - [~] 9.1 Write `SchemeMigrationIT`
    - Create `src/test/java/.../scheme/SchemeMigrationIT.java` extending `BaseIT`
    - Verify DB CHECK violations: `schemeTrancheCount_mustBeBetween1And10`, `schemeMinGrantAmount_mustBeGreaterThanZero`
    - Verify UNIQUE constraint: `milestoneTemplate_sequenceMustBeUniquePerScheme`
    - Verify CHECK constraint: `budget_committedPlusDisbursed_mustNotExceedAllocated`
    - Verify FK constraints: `budget_regionIdMustExist`, `criterion_schemeIdMustExist`
    - _Requirements: REQ-SCH-01, REQ-SCH-05, REQ-SCH-07, AC-SCH-01.2_

  - [~] 9.2 Write `EligibilityEvaluatorIntegrationIT`
    - Create `src/test/java/.../eligibility/EligibilityEvaluatorIntegrationIT.java` extending `BaseIT`
    - `submitApplication_withKnownCriteria_setsCorrectScore`: insert a scheme with known criteria weights, submit an application, assert `eligibility_score` matches the expected formula result
    - `submitApplication_withFailingMandatoryCriterion_setsAutoRejected`: criterion marked mandatory fails → application status is AUTO_REJECTED
    - `submitApplication_persistsOneResultRowPerCriterion`: after submission, verify one `eligibility_result` row exists per criterion in the scheme (BR-ELG-7)
    - _Requirements: REQ-ELG-02, AC-ELG-02.1, AC-ELG-02.2, BR-ELG-7_

- [ ] 10. Cross-slice contract verification checkpoint
  - [~] 10.1 Verify cross-slice interface accessibility
    - Add a Spring `@Component` smoke-test class `scheme/service/CrossSliceContractVerifier.java` (or equivalent `@SpringBootTest` test) that autowires: `SchemeQueryService`, `SchemeRegionBudgetService`, `EligibilityEvaluator`, `RiskTierPolicy`, `EligibilityPreviewService`; and asserts that each bean is non-null and callable with synthetic inputs
    - Confirm no circular dependencies or missing beans at application startup
    - Ensure all five interfaces listed in requirements §10 are resolvable by `application-workflow` consumers
    - _Requirements: REQ-ELG-01, REQ-ELG-03, REQ-SCH-02, REQ-SCH-07, BR-ELG-8_

- [~] 11. Final checkpoint — Ensure all tests pass
  - Run `./mvnw test` and confirm zero test failures for all unit and controller tests
  - Run `./mvnw verify` (Testcontainers integration tests) and confirm zero failures
  - Verify that the application context starts without errors with `./mvnw spring-boot:run -Dspring-boot.run.jvmArguments="-Dspring.profiles.active=test"` (or equivalent smoke test)
  - Ask the user if any questions arise before proceeding to other slices

---

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Tasks 1–3 establish the foundation; nothing in tasks 4–10 can compile without them
- Task 4 (pure-function components) has no Spring or DB dependencies and can be developed and tested before the rest of the service layer is wired
- `entity/Scheme.java` is intentionally retained through task 5.5; remove it only after all references in `SchemeService`, `SchemeMapper`, and existing controllers have been updated to `scheme/domain/Scheme`
- The `EligibilityEvaluator` must never make I/O calls; any requirement for database reads (e.g. region ancestor lookup) must be pre-resolved by the caller and passed in `BeneficiaryAttributes`
- `EligibilityPreviewResult` deliberately omits score, weights, and risk tier to comply with INV-01

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3"] },
    { "id": 3, "tasks": ["2.4", "2.5"] },
    { "id": 4, "tasks": ["3.1", "3.2"] },
    { "id": 5, "tasks": ["4.1", "4.2"] },
    { "id": 6, "tasks": ["5.1", "5.2", "5.3"] },
    { "id": 7, "tasks": ["5.4", "5.5"] },
    { "id": 8, "tasks": ["5.6", "6.1", "6.2", "6.3"] },
    { "id": 9, "tasks": ["6.4"] },
    { "id": 10, "tasks": ["6.5", "6.6", "6.7", "6.8"] },
    { "id": 11, "tasks": ["6.9", "7.1", "7.2"] },
    { "id": 12, "tasks": ["7.3", "7.4", "7.5"] },
    { "id": 13, "tasks": ["8.1", "8.2"] },
    { "id": 14, "tasks": ["8.3", "9.1"] },
    { "id": 15, "tasks": ["9.2", "10.1"] }
  ]
}
```
