# scheme-eligibility — Module Design

> Implements: REQ-SCH-01–08, REQ-ELG-01–04
> Spec slice: `.kiro/specs/scheme-eligibility/requirements.md`
> Master requirements: `docs/requirements.md` v2.0 (Baselined)

---

## Overview

The `scheme-eligibility` slice adds full scheme lifecycle management (criteria, milestone templates, regional budgets, status state machine) and the eligibility scoring engine to GSDTS. It builds on the `foundation` slice (auth, JWT, audit, settings cache) and exposes pure-function evaluators consumed by `application-workflow`.

Key responsibilities:
- **Scheme management**: CRUD, status state machine (DRAFT → OPEN ↔ PAUSED → CLOSED), criteria, milestone templates, and regional budget management.
- **Eligibility evaluator**: Pure function (`EligibilityEvaluator`) that scores criteria against beneficiary attributes per BR-ELG-1 to BR-ELG-8. No I/O.
- **Risk tier policy**: Pure function (`RiskTierPolicy`) that derives LOW / MEDIUM / HIGH tier from score, amount, and latest field finding.
- **Eligibility preview**: Non-persisting check available to beneficiaries before submission.
- **Cross-slice contracts**: `SchemeQueryService`, `SchemeRegionBudgetService`, and `EligibilityEvaluator` are consumed by `application-workflow`; `RiskTierPolicy` is called at submission and re-evaluated on each field report.

The slice owns the `scheme_criterion`, `milestone_template`, and `scheme_region_budget` tables. It alters the existing `scheme` and `beneficiary` tables and writes to `eligibility_result` (structurally owned by `application-workflow`).

---

## Architecture

```
                      HTTP Clients (ADMIN, BENEFICIARY)
                                    │
              ┌─────────────────────▼──────────────────────┐
              │  JwtAuthFilter  →  ActorContext              │  (foundation)
              └─────────────────────┬──────────────────────┘
                                    │
         ┌──────────────┬───────────┴──────────┬───────────────┐
         │              │                      │               │
  ┌──────▼──────┐ ┌──────▼───────┐  ┌──────────▼─────┐  ┌────▼──────────────┐
  │SchemeCtrl   │ │CriterionCtrl │  │MilestoneCtrl   │  │BudgetCtrl         │
  │/schemes     │ │/criteria     │  │/milestone-     │  │/budgets           │
  │             │ │              │  │templates       │  │                   │
  └──────┬──────┘ └──────┬───────┘  └──────────┬─────┘  └────┬──────────────┘
         │               │                     │              │
  ┌──────▼───────────────▼─────────────────────▼──────────────▼──────────────┐
  │                         SchemeService (orchestrates)                      │
  │   SchemeQueryService (read-only cross-slice interface)                    │
  │   SchemeRegionBudgetService (budget reads for pre-checks)                 │
  └──────┬───────────────────────────┬────────────────────────────────────────┘
         │                           │
  ┌──────▼─────────┐    ┌────────────▼─────────────────────────────────────┐
  │ Eligibility    │    │  EligibilityPreviewService                       │
  │ Controller     │    │   calls EligibilityEvaluator (pure fn)           │
  │ /eligibility-  │    │   calls RiskTierPolicy (pure fn)                 │
  │  check         │    │   reads BeneficiaryQueryService (foundation)     │
  │ /eligible      │    └──────────────────────────────────────────────────┘
  └──────┬─────────┘
         │
  ┌──────▼───────────────────────────────────────────────────────────────────┐
  │  EligibilityEvaluator  │  RiskTierPolicy  (pure functions — AI-H1)      │
  │  List<CriterionSpec>   │  int score, BigDecimal amount, FieldFinding,    │
  │  BeneficiaryAttributes │  SettingsSnapshot                               │
  │  → EligibilityOutcome  │  → RiskTier                                     │
  └──────────────────────────────────────────────────────────────────────────┘
         │
  ┌──────▼──────────────────────────────────────────────────┐
  │  PostgreSQL 15 (Flyway-managed)                          │
  │  scheme · scheme_criterion · milestone_template          │
  │  scheme_region_budget · eligibility_result               │
  │  beneficiary (altered)                                   │
  └──────────────────────────────────────────────────────────┘
```

**Key architectural decisions:**

| Decision | Detail |
|---|---|
| Pure-function evaluators | `EligibilityEvaluator` and `RiskTierPolicy` have no Spring dependencies or I/O. They accept value records and return value records. This makes them trivially testable with jqwik PBT. |
| `BeneficiaryAttributes` snapshot | Eligibility evaluation always uses a snapshot of beneficiary attributes, never re-reads from DB during evaluation. At submission, the snapshot is stored in `application.beneficiary_snapshot` (by `application-workflow`). |
| Settings via `SettingsSnapshot` | `RiskTierPolicy` accepts a `SettingsSnapshot` value record (copied from `SettingsCacheService` at call time), keeping it pure. The caller is responsible for reading the cache. |
| Budget locking in `application-workflow` | `SchemeRegionBudgetService` only provides plain reads. Budget commitment with `PESSIMISTIC_WRITE` is owned by `application-workflow`. |
| `Scheme` entity migration | `entity/Scheme.java` is migrated to `scheme/domain/Scheme.java` with new columns. The original path is replaced; all existing references are updated. |
| Region check in budget endpoint | `PUT /budgets/{regionId}` validates that `regionId` is a DISTRICT by calling `RegionQueryService` from `foundation`. |

---

## Components and Interfaces

### Cross-slice interfaces exposed by this slice (verbatim from requirements §10)

```java
// com.govgrants.subsidygrant.scheme.service.SchemeQueryService
Scheme getOpenScheme(UUID schemeId, ActorContext actor);
Page<Scheme> listOpenSchemes(SchemeFilter filter, Pageable pageable, ActorContext actor);
List<SchemeCriterion> getCriteria(UUID schemeId);
List<MilestoneTemplate> getMilestoneTemplates(UUID schemeId);

// com.govgrants.subsidygrant.scheme.service.SchemeRegionBudgetService
SchemeRegionBudget getBudget(UUID schemeId, Long regionId);  // null when no row exists

// com.govgrants.subsidygrant.eligibility.EligibilityEvaluator  (pure function — AI-H1)
EligibilityOutcome evaluate(List<CriterionSpec> criteria, BeneficiaryAttributes attributes);

// com.govgrants.subsidygrant.eligibility.RiskTierPolicy  (pure function)
RiskTier evaluate(int score, BigDecimal amount, FieldFinding latestFinding, SettingsSnapshot settings);

// com.govgrants.subsidygrant.eligibility.EligibilityPreviewService
EligibilityPreviewResult preview(UUID schemeId, ActorContext actor);
```

### Cross-slice interfaces consumed by this slice (from requirements §11)

```java
// foundation — AuditService
void record(AuditEntry entry, ActorContext actor);

// foundation — SettingsCacheService
int getInt(String key);
BigDecimal getMoney(String key);

// foundation — RegionQueryService
Region getById(Long regionId);

// beneficiary-documents — BeneficiaryQueryService
Beneficiary getProfileForUser(UUID userId);
```

---

## Data Models

### Tables owned by this slice

| Table | Type | Key columns |
|---|---|---|
| `scheme` | Existing (altered) | +category, +tranche_count, +max_applications_per_beneficiary, +version |
| `scheme_criterion` | New | scheme_id FK, attribute, operator, threshold, weight, mandatory, description |
| `milestone_template` | New | scheme_id FK, sequence, name, description, tranche_percentage, due_days |
| `scheme_region_budget` | New | scheme_id FK, region_id FK, allocated, committed, disbursed |
| `beneficiary` | Existing (altered) | +date_of_birth, +annual_income, +land_holding_acres, +gender, +social_category, +is_disabled |
| `eligibility_result` | New (written here, owned by application-workflow) | application_id FK, criterion_id FK, passed, points_awarded, beneficiary_value |

---

## 1. Module Layout

```
com.govgrants.subsidygrant
├── scheme
│   ├── api
│   │   ├── SchemeController.java               — Existing; extended for new endpoints and new request fields
│   │   ├── CriterionController.java            — NEW; handles /schemes/{id}/criteria[/{cid}]
│   │   ├── MilestoneTemplateController.java    — NEW; handles /schemes/{id}/milestone-templates
│   │   ├── BudgetController.java               — NEW; handles /schemes/{id}/budgets[/{regionId}]
│   │   ├── CreateSchemeRequest.java            — Existing; +category, +trancheCount, +maxApplicationsPerBeneficiary
│   │   ├── UpdateSchemeRequest.java            — Existing; +category gated by status check in service
│   │   ├── SchemeStatusRequest.java            — Existing; unchanged
│   │   ├── SchemeResponse.java                 — Existing; +category, +trancheCount, +maxApplicationsPerBeneficiary, +criteria, +milestoneTemplates
│   │   ├── SchemeSummaryResponse.java          — Existing; +category
│   │   ├── CreateCriterionRequest.java         — NEW; attribute, operator, threshold, weight, mandatory, description
│   │   ├── UpdateCriterionRequest.java         — NEW; same fields as create
│   │   ├── CriterionResponse.java              — NEW; all criterion fields
│   │   ├── SetMilestoneTemplatesRequest.java   — NEW; ordered list of milestone template items
│   │   ├── MilestoneTemplateItem.java          — NEW; name, description, tranchePercentage, dueDays (request item)
│   │   ├── MilestoneTemplateResponse.java      — NEW; all milestone template fields
│   │   ├── SetBudgetRequest.java               — NEW; allocated NUMERIC(14,2)
│   │   └── BudgetResponse.java                 — NEW; regionId, allocated, committed, disbursed, remaining
│   ├── domain
│   │   ├── Scheme.java                         — MIGRATED from entity/; +category, +trancheCount, +maxApplicationsPerBeneficiary, +version
│   │   ├── SchemeCriterion.java                — NEW JPA entity for scheme_criterion
│   │   ├── MilestoneTemplate.java              — NEW JPA entity for milestone_template
│   │   ├── SchemeRegionBudget.java             — NEW JPA entity for scheme_region_budget
│   │   ├── SchemeRegionBudgetId.java           — NEW @Embeddable composite PK (schemeId, regionId)
│   │   └── SchemeCategory.java                 — NEW enum: AGRICULTURE, EDUCATION, MSME, HOUSING, HEALTH, LIVELIHOOD, OTHER
│   ├── repository
│   │   ├── SchemeRepository.java               — MIGRATED from repository/; +new query methods
│   │   ├── SchemeCriterionRepository.java      — NEW
│   │   ├── MilestoneTemplateRepository.java    — NEW
│   │   └── SchemeRegionBudgetRepository.java   — NEW
│   ├── mapper
│   │   ├── SchemeMapper.java                   — Existing; updated for new fields
│   │   ├── CriterionMapper.java                — NEW MapStruct mapper
│   │   ├── MilestoneTemplateMapper.java        — NEW MapStruct mapper
│   │   └── BudgetMapper.java                   — NEW MapStruct mapper
│   └── service
│       ├── SchemeService.java                  — Existing; extended with criteria/template/budget/status-gate logic
│       ├── SchemeQueryService.java             — NEW interface + impl; cross-slice read-only contract
│       ├── SchemeRegionBudgetService.java      — NEW; budget read + write operations
│       ├── SchemeFilter.java                   — NEW record: status, category, openNow (boolean), page, size
│       └── SchemeActivationGate.java           — NEW; validates all DRAFT→OPEN preconditions (AC-SCH-06.2)
│
├── eligibility
│   ├── api
│   │   ├── EligibilityController.java          — NEW; POST /schemes/{id}/eligibility-check, GET /schemes/eligible
│   │   ├── EligibilityCheckResponse.java       — NEW; eligible (bool), criteria list (description, mandatory, met)
│   │   ├── EligibilityCriterionResult.java     — NEW; response item for each criterion in preview
│   │   └── EligibleSchemeResponse.java         — NEW; lightweight scheme summary for GET /schemes/eligible
│   ├── domain
│   │   ├── CriterionSpec.java                  — NEW record: attribute, operator, threshold, weight, mandatory, description
│   │   ├── BeneficiaryAttributes.java          — NEW record: age, annualIncome, landHoldingAcres, gender, socialCategory, isDisabled, beneficiaryType, regionCode
│   │   ├── EligibilityOutcome.java             — NEW record: score (int), autoRejected (bool), criterionResults (List<CriterionResult>), failedMandatoryDescriptions (List<String>)
│   │   ├── CriterionResult.java                — NEW record: criterionId, description, mandatory, passed, pointsAwarded, beneficiaryValue
│   │   ├── EligibilityPreviewResult.java       — NEW record: eligible (bool), criterionResults (List<CriterionResult>)
│   │   ├── RiskTier.java                       — NEW enum: LOW, MEDIUM, HIGH
│   │   ├── FieldFinding.java                   — NEW enum: NONE, MINOR_MISMATCH, MAJOR_MISMATCH
│   │   ├── SettingsSnapshot.java               — NEW record: lowMinScore, lowMaxAmount, mediumMinScore, mediumMaxAmount
│   │   ├── CriterionAttribute.java             — NEW enum: AGE, ANNUAL_INCOME, LAND_HOLDING, GENDER, SOCIAL_CATEGORY, IS_DISABLED, BENEFICIARY_TYPE, REGION
│   │   ├── CriterionOperator.java              — NEW enum: EQ, NEQ, GT, GTE, LT, LTE, BETWEEN, IN, NOT_IN
│   │   └── EligibilityResult.java              — NEW JPA entity for eligibility_result table
│   ├── service
│   │   ├── EligibilityEvaluator.java           — NEW pure-function component (AI-H1); no Spring/IO dependencies
│   │   ├── RiskTierPolicy.java                 — NEW pure-function component; no Spring/IO dependencies
│   │   └── EligibilityPreviewService.java      — NEW; orchestrates preview: load scheme criteria + beneficiary attrs, call EligibilityEvaluator
│   └── repository
│       └── EligibilityResultRepository.java    — NEW; writes eligibility_result rows (called by application-workflow slice at submission)
│
└── entity
    ├── Beneficiary.java                        — Existing; +dateOfBirth, +annualIncome, +landHoldingAcres, +gender, +socialCategory, +isDisabled
    └── Scheme.java                             — RETAINED temporarily for backward compat during migration; replaced by scheme/domain/Scheme.java
```

**Existing classes migrated (package move):**

| Existing location | New location | Action |
|---|---|---|
| `entity/Scheme.java` | `scheme/domain/Scheme.java` | Migrate + add new fields; update all import references |
| `repository/SchemeRepository.java` | `scheme/repository/SchemeRepository.java` | Migrate + add query methods |
| `scheme/service/SchemeService.java` | `scheme/service/SchemeService.java` | Extend in-place (already in correct package) |
| `scheme/mapper/SchemeMapper.java` | `scheme/mapper/SchemeMapper.java` | Extend in-place |

---

## 2. Flyway Migration

### `V202611070004__scheme_eligibility_schema.sql`

```sql
-- V202611070004__scheme_eligibility_schema.sql
-- Implements: REQ-SCH-01..08, REQ-ELG-01..04
-- Migration 4: scheme alterations, scheme_criterion, milestone_template,
--              scheme_region_budget, beneficiary alterations, eligibility_result
-- Depends on: V1__baseline, V202611070001, V202611070007

-- ── scheme: add missing columns ───────────────────────────────────────────────
ALTER TABLE public.scheme
  ADD COLUMN IF NOT EXISTS category                       VARCHAR(30)
      CHECK (category IN ('AGRICULTURE','EDUCATION','MSME','HOUSING','HEALTH','LIVELIHOOD','OTHER')),
  ADD COLUMN IF NOT EXISTS tranche_count                  INT          NOT NULL DEFAULT 1
      CONSTRAINT chk_scheme_tranche_count CHECK (tranche_count BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS max_applications_per_beneficiary INT       NOT NULL DEFAULT 1
      CONSTRAINT chk_scheme_max_app_per_ben CHECK (max_applications_per_beneficiary >= 1),
  ADD COLUMN IF NOT EXISTS version                        BIGINT       NOT NULL DEFAULT 0;

-- Tighten existing check: min_grant_amount > 0 (was >= 0 in baseline)
-- Cannot drop + re-add named constraint in one ALTER; use separate statements.
ALTER TABLE public.scheme
  DROP CONSTRAINT IF EXISTS chk_scheme_grant_amount;

ALTER TABLE public.scheme
  ADD CONSTRAINT chk_scheme_grant_amount
      CHECK (min_grant_amount > 0 AND max_grant_amount >= min_grant_amount);

-- ── scheme_criterion ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.scheme_criterion (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scheme_id   UUID         NOT NULL REFERENCES public.scheme(id) ON DELETE CASCADE,
    attribute   VARCHAR(30)  NOT NULL
                  CHECK (attribute IN (
                    'AGE','ANNUAL_INCOME','LAND_HOLDING','GENDER',
                    'SOCIAL_CATEGORY','IS_DISABLED','BENEFICIARY_TYPE','REGION'
                  )),
    operator    VARCHAR(10)  NOT NULL
                  CHECK (operator IN ('EQ','NEQ','GT','GTE','LT','LTE','BETWEEN','IN','NOT_IN')),
    threshold   TEXT         NOT NULL,
    weight      INT          NOT NULL
                  CONSTRAINT chk_criterion_weight CHECK (weight BETWEEN 1 AND 100),
    mandatory   BOOLEAN      NOT NULL DEFAULT FALSE,
    description TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version     BIGINT       NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_scheme_criterion_scheme_id
    ON public.scheme_criterion(scheme_id, created_at);

CREATE TRIGGER trg_scheme_criterion_updated_at
  BEFORE UPDATE ON public.scheme_criterion
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheme_criterion TO gsdts_app;

-- ── milestone_template ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.milestone_template (
    id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    scheme_id          UUID          NOT NULL REFERENCES public.scheme(id) ON DELETE CASCADE,
    sequence           INT           NOT NULL,
    name               VARCHAR(200)  NOT NULL,
    description        TEXT,
    tranche_percentage NUMERIC(5,2)  NOT NULL
                         CONSTRAINT chk_milestone_pct CHECK (tranche_percentage > 0),
    due_days           INT           NOT NULL
                         CONSTRAINT chk_milestone_due_days CHECK (due_days >= 0),
    created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    version            BIGINT        NOT NULL DEFAULT 0,
    CONSTRAINT uq_milestone_scheme_sequence UNIQUE (scheme_id, sequence)
);

CREATE TRIGGER trg_milestone_template_updated_at
  BEFORE UPDATE ON public.milestone_template
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.milestone_template TO gsdts_app;

-- ── scheme_region_budget ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.scheme_region_budget (
    scheme_id   UUID          NOT NULL REFERENCES public.scheme(id)   ON DELETE RESTRICT,
    region_id   BIGINT        NOT NULL REFERENCES public.region(id)   ON DELETE RESTRICT,
    allocated   NUMERIC(14,2) NOT NULL,
    committed   NUMERIC(14,2) NOT NULL DEFAULT 0,
    disbursed   NUMERIC(14,2) NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    version     BIGINT        NOT NULL DEFAULT 0,
    PRIMARY KEY (scheme_id, region_id),
    CONSTRAINT chk_budget_committed_non_neg    CHECK (committed  >= 0),
    CONSTRAINT chk_budget_disbursed_non_neg    CHECK (disbursed  >= 0),
    CONSTRAINT chk_budget_committed_plus_disbursed
        CHECK (committed + disbursed <= allocated)
);

CREATE TRIGGER trg_scheme_region_budget_updated_at
  BEFORE UPDATE ON public.scheme_region_budget
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheme_region_budget TO gsdts_app;

-- ── beneficiary: add eligibility attribute columns ────────────────────────────
ALTER TABLE public.beneficiary
  ADD COLUMN IF NOT EXISTS date_of_birth      DATE,
  ADD COLUMN IF NOT EXISTS annual_income      NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS land_holding_acres NUMERIC(10,3),
  ADD COLUMN IF NOT EXISTS gender             VARCHAR(10)
      CHECK (gender IN ('MALE','FEMALE','OTHER','PREFER_NOT_TO_SAY')),
  ADD COLUMN IF NOT EXISTS social_category    VARCHAR(30)
      CHECK (social_category IN ('GENERAL','OBC','SC','ST','EWS','OTHER')),
  ADD COLUMN IF NOT EXISTS is_disabled        BOOLEAN;

-- ── eligibility_result ────────────────────────────────────────────────────────
-- Structurally owned by application-workflow but created here because
-- EligibilityEvaluator writes rows at submission (BR-ELG-7, AC-ELG-02.1).
CREATE TABLE IF NOT EXISTS public.eligibility_result (
    id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id    UUID         NOT NULL REFERENCES public.application(id) ON DELETE CASCADE,
    criterion_id      UUID         NOT NULL REFERENCES public.scheme_criterion(id) ON DELETE RESTRICT,
    passed            BOOLEAN      NOT NULL,
    points_awarded    INT          NOT NULL DEFAULT 0,
    beneficiary_value TEXT,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    -- No updated_at or version — append-only per BR-ELG-7
);

CREATE INDEX IF NOT EXISTS idx_eligibility_result_application
    ON public.eligibility_result(application_id);

GRANT SELECT, INSERT ON public.eligibility_result TO gsdts_app;
-- No UPDATE/DELETE — eligibility results are immutable once written.
```

---

## 3. JPA Entity Designs

### 3.1 `Scheme` — `com.govgrants.subsidygrant.scheme.domain`

Migrated from `entity/Scheme.java`. All existing fields retained; new fields appended.

```java
@Entity
@Table(name = "scheme", schema = "public")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Scheme {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "code", nullable = false, unique = true, length = 50)
    private String code;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    // NEW — AC-SCH-01.1
    @Enumerated(EnumType.STRING)
    @Column(name = "category", length = 30)
    private SchemeCategory category;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "min_grant_amount", nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal minGrantAmount = BigDecimal.ZERO;

    @Column(name = "max_grant_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal maxGrantAmount;

    // NEW — AC-SCH-01.1
    @Column(name = "tranche_count", nullable = false)
    @Builder.Default
    private int trancheCount = 1;

    // NEW — AC-SCH-01.1
    @Column(name = "max_applications_per_beneficiary", nullable = false)
    @Builder.Default
    private int maxApplicationsPerBeneficiary = 1;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private SchemeStatus status = SchemeStatus.DRAFT;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    // NEW — optimistic locking (D-11)
    @Version
    @Column(name = "version", nullable = false)
    private long version;
}
```

### 3.2 `SchemeCriterion` — `com.govgrants.subsidygrant.scheme.domain`

```java
@Entity
@Table(name = "scheme_criterion", schema = "public")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SchemeCriterion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "scheme_id", nullable = false)
    private Scheme scheme;

    @Enumerated(EnumType.STRING)
    @Column(name = "attribute", nullable = false, length = 30)
    private CriterionAttribute attribute;      // AGE, ANNUAL_INCOME, LAND_HOLDING, etc.

    @Enumerated(EnumType.STRING)
    @Column(name = "operator", nullable = false, length = 10)
    private CriterionOperator operator;        // EQ, NEQ, GT, GTE, LT, LTE, BETWEEN, IN, NOT_IN

    @Column(name = "threshold", nullable = false, columnDefinition = "TEXT")
    private String threshold;                  // single value, "min,max" for BETWEEN, csv for IN/NOT_IN

    @Column(name = "weight", nullable = false)
    private int weight;                        // 1–100; enforced by DB CHECK

    @Column(name = "mandatory", nullable = false)
    private boolean mandatory;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

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

### 3.3 `MilestoneTemplate` — `com.govgrants.subsidygrant.scheme.domain`

```java
@Entity
@Table(name = "milestone_template", schema = "public")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MilestoneTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "scheme_id", nullable = false)
    private Scheme scheme;

    @Column(name = "sequence", nullable = false)
    private int sequence;                      // 1-based; UNIQUE(scheme_id, sequence)

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "tranche_percentage", nullable = false, precision = 5, scale = 2)
    private BigDecimal tranchePercentage;      // > 0; percentages must sum to 100.00

    @Column(name = "due_days", nullable = false)
    private int dueDays;                       // >= 0

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

### 3.4 `SchemeRegionBudget` — `com.govgrants.subsidygrant.scheme.domain`

```java
@Entity
@Table(name = "scheme_region_budget", schema = "public")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SchemeRegionBudget {

    @EmbeddedId
    private SchemeRegionBudgetId id;           // composite PK: schemeId + regionId

    @Column(name = "allocated", nullable = false, precision = 14, scale = 2)
    private BigDecimal allocated;

    @Column(name = "committed", nullable = false, precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal committed = BigDecimal.ZERO;

    @Column(name = "disbursed", nullable = false, precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal disbursed = BigDecimal.ZERO;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    /** Computed convenience method — not persisted. */
    public BigDecimal getRemaining() {
        return allocated.subtract(committed).subtract(disbursed);
    }
}

@Embeddable
public class SchemeRegionBudgetId implements Serializable {
    @Column(name = "scheme_id")  private UUID   schemeId;
    @Column(name = "region_id")  private Long   regionId;
    // equals, hashCode
}
```

### 3.5 `Beneficiary` — `entity/Beneficiary.java` (altered in-place)

New fields added to the existing entity; all original fields retained.

```java
// Fields to add to the existing Beneficiary entity:

@Column(name = "date_of_birth")
private LocalDate dateOfBirth;             // used to compute AGE attribute at evaluation time (IST)

@Column(name = "annual_income", precision = 14, scale = 2)
private BigDecimal annualIncome;           // ANNUAL_INCOME attribute

@Column(name = "land_holding_acres", precision = 10, scale = 3)
private BigDecimal landHoldingAcres;       // LAND_HOLDING attribute

@Enumerated(EnumType.STRING)
@Column(name = "gender", length = 10)
private Gender gender;                     // MALE, FEMALE, OTHER, PREFER_NOT_TO_SAY

@Enumerated(EnumType.STRING)
@Column(name = "social_category", length = 30)
private SocialCategory socialCategory;    // GENERAL, OBC, SC, ST, EWS, OTHER

@Column(name = "is_disabled")
private Boolean isDisabled;               // IS_DISABLED attribute
```

New enums in `eligibility/domain/`:
- `Gender`: `MALE, FEMALE, OTHER, PREFER_NOT_TO_SAY`
- `SocialCategory`: `GENERAL, OBC, SC, ST, EWS, OTHER`

### 3.6 `EligibilityResult` — `com.govgrants.subsidygrant.eligibility.domain`

```java
@Entity
@Table(name = "eligibility_result", schema = "public")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class EligibilityResult {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "application_id", nullable = false)
    private UUID applicationId;            // FK to application; not mapped as @ManyToOne to avoid circular dep

    @Column(name = "criterion_id", nullable = false)
    private UUID criterionId;              // FK to scheme_criterion

    @Column(name = "passed", nullable = false)
    private boolean passed;

    @Column(name = "points_awarded", nullable = false)
    private int pointsAwarded;             // = weight if passed, else 0

    @Column(name = "beneficiary_value", columnDefinition = "TEXT")
    private String beneficiaryValue;       // string representation of the attribute value used

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    // No updatedAt, no version — append-only (BR-ELG-7)
}
```

---

## 4. Repository Designs

### 4.1 `SchemeRepository` — `com.govgrants.subsidygrant.scheme.repository`

Migrated from `repository/SchemeRepository.java`.

```java
public interface SchemeRepository extends JpaRepository<Scheme, UUID>,
                                           JpaSpecificationExecutor<Scheme> {

    Optional<Scheme> findByCode(String code);
    boolean existsByCode(String code);

    // For GET /schemes/eligible: open schemes with application window active
    @Query("""
        SELECT s FROM Scheme s
        WHERE s.status = 'OPEN'
          AND s.startDate <= :today
          AND s.endDate   >= :today
        """)
    List<Scheme> findAllOpenAndInWindow(@Param("today") LocalDate today);

    // JpaSpecificationExecutor provides findAll(Specification, Pageable) for
    // filtered list endpoint (status, category, openNow filters — AC-SCH-02.1)
}
```

### 4.2 `SchemeCriterionRepository` — `com.govgrants.subsidygrant.scheme.repository`

```java
public interface SchemeCriterionRepository extends JpaRepository<SchemeCriterion, UUID> {

    List<SchemeCriterion> findBySchemeIdOrderByCreatedAtAsc(UUID schemeId);  // AC-SCH-04.3
    int countBySchemeId(UUID schemeId);                                      // max 20 check
    void deleteBySchemeId(UUID schemeId);                                    // not exposed; used in DRAFT delete
}
```

### 4.3 `MilestoneTemplateRepository` — `com.govgrants.subsidygrant.scheme.repository`

```java
public interface MilestoneTemplateRepository extends JpaRepository<MilestoneTemplate, UUID> {

    List<MilestoneTemplate> findBySchemeIdOrderBySequenceAsc(UUID schemeId);
    void deleteBySchemeId(UUID schemeId);  // used by PUT (replace full list)
}
```

### 4.4 `SchemeRegionBudgetRepository` — `com.govgrants.subsidygrant.scheme.repository`

```java
public interface SchemeRegionBudgetRepository
        extends JpaRepository<SchemeRegionBudget, SchemeRegionBudgetId> {

    List<SchemeRegionBudget> findByIdSchemeId(UUID schemeId);
    Optional<SchemeRegionBudget> findByIdSchemeIdAndIdRegionId(UUID schemeId, Long regionId);
    boolean existsByIdSchemeIdAndAllocatedGreaterThan(UUID schemeId, BigDecimal amount);  // activation check
}
```

### 4.5 `EligibilityResultRepository` — `com.govgrants.subsidygrant.eligibility.repository`

```java
public interface EligibilityResultRepository extends JpaRepository<EligibilityResult, UUID> {

    List<EligibilityResult> findByApplicationId(UUID applicationId);
    // Used by application-workflow to load results for a submitted application.
}
```

---

## 5. Service Designs

### 5.1 `SchemeService` — `com.govgrants.subsidygrant.scheme.service`

Extended from the existing implementation.

```java
@Service
@Transactional
public class SchemeService {

    // --- Scheme CRUD ---

    // AC-SCH-01.1–01.3: validates code pattern, date/amount constraints, sets DRAFT
    public SchemeResponse createScheme(CreateSchemeRequest request, ActorContext actor);

    // AC-SCH-02.1: JpaSpecificationExecutor-based query; non-admin role sees OPEN/PAUSED/CLOSED only
    @Transactional(readOnly = true)
    public Page<SchemeSummaryResponse> listSchemes(SchemeFilter filter, Pageable pageable, ActorContext actor);

    @Transactional(readOnly = true)
    public SchemeResponse getById(UUID id, ActorContext actor);

    @Transactional(readOnly = true)
    public SchemeResponse getByCode(String code, ActorContext actor);

    // AC-SCH-03.1: DRAFT allows all fields; OPEN/PAUSED only allows name/description/endDate
    public SchemeResponse updateScheme(UUID id, UpdateSchemeRequest request, ActorContext actor);

    // AC-SCH-06.1–06.2: delegates to SchemeActivationGate for DRAFT→OPEN
    public SchemeResponse updateStatus(UUID id, SchemeStatus status, ActorContext actor);

    // AC-SCH-08.1: 204 if DRAFT+no applications; 409 if applications exist; 422 if not DRAFT
    public void deleteScheme(UUID id, ActorContext actor);

    // --- Criteria ---

    // AC-SCH-04.1–04.2: DRAFT only; validates attribute/operator/threshold; max 20 criteria
    public CriterionResponse addCriterion(UUID schemeId, CreateCriterionRequest request, ActorContext actor);
    public CriterionResponse updateCriterion(UUID schemeId, UUID cid, UpdateCriterionRequest request, ActorContext actor);
    public void deleteCriterion(UUID schemeId, UUID cid, ActorContext actor);

    @Transactional(readOnly = true)
    public List<CriterionResponse> listCriteria(UUID schemeId, ActorContext actor);

    // --- Milestone Templates ---

    // AC-SCH-05.1–05.2: DRAFT only; replaces full list atomically; validates count=trancheCount and sum=100
    public List<MilestoneTemplateResponse> setMilestoneTemplates(UUID schemeId,
            SetMilestoneTemplatesRequest request, ActorContext actor);

    @Transactional(readOnly = true)
    public List<MilestoneTemplateResponse> getMilestoneTemplates(UUID schemeId, ActorContext actor);
}
```

**Criterion threshold validation** (delegated to `CriterionThresholdValidator`):

| Attribute type | Valid operators | Threshold format |
|---|---|---|
| INT (AGE) | EQ, NEQ, GT, GTE, LT, LTE, BETWEEN | single integer or "min,max" for BETWEEN |
| MONEY (ANNUAL_INCOME) | GT, GTE, LT, LTE, BETWEEN | decimal or "min,max" |
| DECIMAL (LAND_HOLDING) | GT, GTE, LT, LTE, BETWEEN | decimal or "min,max" |
| ENUM (GENDER, SOCIAL_CATEGORY, BENEFICIARY_TYPE) | EQ, NEQ, IN, NOT_IN | single enum value or csv |
| BOOL (IS_DISABLED) | EQ | "true" or "false" |
| REGION_CODE | IN, NOT_IN | csv of region codes |

Invalid combinations throw `BusinessRuleException("INVALID_CRITERION", ...)` → 400.

### 5.2 `SchemeActivationGate` — `com.govgrants.subsidygrant.scheme.service`

```java
@Component
public class SchemeActivationGate {

    // Returns list of failure reasons; empty list means all gates pass.
    // AC-SCH-06.2: ≥1 criterion, valid milestone templates, ≥1 budget with allocated>0, endDate≥today
    public List<String> check(Scheme scheme,
                               List<SchemeCriterion> criteria,
                               List<MilestoneTemplate> templates,
                               boolean hasBudget,
                               LocalDate today);
}
```

Failure reasons (populated individually so the 422 `SCHEME_NOT_READY` response can list all failures):
- `"NO_CRITERIA"` — no criteria defined
- `"INVALID_MILESTONE_TEMPLATES"` — template count ≠ trancheCount or percentages don't sum to 100
- `"NO_ACTIVE_BUDGET"` — no budget row with allocated > 0
- `"END_DATE_PAST"` — endDate < today

### 5.3 `SchemeRegionBudgetService` — `com.govgrants.subsidygrant.scheme.service`

```java
@Service
@Transactional
public class SchemeRegionBudgetService {

    // AC-SCH-07.1: creates or updates a budget row for a DISTRICT region.
    // Validates regionId is DISTRICT via RegionQueryService.
    // Validates new allocated >= committed + disbursed, else 422 BUDGET_BELOW_COMMITTED.
    // Writes audit log on every change.
    public BudgetResponse setBudget(UUID schemeId, Long regionId,
                                    SetBudgetRequest request, ActorContext actor);

    // AC-SCH-07.2: returns all budget rows for a scheme with computed remaining.
    @Transactional(readOnly = true)
    public List<BudgetResponse> getBudgets(UUID schemeId, ActorContext actor);

    // Cross-slice read (requirements §10): null when no row exists.
    @Transactional(readOnly = true)
    public SchemeRegionBudget getBudget(UUID schemeId, Long regionId);
}
```

### 5.4 `SchemeQueryService` — `com.govgrants.subsidygrant.scheme.service`

```java
@Service
@Transactional(readOnly = true)
public class SchemeQueryService {

    // 404 if not found or not OPEN
    public Scheme getOpenScheme(UUID schemeId, ActorContext actor);

    public Page<Scheme> listOpenSchemes(SchemeFilter filter, Pageable pageable, ActorContext actor);

    // Returns criteria ordered by created_at ASC (AC-SCH-04.3)
    public List<SchemeCriterion> getCriteria(UUID schemeId);

    public List<MilestoneTemplate> getMilestoneTemplates(UUID schemeId);
}
```

### 5.5 `EligibilityEvaluator` — `com.govgrants.subsidygrant.eligibility.service`

Pure function component. No Spring-managed I/O. No repository calls.

```java
@Component
public class EligibilityEvaluator {

    /**
     * BR-ELG-1 to BR-ELG-8.
     * Evaluates each criterion against the provided attributes snapshot.
     * A null attribute value fails any criterion (BR-ELG-4).
     * Any failing mandatory criterion sets autoRejected=true (BR-ELG-5).
     * Score = round_half_up(100 * sumPassedWeights / sumAllWeights) (BR-ELG-6).
     */
    public EligibilityOutcome evaluate(List<CriterionSpec> criteria,
                                       BeneficiaryAttributes attributes);

    // Internal: evaluates a single criterion. Package-private for unit testing.
    boolean evaluateSingleCriterion(CriterionSpec criterion, BeneficiaryAttributes attributes);
}
```

**`BeneficiaryAttributes`** carries pre-computed `age` (whole years, calculated by the caller using `dateOfBirth` and submission date in IST). The evaluator never touches dates directly.

**Score formula** (BR-ELG-6):
```
score = round_half_up(100 * Σweight(passed) / Σweight(all))
```
Implemented with `BigDecimal` arithmetic, `RoundingMode.HALF_UP`.

**Operator evaluation per type** (BR-ELG-2 / BR-ELG-3):

| Operator | Numeric (INT/MONEY/DECIMAL) | Enum | Bool | Region |
|---|---|---|---|---|
| EQ | value == threshold | value == threshold | value == ("true"/"false") | — |
| NEQ | value != threshold | value != threshold | — | — |
| GT | value > threshold | — | — | — |
| GTE | value >= threshold | — | — | — |
| LT | value < threshold | — | — | — |
| LTE | value <= threshold | — | — | — |
| BETWEEN | threshold min ≤ value ≤ max (inclusive) | — | — | — |
| IN | — | value in csv list | — | region code matches any in list (or any ancestor) |
| NOT_IN | — | value not in csv list | — | region code not in list |

### 5.6 `RiskTierPolicy` — `com.govgrants.subsidygrant.eligibility.service`

Pure function component.

```java
@Component
public class RiskTierPolicy {

    /**
     * BR-RISK-1, BR-RISK-2.
     * Evaluates in priority order (first match wins):
     *   HIGH  if score < settings.mediumMinScore (50)
     *         OR amount > settings.mediumMaxAmount (200,000)
     *         OR latestFinding == MAJOR_MISMATCH
     *   MEDIUM if score < settings.lowMinScore (75)
     *          OR amount > settings.lowMaxAmount (50,000)
     *   LOW   otherwise
     */
    public RiskTier evaluate(int score,
                             BigDecimal amount,
                             FieldFinding latestFinding,
                             SettingsSnapshot settings);
}
```

**`SettingsSnapshot`** is populated by the caller from `SettingsCacheService` before invoking `RiskTierPolicy`, keeping the policy pure:

```java
public record SettingsSnapshot(
    int     lowMinScore,       // risk.low.minScore    = 75
    BigDecimal lowMaxAmount,   // risk.low.maxAmount   = 50000.00
    int     mediumMinScore,    // risk.medium.minScore = 50
    BigDecimal mediumMaxAmount // risk.medium.maxAmount = 200000.00
) {}
```

### 5.7 `EligibilityPreviewService` — `com.govgrants.subsidygrant.eligibility.service`

```java
@Service
@Transactional(readOnly = true)
public class EligibilityPreviewService {

    private final SchemeQueryService schemeQueryService;
    private final BeneficiaryQueryService beneficiaryQueryService; // from beneficiary-documents

    /**
     * AC-ELG-03.1–03.2.
     * Loads criteria and beneficiary profile; calls EligibilityEvaluator.
     * Returns eligible flag and per-criterion met/not-met results.
     * Does NOT return score, weights, or risk tier (INV-01).
     * Does NOT persist anything.
     */
    public EligibilityPreviewResult preview(UUID schemeId, ActorContext actor);
}
```

---

## 6. Controller Designs

### 6.1 `SchemeController` — extended

Extended from the existing controller. All endpoints require `ADMIN` role unless noted.

| Method | Path | Role | Response | Notes |
|---|---|---|---|---|
| POST | `/api/v1/schemes` | ADMIN | 201 `SchemeResponse` | Creates DRAFT |
| GET | `/api/v1/schemes` | Any authenticated | 200 `PagedResponse<SchemeSummaryResponse>` | Filters: status, category, openNow; non-admin sees OPEN/PAUSED/CLOSED |
| GET | `/api/v1/schemes/{id}` | Any authenticated | 200 `SchemeResponse` | Includes criteria + templates |
| GET | `/api/v1/schemes/code/{code}` | Any authenticated | 200 `SchemeResponse` | — |
| PUT | `/api/v1/schemes/{id}` | ADMIN | 200 `SchemeResponse` | DRAFT: all fields; OPEN/PAUSED: name/description/endDate only |
| PATCH | `/api/v1/schemes/{id}/status` | ADMIN | 200 `SchemeResponse` | State machine; 422 SCHEME_NOT_READY on DRAFT→OPEN with failures |
| DELETE | `/api/v1/schemes/{id}` | ADMIN | 204 | — |

### 6.2 `CriterionController`

| Method | Path | Role | Response | Notes |
|---|---|---|---|---|
| GET | `/api/v1/schemes/{id}/criteria` | Any authenticated | 200 `List<CriterionResponse>` | Ordered by created_at ASC |
| POST | `/api/v1/schemes/{id}/criteria` | ADMIN | 201 `CriterionResponse` | DRAFT only; max 20 |
| PUT | `/api/v1/schemes/{id}/criteria/{cid}` | ADMIN | 200 `CriterionResponse` | DRAFT only |
| DELETE | `/api/v1/schemes/{id}/criteria/{cid}` | ADMIN | 204 | DRAFT only |

### 6.3 `MilestoneTemplateController`

| Method | Path | Role | Response | Notes |
|---|---|---|---|---|
| GET | `/api/v1/schemes/{id}/milestone-templates` | Any authenticated | 200 `List<MilestoneTemplateResponse>` | — |
| PUT | `/api/v1/schemes/{id}/milestone-templates` | ADMIN | 200 `List<MilestoneTemplateResponse>` | Replaces full list; DRAFT only; validates sum=100 and count=trancheCount |

### 6.4 `BudgetController`

| Method | Path | Role | Response | Notes |
|---|---|---|---|---|
| GET | `/api/v1/schemes/{id}/budgets` | ADMIN, FA (Finance Approver) | 200 `List<BudgetResponse>` | — |
| PUT | `/api/v1/schemes/{id}/budgets/{regionId}` | ADMIN | 200 `BudgetResponse` | DISTRICT validation; BUDGET_BELOW_COMMITTED check |

### 6.5 `EligibilityController`

| Method | Path | Role | Response | Notes |
|---|---|---|---|---|
| POST | `/api/v1/schemes/{id}/eligibility-check` | BENEFICIARY | 200 `EligibilityCheckResponse` | No persistence; 403 for non-BENEFICIARY |
| GET | `/api/v1/schemes/eligible` | BENEFICIARY | 200 `PagedResponse<EligibleSchemeResponse>` | OPEN + in-window + mandatory criteria pass |

---

## 7. API Request/Response DTOs

### 7.1 `CreateSchemeRequest`

```java
// Extended from existing; adds category, trancheCount, maxApplicationsPerBeneficiary
public class CreateSchemeRequest {
    @NotBlank @Size(min = 3, max = 200)
    String name;

    @NotBlank @Pattern(regexp = "^[A-Z0-9_-]{3,30}$", message = "Code must be 3–30 uppercase alphanumeric/dash/underscore")
    String code;

    String description;

    @NotNull SchemeCategory category;  // NEW — AGRICULTURE, EDUCATION, MSME, HOUSING, HEALTH, LIVELIHOOD, OTHER

    @NotNull LocalDate startDate;

    @NotNull LocalDate endDate;

    @NotNull @DecimalMin("0.01") BigDecimal minGrantAmount;

    @NotNull @DecimalMin("0.01") BigDecimal maxGrantAmount;

    @NotNull @Min(1) @Max(10) Integer trancheCount;  // NEW — default applied by service

    @Min(1) Integer maxApplicationsPerBeneficiary;   // NEW — optional; default 1
    // status is always ignored (AC-SCH-01.3)
}
```

### 7.2 `UpdateSchemeRequest`

```java
public class UpdateSchemeRequest {
    @NotBlank @Size(min = 3, max = 200) String name;        // allowed in OPEN/PAUSED
    String description;                                      // allowed in OPEN/PAUSED
    @NotNull LocalDate startDate;                            // DRAFT only
    @NotNull LocalDate endDate;                              // allowed in OPEN/PAUSED (≥ today)
    @NotNull @DecimalMin("0.01") BigDecimal minGrantAmount;  // DRAFT only
    @NotNull @DecimalMin("0.01") BigDecimal maxGrantAmount;  // DRAFT only
    SchemeCategory category;                                 // DRAFT only
    @Min(1) @Max(10) Integer trancheCount;                   // DRAFT only
    @Min(1) Integer maxApplicationsPerBeneficiary;           // DRAFT only
}
```

### 7.3 `SchemeResponse`

```java
public class SchemeResponse {
    UUID id;
    String name;
    String code;
    String description;
    SchemeCategory category;        // NEW
    LocalDate startDate;
    LocalDate endDate;
    BigDecimal minGrantAmount;
    BigDecimal maxGrantAmount;
    int trancheCount;               // NEW
    int maxApplicationsPerBeneficiary;  // NEW
    SchemeStatus status;
    List<CriterionResponse> criteria;         // AC-SCH-02.2 — full criteria list
    List<MilestoneTemplateResponse> milestoneTemplates;  // AC-SCH-02.2
    Instant createdAt;
    Instant updatedAt;
}
```

### 7.4 `SchemeSummaryResponse`

```java
public class SchemeSummaryResponse {
    UUID id;
    String name;
    String code;
    SchemeCategory category;  // NEW
    SchemeStatus status;
    LocalDate startDate;
    LocalDate endDate;
    BigDecimal minGrantAmount;
    BigDecimal maxGrantAmount;
}
```

### 7.5 `CreateCriterionRequest` / `UpdateCriterionRequest`

```java
// Both have the same fields
public class CreateCriterionRequest {
    @NotNull CriterionAttribute attribute;    // AGE, ANNUAL_INCOME, LAND_HOLDING, GENDER, ...
    @NotNull CriterionOperator operator;      // EQ, NEQ, GT, GTE, LT, LTE, BETWEEN, IN, NOT_IN
    @NotBlank String threshold;              // validated per BR-ELG-3 in service
    @NotNull @Min(1) @Max(100) Integer weight;
    @NotNull Boolean mandatory;
    String description;
}
```

### 7.6 `CriterionResponse`

```java
public class CriterionResponse {
    UUID id;
    CriterionAttribute attribute;
    CriterionOperator operator;
    String threshold;
    int weight;
    boolean mandatory;
    String description;
    Instant createdAt;
}
```

### 7.7 `SetMilestoneTemplatesRequest`

```java
public class SetMilestoneTemplatesRequest {
    @NotNull @Size(min = 1) List<MilestoneTemplateItem> templates;
    // Count must equal scheme.trancheCount; percentages must sum to 100.00 (validated in service)
}

public class MilestoneTemplateItem {
    @NotBlank @Size(max = 200) String name;
    String description;
    @NotNull @DecimalMin("0.01") BigDecimal tranchePercentage;  // NUMERIC(5,2)
    @NotNull @Min(0) Integer dueDays;
}
```

### 7.8 `MilestoneTemplateResponse`

```java
public class MilestoneTemplateResponse {
    UUID id;
    int sequence;
    String name;
    String description;
    BigDecimal tranchePercentage;
    int dueDays;
}
```

### 7.9 `SetBudgetRequest` / `BudgetResponse`

```java
public class SetBudgetRequest {
    @NotNull @DecimalMin("0.01") BigDecimal allocated;
}

public class BudgetResponse {
    Long regionId;
    String regionCode;    // convenience field from region lookup
    BigDecimal allocated;
    BigDecimal committed;
    BigDecimal disbursed;
    BigDecimal remaining; // = allocated - committed - disbursed
}
```

### 7.10 `EligibilityCheckResponse`

```java
public class EligibilityCheckResponse {
    boolean eligible;                        // true if no mandatory criterion failed and all mandatory criteria pass
    List<EligibilityCriterionResult> criteria;
    // Note: NO score, NO weights, NO risk tier (INV-01, AC-ELG-03.2)
}

public class EligibilityCriterionResult {
    String description;
    boolean mandatory;
    boolean met;
}
```

### 7.11 `EligibleSchemeResponse`

```java
public class EligibleSchemeResponse {
    UUID id;
    String name;
    String code;
    SchemeCategory category;
    LocalDate startDate;
    LocalDate endDate;
    BigDecimal minGrantAmount;
    BigDecimal maxGrantAmount;
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Null attribute value always fails any criterion

*For any* `CriterionSpec` with any attribute, operator, and threshold, calling `EligibilityEvaluator.evaluate()` with a `BeneficiaryAttributes` where the corresponding attribute value is `null` must result in that criterion being marked as `passed = false`.

**Validates: Requirements AC-ELG-01.2, BR-ELG-4**

---

### Property 2: BETWEEN operator is inclusive at both boundaries

*For any* criterion using the `BETWEEN` operator and threshold `"min,max"`, evaluating with a beneficiary value equal to `min` or equal to `max` must result in `passed = true`. Evaluating with any value strictly below `min` or strictly above `max` must result in `passed = false`.

**Validates: Requirements AC-ELG-01.1, BR-ELG-2**

---

### Property 3: Score formula correctness

*For any* non-empty list of `CriterionSpec` objects with positive weights and any `BeneficiaryAttributes`, the `score` in the returned `EligibilityOutcome` must equal `round_half_up(100 × Σweight(passed) / Σweight(all))` where the sums include all criteria including mandatory ones.

**Validates: Requirements AC-ELG-01.1, BR-ELG-6**

---

### Property 4: Mandatory failure triggers auto-rejection

*For any* list of criteria where at least one mandatory criterion fails (the beneficiary attribute does not satisfy the criterion's operator/threshold), `EligibilityEvaluator.evaluate()` must return an `EligibilityOutcome` with `autoRejected = true` and the `failedMandatoryDescriptions` list must be non-empty and contain each failing mandatory criterion's description.

**Validates: Requirements AC-ELG-02.2, BR-ELG-5**

---

### Property 5: Risk tier boundary correctness

*For any* `(score, amount, FieldFinding, SettingsSnapshot)` input, `RiskTierPolicy.evaluate()` must return:
- `HIGH` when `score < mediumMinScore` (50), or `amount > mediumMaxAmount` (200,000), or `latestFinding == MAJOR_MISMATCH` (first-match priority)
- `MEDIUM` when not HIGH and (`score < lowMinScore` (75) or `amount > lowMaxAmount` (50,000))
- `LOW` when not HIGH and not MEDIUM

**Validates: Requirements REQ-ELG-04, AC-ELG-04.1, BR-RISK-1**

---

### Property 6: Risk tier is monotonically non-decreasing

*For any* sequence of `(score, amount, FieldFinding)` inputs applied sequentially to `RiskTierPolicy.evaluate()`, if the tier at step `n` is `HIGH`, then all subsequent steps must also return `HIGH`. More generally, the tier ordinal (`LOW=0, MEDIUM=1, HIGH=2`) must be non-decreasing across the sequence.

**Validates: Requirements BR-RISK-2**

---

### Property 7: Non-admin actors never see DRAFT schemes

*For any* call to `SchemeService.listSchemes()` with an `ActorContext` whose role is not `ADMIN`, the returned page must contain no scheme with `status == DRAFT`.

**Validates: Requirements AC-SCH-02.1**

---

### Property 8: Budget remaining equals allocated minus committed minus disbursed

*For any* `BudgetResponse` returned by `SchemeRegionBudgetService.getBudgets()`, the `remaining` field must equal `allocated.subtract(committed).subtract(disbursed)` with scale 2.

**Validates: Requirements AC-SCH-07.2**

---

## Error Handling

### Error codes used by this slice

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_FAILED` | Bean validation failure on any request DTO |
| 400 | `INVALID_CRITERION` | Attribute/operator/threshold combination violates BR-ELG-2/3 |
| 400 | `INVALID_MILESTONE_TEMPLATE` | Template count ≠ trancheCount or percentages don't sum to 100.00 |
| 403 | `ACCESS_DENIED` | Non-BENEFICIARY calling eligibility-check; non-ADMIN mutating schemes |
| 404 | `RESOURCE_NOT_FOUND` | Scheme, criterion, budget row, or region not found |
| 409 | `DUPLICATE_RESOURCE` | Duplicate scheme code on create |
| 409 | `INVALID_STATUS_TRANSITION` | Invalid state machine transition (e.g. CLOSED → OPEN) |
| 409 | `RESOURCE_IN_USE` | DELETE on scheme with applications |
| 409 | `CONCURRENT_MODIFICATION` | Optimistic lock version conflict on scheme or criterion update |
| 422 | `SCHEME_LOCKED` | Mutation attempted on OPEN/PAUSED scheme for locked fields |
| 422 | `SCHEME_NOT_READY` | DRAFT→OPEN activation gate fails; response includes list of failure reasons |
| 422 | `BUDGET_BELOW_COMMITTED` | New allocated < committed + disbursed |
| 422 | `AMOUNT_OUT_OF_RANGE` | requested_amount ∉ [scheme.min, scheme.max] (called from application-workflow) |

### State machine transition table

| From | To | Allowed | Gate |
|---|---|---|---|
| DRAFT | OPEN | Yes | SchemeActivationGate must pass |
| OPEN | PAUSED | Yes | None |
| PAUSED | OPEN | Yes | None |
| OPEN | CLOSED | Yes | None |
| PAUSED | CLOSED | Yes | None |
| CLOSED | any | No | 409 INVALID_STATUS_TRANSITION |
| DRAFT | PAUSED | No | 409 INVALID_STATUS_TRANSITION |
| DRAFT | CLOSED | No | 409 INVALID_STATUS_TRANSITION |

### Scheme update lock rules (AC-SCH-03.1)

| Field | DRAFT | OPEN | PAUSED |
|---|---|---|---|
| name | editable | editable | editable |
| description | editable | editable | editable |
| endDate | editable | editable (≥ today) | editable (≥ today) |
| startDate | editable | 422 SCHEME_LOCKED | 422 SCHEME_LOCKED |
| minGrantAmount | editable | 422 SCHEME_LOCKED | 422 SCHEME_LOCKED |
| maxGrantAmount | editable | 422 SCHEME_LOCKED | 422 SCHEME_LOCKED |
| category | editable | 422 SCHEME_LOCKED | 422 SCHEME_LOCKED |
| trancheCount | editable | 422 SCHEME_LOCKED | 422 SCHEME_LOCKED |
| maxApplicationsPerBeneficiary | editable | 422 SCHEME_LOCKED | 422 SCHEME_LOCKED |

---

## Testing Strategy

This slice uses property-based testing (jqwik) for the pure-function evaluators and risk tier policy, complemented by Mockito unit tests for service business logic, `@WebMvcTest` MockMvc tests for HTTP layer behavior, and Testcontainers integration tests for DB constraints.

### Unit Tests (Mockito + jqwik)

#### `EligibilityEvaluatorTest` — `com.govgrants.subsidygrant.eligibility.service`

Property-based tests using jqwik. Each property test runs minimum 100 iterations.

```java
// Tag: scheme-eligibility / prop-1 (null attribute always fails criterion)
@Property
void nullAttributeValueAlwaysFailsCriterion(@ForAll CriterionSpec criterion,
                                             @ForAll AttributeName nulledAttribute) {
    // Build BeneficiaryAttributes with the given attribute set to null
    // evaluate() → that criterion's passed must be false
}

// Tag: scheme-eligibility / prop-2 (BETWEEN inclusive at both boundaries)
@Property
void betweenOperatorIsInclusive(@ForAll @Positive int min, @ForAll @Positive int range) {
    // threshold = "min,max" where max = min + range
    // value = min → passed; value = max → passed
    // value = min-1 → failed; value = max+1 → failed
}

// Tag: scheme-eligibility / prop-3 (score formula correctness)
@Property
void scoreFormulaMustMatchRoundHalfUp(@ForAll("nonEmptyCriteria") List<CriterionSpec> criteria,
                                       @ForAll BeneficiaryAttributes attributes) {
    // Compute expected score using reference formula
    // compare to EligibilityOutcome.score
}

// Tag: scheme-eligibility / prop-4 (mandatory failure triggers auto-rejection)
@Property
void mandatoryFailureCausesAutoRejection(
        @ForAll("criteriaWithAtLeastOneMandatoryFailing") List<CriterionSpec> criteria,
        @ForAll BeneficiaryAttributes attributes) {
    // EligibilityOutcome.autoRejected must be true
    // EligibilityOutcome.failedMandatoryDescriptions must be non-empty
}

// Example-based: EQ operator — integer
void eq_int_matchesExact()
void eq_int_rejectsNonMatch()
// EQ operator — enum
void eq_enum_matchesExact()
// NEQ, GT, GTE, LT, LTE — numeric boundaries
void gt_numeric_passesValueAboveThreshold()
void gt_numeric_failsValueEqualToThreshold()   // GT is strictly greater than
void gte_numeric_passesValueEqualToThreshold() // GTE includes boundary
// IN / NOT_IN — enum csv
void in_enum_passesWhenValueInList()
void notIn_enum_failsWhenValueInList()
// REGION IN: matches region or any ancestor
void in_region_matchesExactCode()
void in_region_matchesAncestorCode()
```

#### `RiskTierPolicyTest` — `com.govgrants.subsidygrant.eligibility.service`

Property-based tests using jqwik.

```
// Tag: scheme-eligibility / prop-5 (risk tier boundary correctness)
@Property
void tierClassificationMatchesRuleDefinition(@ForAll int score,
                                              @ForAll BigDecimal amount,
                                              @ForAll FieldFinding finding) {
    // Derive expected tier from rule definition
    // Compare to RiskTierPolicy.evaluate(score, amount, finding, defaultSettings)
}

// Tag: scheme-eligibility / prop-6 (risk tier is monotonically non-decreasing)
@Property
void tierNeverDecreases(@ForAll("evaluationSequences") List<EvaluationInput> sequence) {
    // Apply evaluate() in sequence; track tier ordinal; must be non-decreasing
}

// Explicit boundary examples (AC-ELG-04.1):
void score49_isHigh()     // < mediumMinScore(50)
void score50_isMediumOrLow()
void score74_isMedium()   // < lowMinScore(75)
void score75_isLow()      // exactly at lowMinScore
void amount50000_isLow()
void amount50000_01_isMedium()
void amount200000_isMedium()
void amount200000_01_isHigh()
void majorMismatch_isHigh_regardlessOfScore()
```

#### `SchemeActivationGateTest`

```
// Each gate condition in isolation (AC-SCH-06.2):
noCriteria_returnsNoCriteriaFailure()
templateCountMismatch_returnsInvalidTemplateFailure()
templatePercentagesNotSumTo100_returnsInvalidTemplateFailure()
noBudget_returnsNoBudgetFailure()
endDateInPast_returnsEndDateFailure()
allConditionsMet_returnsEmptyList()
multipleFailures_returnsAllFailures()  // all gates checked even when one fails
```

#### `SchemeServiceTest`

```
createScheme_throwsDuplicateCode()
createScheme_throwsWhenStartDateAfterEndDate()
createScheme_throwsWhenMaxAmountLessThanMin()
updateScheme_throwsSchemeLockedWhenOpenAndModifyingLockedField()
updateScheme_allowsNameChangeWhenOpen()
updateScheme_throwsSchemeLockedWhenPausedAndModifyingLockedField()
updateStatus_throwsInvalidTransitionFromClosed()
updateStatus_throwsInvalidTransitionFromDraftToPaused()
addCriterion_throwsSchemeLockedWhenNotDraft()
addCriterion_throwsWhenMoreThan20Criteria()
deleteScheme_throwsResourceInUseWhenApplicationsExist()
deleteScheme_throwsSchemeLockedWhenNotDraft()
```

#### `CriterionThresholdValidatorTest`

```
betweenThreshold_requiresTwoValues()
betweenThreshold_requiresMinLessThanMax()
inThreshold_requiresNonEmptyCsvList()
boolThreshold_requiresTrueOrFalse()
enumThreshold_rejectsInvalidEnumValue()
incompatibleOperatorForType_throwsInvalidCriterion()   // e.g. GT on GENDER
```

### Controller Tests (`@WebMvcTest` + MockMvc)

#### `SchemeControllerTest`

```
POST /schemes — 201 with valid body
POST /schemes — 400 when code pattern invalid
POST /schemes — 400 when endDate before startDate
POST /schemes — 409 on duplicate code
GET /schemes — 200 paginated; non-admin does not see DRAFT schemes
GET /schemes/{id} — 200 includes criteria and milestone templates
GET /schemes/{id} — 404 for unknown id
PUT /schemes/{id} — 422 SCHEME_LOCKED when modifying locked field on OPEN scheme
PATCH /schemes/{id}/status — 409 INVALID_STATUS_TRANSITION from CLOSED
PATCH /schemes/{id}/status — 422 SCHEME_NOT_READY on DRAFT→OPEN with missing criteria
DELETE /schemes/{id} — 204 for DRAFT with no applications
DELETE /schemes/{id} — 409 RESOURCE_IN_USE when applications exist
DELETE /schemes/{id} — 422 SCHEME_LOCKED when not DRAFT
```

#### `CriterionControllerTest`

```
POST /schemes/{id}/criteria — 422 SCHEME_LOCKED when scheme not DRAFT
POST /schemes/{id}/criteria — 400 INVALID_CRITERION for invalid operator/type combo
GET /schemes/{id}/criteria — 200 ordered by creation time
```

#### `BudgetControllerTest`

```
PUT /schemes/{id}/budgets/{regionId} — 400 when regionId is not a DISTRICT
PUT /schemes/{id}/budgets/{regionId} — 422 BUDGET_BELOW_COMMITTED when allocated < committed+disbursed
GET /schemes/{id}/budgets — 403 for BENEFICIARY role
```

#### `EligibilityControllerTest`

```
POST /schemes/{id}/eligibility-check — 200 with correct response shape (no score/weight/tier)
POST /schemes/{id}/eligibility-check — 403 when caller is not BENEFICIARY
GET /schemes/eligible — 200 paginated, only OPEN in-window schemes
```

### Integration Tests (Testcontainers + Flyway)

#### `SchemeMigrationIT`

```
// DB constraints from migration 4:
schemeTrancheCount_mustBeBetween1And10()         // DB CHECK violation
schemeMinGrantAmount_mustBeGreaterThanZero()      // DB CHECK violation
criterionWeight_mustBeBetween1And100()            // DB CHECK violation
milestoneTemplate_sequenceMustBeUniquePerScheme() // UNIQUE constraint
budget_committedPlusDisbursed_mustNotExceedAllocated()  // DB CHECK violation
budget_regionIdMustExist()                        // FK constraint
```

#### `EligibilityEvaluatorIntegrationIT`

```
// Known criterion set with pre-computed expected score (BR-ELG-6):
submitApplication_withKnownCriteria_setsCorrectScore()
submitApplication_withFailingMandatoryCriterion_setsAutoRejected()
// Verifies one eligibility_result row is persisted per criterion (BR-ELG-7)
submitApplication_persistsOneResultRowPerCriterion()
```

#### `BudgetAuditIT`

```
// AC-SCH-07.3: every budget change is audited
setBudget_writesAuditLogEntry()
updateBudget_writesAuditLogEntry()
```
