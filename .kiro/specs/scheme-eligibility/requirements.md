# Requirements Document

# scheme-eligibility — Module Requirements
> Slice of docs/requirements.md v2.0 (Baselined). The master wins on any conflict.
> Change only via CR on the master (§0.3), then re-sync this file.

---

## Introduction

This document covers the Scheme Management and Eligibility Evaluation module of the Government Subsidy & Grant Disbursement Tracking System (GSDTS). It specifies requirements for creating and managing subsidy schemes (including criteria, milestone templates and regional budgets) and for the eligibility scoring engine that evaluates beneficiary applications against those schemes.

This is a slice of the master requirements (`docs/requirements.md` v2.0). It implements **REQ-SCH-01 through REQ-SCH-08** and **REQ-ELG-01 through REQ-ELG-04**. All conflicts are resolved in favour of the master document.

---

## Glossary

Terms below are used throughout this module. For the full glossary see `docs/requirements.md` §2.

| Term | Meaning |
|---|---|
| Scheme | A subsidy/grant programme with criteria, amount range, application window, milestone templates and regional budgets |
| Criterion | One weighted eligibility rule of a scheme (attribute, operator, threshold, weight, mandatory flag) |
| Eligibility score | Integer 0–100 computed per BR-ELG-6: `round_half_up(100 × Σ weight(passed) / Σ weight(all))` |
| Risk tier | LOW, MEDIUM or HIGH — derived from score and requested amount per §7.2; decides the downstream review path |
| Milestone template | An ordered disbursement step template (name, tranche percentage, due days) defined on a scheme before activation |
| Regional budget | Allocated, committed and disbursed amounts for a (scheme, region) pair |
| Remaining budget | `allocated − committed − disbursed` for a (scheme, region) pair |
| EligibilityEvaluator | Pure-function component with no I/O that scores criteria against beneficiary attributes (AI-H1) |
| Preview | A non-persisting eligibility check available to a beneficiary before submission |
| DRAFT / OPEN / PAUSED / CLOSED | Scheme status lifecycle states (see §5.1) |

---

## 1. Scope

- **Implements:** REQ-SCH-01, REQ-SCH-02, REQ-SCH-03, REQ-SCH-04, REQ-SCH-05, REQ-SCH-06, REQ-SCH-07, REQ-SCH-08, REQ-ELG-01, REQ-ELG-02, REQ-ELG-03, REQ-ELG-04
- **Depends on specs:** `foundation` (auth/JWT, users, regions, settings, audit writing)
- **Out of scope for this slice:**
  - Application submission and workflow (REQ-APP-*, REQ-VER-*) — owned by `application-workflow`
  - Beneficiary registration and documents (REQ-BEN-*, REQ-DOC-*) — owned by `beneficiary-documents`
  - Disbursement and compliance (REQ-DSB-*, REQ-CMP-*) — owned by `disbursement-compliance`
  - External integrations (REQ-INT-*) — owned by `integration`
  - Analytics (REQ-ANL-*) — owned by `analytics`
  - This slice owns `scheme`, `scheme_criterion`, `milestone_template` and `scheme_region_budget` tables. It exposes budget read/write operations; it does NOT perform budget locking or commitment — that belongs to `application-workflow`.

---

## 2. Shared references (not copied — read from master)

- Glossary §2, Roles & permissions §4.2, Response/error contract §11, NFRs §10,
  Steering `.kiro/steering/project-rules.md`

---

## 3. Relevant decisions

From `docs/requirements.md` §3 Decision Log:

| ID | Conflict | Decision | Reason |
|---|---|---|---|
| D-11 | Old doc: scheme status DRAFT/OPEN/PAUSED/CLOSED. SRS: active flag + window | **Keep status enum AND window**. Applications are accepted only when OPEN and today ∈ window | Richer control |
| D-08 | Error codes: old doc 400 for rule violations; SRS 422 | **SRS model**: 400 malformed/bean validation, 401, 403, 404, 409 duplicate/invalid transition/concurrency, 422 business rule, 429 lockout, 500 | Matches SRS §3.1.4 |
| D-09 | Pagination default: old 10; SRS 20, max 100 | **Default 20, max 100** | NFR-03 |

---

## 4. Data model (tables owned by this slice)

From `docs/requirements.md` §5.1. `[E]` = exists in DB-001 and is altered. `[N]` = new. Every table has `created_at timestamptz NOT NULL DEFAULT now()`. Mutable tables also have `updated_at` and `version BIGINT NOT NULL DEFAULT 0`. Money is `NUMERIC(14,2)`.

| # | Table | Key columns (beyond id/timestamps/version) | Constraints |
|---|---|---|---|
| 9 | scheme [E] | code, name, description, category, start_date, end_date (= application window), min_grant_amount, max_grant_amount, tranche_count, max_applications_per_beneficiary, status | code UNIQUE; CHECK min>0, max≥min, end≥start, tranche_count 1–10 |
| 10 | scheme_criterion [N] | scheme_id, attribute, operator, threshold, weight, mandatory, description | weight 1–100 |
| 11 | milestone_template [N] | scheme_id, sequence, name, description, tranche_percentage NUMERIC(5,2), due_days | UNIQUE(scheme_id, sequence); pct > 0; due_days ≥ 0 |
| 12 | scheme_region_budget [N] | scheme_id, region_id, allocated, committed, disbursed | UNIQUE(scheme_id, region_id); CHECK committed≥0, disbursed≥0, committed+disbursed ≤ allocated |

**Related table used (not owned) — read from `beneficiary-documents` slice:**
- Table #7 `beneficiary` — read during eligibility check/preview to obtain beneficiary attributes.
- Table #15 `eligibility_result` — written by this slice's scoring logic, but structurally owned by `application-workflow` (lives alongside `application`).

**Migration order** (from §5.3): Migration 4 — scheme alterations, scheme_criterion, milestone_template, scheme_region_budget.

**Default system settings used** (from §5.4):

| key | default | type |
|---|---|---|
| risk.low.minScore | 75 | INT |
| risk.low.maxAmount | 50000.00 | MONEY |
| risk.medium.minScore | 50 | INT |
| risk.medium.maxAmount | 200000.00 | MONEY |

---

## 5. State machine / business rules

### 5.1 Scheme status state machine (§6.4)

`DRAFT → OPEN` (activation checks REQ-SCH-06), `OPEN ↔ PAUSED`, `OPEN|PAUSED → CLOSED`. CLOSED is terminal.

### 5.2 Eligibility scoring (BR-ELG) — from §7.1

- **BR-ELG-1:** Scoring runs exactly once, at submission, against a snapshot of beneficiary attributes taken at submission (stored in `application.beneficiary_snapshot`).
- **BR-ELG-2:** Supported attributes, types and operators:

| Attribute | Source | Type | Operators |
|---|---|---|---|
| AGE | whole years from date_of_birth at submission date (IST) | INT | EQ, NEQ, GT, GTE, LT, LTE, BETWEEN |
| ANNUAL_INCOME | annual_income | MONEY | GT, GTE, LT, LTE, BETWEEN |
| LAND_HOLDING | land_holding_acres | DECIMAL | GT, GTE, LT, LTE, BETWEEN |
| GENDER | gender | ENUM | EQ, NEQ, IN, NOT_IN |
| SOCIAL_CATEGORY | social_category | ENUM | EQ, NEQ, IN, NOT_IN |
| IS_DISABLED | is_disabled | BOOL | EQ |
| BENEFICIARY_TYPE | beneficiary_type | ENUM | EQ, NEQ, IN, NOT_IN |
| REGION | region (matches region or any ancestor) | REGION_CODE | IN, NOT_IN |

- **BR-ELG-3:** Threshold encoding is a single value (`50000.00`, `FEMALE`, `true`). BETWEEN uses `min,max` (inclusive). IN/NOT_IN use a comma-separated list. Thresholds are type-validated when the criterion is saved.
- **BR-ELG-4:** A criterion whose beneficiary value is null FAILS.
- **BR-ELG-5:** If any mandatory criterion fails → AUTO_REJECTED. Every failed mandatory criterion is recorded as the reason, and the public remark lists the failed criterion descriptions.
- **BR-ELG-6:** Score = `round_half_up(100 × Σ weight(passed) / Σ weight(all))`. Mandatory criteria are included in both sums.
- **BR-ELG-7:** One `eligibility_result` row is saved per criterion (passed, points_awarded = weight if passed else 0, beneficiary_value used).
- **BR-ELG-8:** The evaluator is a pure function with no I/O: `EligibilityEvaluator.evaluate(List<CriterionSpec>, BeneficiaryAttributes) → EligibilityOutcome` (also the AI design hook AI-H1).

### 5.3 Risk tier (BR-RISK) — from §7.2

Evaluate in this order (first match wins); thresholds come from settings §5.4:
1. **HIGH** if score < medium.minScore (50), OR amount > medium.maxAmount (200,000), OR latest field finding = MAJOR_MISMATCH.
2. **MEDIUM** if score < low.minScore (75), OR amount > low.maxAmount (50,000).
3. **LOW** otherwise (score ≥ 75 AND amount ≤ 50,000).

- **BR-RISK-1:** At submission, "amount" = requested_amount.
- **BR-RISK-2:** On each field report, the tier is recomputed with amount = recommended_amount and the report's finding. **The tier can only stay the same or escalate, never decrease.**

### 5.4 Amounts (relevant subset of BR-BUD) — from §7.5

- **BR-BUD-1:** requested_amount ∈ [scheme.min, scheme.max], else 422 `AMOUNT_OUT_OF_RANGE`.
- **BR-BUD-4:** Budget check: candidate amount ≤ remaining budget of (scheme, application.region). A missing budget row means remaining = 0.
- **BR-BUD-5:** Pre-check happens on T07/T10. The final check plus commit happens on entering APPROVED (T08/T14/T18). Both run with the budget row locked (`PESSIMISTIC_WRITE`) and are also protected by the DB CHECK constraint. *(Locking logic executed by `application-workflow`; this slice provides budget read/write via `SchemeRegionBudgetService`.)*

---

## Requirements

## 6. Requirements (verbatim REQ blocks)

### 8.5 SCH — Schemes (FR-04 to FR-07)

**REQ-SCH-01 Create scheme (ADMIN)**
- AC-SCH-01.1 `POST /schemes` with code (`^[A-Z0-9_-]{3,30}$`), name (3–200), description, category (AGRICULTURE, EDUCATION, MSME, HOUSING, HEALTH, LIVELIHOOD, OTHER), startDate, endDate, minGrantAmount, maxGrantAmount, trancheCount (1–10) and maxApplicationsPerBeneficiary (default 1) SHALL create a DRAFT scheme → 201.
- AC-SCH-01.2 Blank or invalid fields → 400. Duplicate code → 409. startDate > endDate → 400. min ≤ 0 or max ≤ 0 → 400. max < min → 400.
- AC-SCH-01.3 A client-supplied status, id or timestamps SHALL be ignored or rejected (status always DRAFT on create).

**REQ-SCH-02 Read**
- AC-SCH-02.1 `GET /schemes` SHALL be paginated with filters status, category, `openNow=true`. Non-admin roles see only OPEN, PAUSED and CLOSED schemes.
- AC-SCH-02.2 `GET /schemes/{id}` and `GET /schemes/code/{code}` → 404 if missing. The response includes criteria (descriptions, mandatory flag; weights and thresholds included), milestone templates and window.

**REQ-SCH-03 Update**
- AC-SCH-03.1 `PUT /schemes/{id}`: in DRAFT, all fields are editable. In OPEN or PAUSED, only name, description and endDate (≥ today) are editable; other changes → 422 `SCHEME_LOCKED`. Same validations as create.

**REQ-SCH-04 Criteria (FR-05)**
- AC-SCH-04.1 `POST /schemes/{id}/criteria`, `PUT /schemes/{id}/criteria/{cid}` and `DELETE /schemes/{id}/criteria/{cid}` are allowed only while DRAFT (else 422 `SCHEME_LOCKED`).
- AC-SCH-04.2 Attribute/operator/threshold combinations SHALL be validated per BR-ELG-2/3 (400 `INVALID_CRITERION`). Weight 1–100. At most 20 criteria per scheme.
- AC-SCH-04.3 `GET /schemes/{id}/criteria` SHALL list criteria ordered by creation.

**REQ-SCH-05 Milestone templates (FR-07)**
- AC-SCH-05.1 `PUT /schemes/{id}/milestone-templates` SHALL replace the full ordered list (DRAFT only): each item has name, description, tranchePercentage (> 0, 2 dp) and dueDays (≥ 0).
- AC-SCH-05.2 The count SHALL equal trancheCount and percentages SHALL sum to exactly 100.00, else 400 `INVALID_MILESTONE_TEMPLATE`.

**REQ-SCH-06 Status changes**
- AC-SCH-06.1 `PATCH /schemes/{id}/status {status}` SHALL apply §6.4. An invalid enum → 400. An invalid transition → 409.
- AC-SCH-06.2 DRAFT → OPEN requires: ≥ 1 criterion, valid templates (AC-SCH-05.2), ≥ 1 regional budget with allocated > 0, and endDate ≥ today. Otherwise 422 `SCHEME_NOT_READY` listing the failures.

**REQ-SCH-07 Regional budgets (FR-06)**
- AC-SCH-07.1 `PUT /schemes/{id}/budgets/{regionId} {allocated}` (ADMIN) SHALL create or update a budget for a DISTRICT region. New allocated ≥ committed + disbursed, else 422 `BUDGET_BELOW_COMMITTED`.
- AC-SCH-07.2 `GET /schemes/{id}/budgets` SHALL return allocated, committed, disbursed and remaining per region (ADMIN, FA in scope).
- AC-SCH-07.3 Every budget change SHALL be audited, and SHALL NOT automatically resume BUDGET_HOLD applications.

**REQ-SCH-08 Delete**
- AC-SCH-08.1 `DELETE /schemes/{id}` → 204 only if the scheme is DRAFT with no applications. With applications → 409 `RESOURCE_IN_USE`. Not DRAFT → 422 `SCHEME_LOCKED`.

---

### 8.6 ELG — Eligibility

**REQ-ELG-01 Criteria evaluation engine** — SHALL implement BR-ELG-1 to BR-ELG-8 exactly.
- AC-ELG-01.1 Each operator × type combination SHALL have unit tests, including boundary values (BETWEEN inclusive, equality at thresholds).
- AC-ELG-01.2 A null beneficiary value SHALL fail the criterion.

**REQ-ELG-02 Scoring at submission (FR-09, FR-10)**
- AC-ELG-02.1 WHEN an application is submitted, THE System SHALL evaluate all criteria, persist one eligibility_result per criterion and set eligibility_score per BR-ELG-6, all in the submission transaction.
- AC-ELG-02.2 IF any mandatory criterion fails, THEN THE System SHALL set AUTO_REJECTED (T01), record the failed criteria as the reason, set last_public_remark and skip risk tiering and assignment.

**REQ-ELG-03 Eligibility preview for beneficiaries (core demand: "check before applying")**
- AC-ELG-03.1 `POST /schemes/{id}/eligibility-check` (BENEFICIARY with a profile) SHALL return `{eligible: bool, criteria: [{description, mandatory, met}]}` using the current profile, without persisting anything.
- AC-ELG-03.2 The preview SHALL NOT return the numeric score, weights or risk tier (INV-01). See OQ-01.
- AC-ELG-03.3 `GET /schemes/eligible` SHALL return OPEN, in-window schemes whose mandatory criteria the caller currently meets, paginated.

**REQ-ELG-04 Risk tier (FR-11)** — SHALL implement §7.2. AC-ELG-04.1 includes unit tests at every boundary: scores 49/50/74/75 and amounts 50,000.00/50,000.01/200,000.00/200,000.01.

---

## 7. Endpoints

From `docs/requirements.md` §9 API Catalogue (prefix `/api/v1`), rows for REQ-SCH-* and REQ-ELG-*:

| Method | Path | Roles | REQ |
|---|---|---|---|
| GET/POST | /schemes | Any / ADMIN | SCH-01/02 |
| GET/PUT/DELETE | /schemes/{id} | Any / ADMIN | SCH-02/03/08 |
| GET | /schemes/code/{code} | Any | SCH-02 |
| PATCH | /schemes/{id}/status | ADMIN | SCH-06 |
| GET/POST/PUT/DELETE | /schemes/{id}/criteria[/{cid}] | Any (GET) / ADMIN | SCH-04 |
| PUT/GET | /schemes/{id}/milestone-templates | ADMIN / Any | SCH-05 |
| GET/PUT | /schemes/{id}/budgets[/{regionId}] | ADMIN, FA (GET) | SCH-07 |
| POST | /schemes/{id}/eligibility-check | BEN | ELG-03 |
| GET | /schemes/eligible | BEN | ELG-03 |

---

## 8. Error codes used

From `docs/requirements.md` §11.2:

**Success envelope:**
```json
{ "success": true, "message": "Scheme created", "data": { }, "timestamp": "2026-11-06T13:12:00Z" }
```

**Error envelope:**
```json
{
  "success": false,
  "status": 422,
  "code": "SCHEME_NOT_READY",
  "message": "Scheme cannot be activated: missing milestone templates",
  "errors": [ { "field": "milestoneTemplates", "message": "must be configured" } ],
  "path": "/api/v1/schemes/abc/status",
  "correlationId": "7f3c...",
  "timestamp": "2026-11-06T13:12:00Z"
}
```

| HTTP | Codes used by this slice |
|---|---|
| 400 | `VALIDATION_FAILED`, `MALFORMED_JSON`, `INVALID_PARAMETER`, `INVALID_CRITERION`, `INVALID_MILESTONE_TEMPLATE` |
| 403 | `ACCESS_DENIED` |
| 404 | `RESOURCE_NOT_FOUND` |
| 409 | `DUPLICATE_RESOURCE`, `INVALID_STATUS_TRANSITION`, `RESOURCE_IN_USE` |
| 422 | `SCHEME_LOCKED`, `SCHEME_NOT_READY`, `BUDGET_BELOW_COMMITTED` |
| 500 | `INTERNAL_ERROR` |

---

## 9. Acceptance tests owned by this slice

From `docs/requirements.md` §12.2:

| ID | Scenario | Expected |
|---|---|---|
| AT-02 | Submit when a mandatory criterion fails | AUTO_REJECTED with reasons; no FO assigned |

> AT-02 is partially owned here (the eligibility engine and AUTO_REJECTED path). The full submission flow is exercised in `application-workflow`. This slice must deliver the `EligibilityEvaluator` unit tests and the `RiskTierPolicy` boundary tests that AT-02 depends on.

**Additional unit test coverage required by this slice (from §12.1):**

| Suite | Scope |
|---|---|
| Unit (Mockito) | EligibilityEvaluator: all operators × all types × boundary values (BETWEEN inclusive; equality at thresholds); null value fails every criterion (AC-ELG-01.2); score formula with known inputs (BR-ELG-6) |
| Unit (Mockito) | RiskTierPolicy: boundary tests at scores 49/50/74/75 and amounts 50,000.00/50,000.01/200,000.00/200,000.01 (AC-ELG-04.1) |
| Unit (Mockito) | SchemeService: DRAFT → OPEN gate checks (AC-SCH-06.2): each failure condition in isolation; milestone template percentage sum; trancheCount match |
| Controller (MockMvc, @WebMvcTest) | /schemes: 201 create, 400 invalid body, 409 duplicate code, 422 SCHEME_LOCKED on update, 404 unknown id; /schemes/{id}/criteria: 422 SCHEME_LOCKED when not DRAFT; /schemes/{id}/eligibility-check: 200 preview, 403 non-beneficiary |
| Integration (Testcontainers + Flyway) | DB CHECK constraint on scheme (min>0, max≥min, tranche_count 1–10); UNIQUE(scheme_id, sequence) on milestone_template; budget CHECK committed+disbursed ≤ allocated |

---

## 10. Interfaces this slice exposes to other slices

These are the public service method signatures that other modules call. No implementation detail is specified here — only the agreed contract.

```java
// com.govgrants.subsidygrant.scheme.service.SchemeQueryService
Scheme getOpenScheme(UUID schemeId, ActorContext actor);
Page<Scheme> listOpenSchemes(SchemeFilter filter, Pageable pageable, ActorContext actor);
List<SchemeCriterion> getCriteria(UUID schemeId);
List<MilestoneTemplate> getMilestoneTemplates(UUID schemeId);

// com.govgrants.subsidygrant.scheme.service.SchemeRegionBudgetService
SchemeRegionBudget getBudget(UUID schemeId, Long regionId);  // returns null when no row exists
// Budget commit / release are performed by application-workflow (with PESSIMISTIC_WRITE)
// This service provides plain reads for pre-checks and analytics

// com.govgrants.subsidygrant.eligibility.EligibilityEvaluator  (pure function, no I/O — AI-H1)
EligibilityOutcome evaluate(List<CriterionSpec> criteria, BeneficiaryAttributes attributes);
// EligibilityOutcome: { int score, RiskTier tier (null — tier is NOT set here), 
//                       boolean autoRejected, List<CriterionResult> results,
//                       List<String> failedMandatoryDescriptions }

// com.govgrants.subsidygrant.eligibility.RiskTierPolicy  (pure function, reads settings via cache)
RiskTier evaluate(int score, BigDecimal amount, FieldFinding latestFinding, SettingsSnapshot settings);

// com.govgrants.subsidygrant.eligibility.EligibilityPreviewService
EligibilityPreviewResult preview(UUID schemeId, ActorContext actor);
// Used by REQ-ELG-03; actor must be BENEFICIARY with a profile
```

---

## 11. Interfaces this slice consumes from other slices

| Slice | Interface | Purpose |
|---|---|---|
| `foundation` | `AuditService.record(AuditEntry, ActorContext)` | Write audit row for every scheme/budget/criterion/template change (REQ-AUD-01, AC-AUD-01.1) |
| `foundation` | `SettingsCacheService.get(String key)` | Read risk tier thresholds at evaluation time (cache ≤ 60 s — AC-USR-04.3) |
| `foundation` | `RegionRepository.findById(Long id)` | Validate that regionId is a DISTRICT when creating/updating budgets (AC-SCH-07.1) |
| `beneficiary-documents` | `BeneficiaryQueryService.getProfileForUser(UUID userId)` | Load beneficiary attributes for eligibility preview (REQ-ELG-03) |

---

## 12. Traceability check

Every REQ/AC ID in this file mapped to its section:

| ID | Section |
|---|---|
| REQ-SCH-01 | §6 |
| AC-SCH-01.1 | §6 |
| AC-SCH-01.2 | §6 |
| AC-SCH-01.3 | §6 |
| REQ-SCH-02 | §6 |
| AC-SCH-02.1 | §6 |
| AC-SCH-02.2 | §6 |
| REQ-SCH-03 | §6 |
| AC-SCH-03.1 | §6 |
| REQ-SCH-04 | §6 |
| AC-SCH-04.1 | §6 |
| AC-SCH-04.2 | §6 |
| AC-SCH-04.3 | §6 |
| REQ-SCH-05 | §6 |
| AC-SCH-05.1 | §6 |
| AC-SCH-05.2 | §6 |
| REQ-SCH-06 | §6 |
| AC-SCH-06.1 | §6 |
| AC-SCH-06.2 | §6 |
| REQ-SCH-07 | §6 |
| AC-SCH-07.1 | §6 |
| AC-SCH-07.2 | §6 |
| AC-SCH-07.3 | §6 |
| REQ-SCH-08 | §6 |
| AC-SCH-08.1 | §6 |
| REQ-ELG-01 | §6 |
| AC-ELG-01.1 | §6 |
| AC-ELG-01.2 | §6 |
| REQ-ELG-02 | §6 |
| AC-ELG-02.1 | §6 |
| AC-ELG-02.2 | §6 |
| REQ-ELG-03 | §6 |
| AC-ELG-03.1 | §6 |
| AC-ELG-03.2 | §6 |
| AC-ELG-03.3 | §6 |
| REQ-ELG-04 | §6 |
| AC-ELG-04.1 | §6 |
| BR-ELG-1 | §5.2 |
| BR-ELG-2 | §5.2 |
| BR-ELG-3 | §5.2 |
| BR-ELG-4 | §5.2 |
| BR-ELG-5 | §5.2 |
| BR-ELG-6 | §5.2 |
| BR-ELG-7 | §5.2 |
| BR-ELG-8 | §5.2 |
| BR-RISK-1 | §5.3 |
| BR-RISK-2 | §5.3 |
| §6.4 (scheme state machine) | §5.1 |
| D-11 | §3 |
| D-08 | §3 |
| D-09 | §3 |
| Tables #9–12 | §4 |
| AT-02 | §9 |
