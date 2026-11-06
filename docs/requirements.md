# Requirements Document
# Government Subsidy & Grant Disbursement Tracking System (GSDTS)

## 0. Document Control

### 0.1 Status
| Field | Value |
|---|---|
| Version | 2.0 (Baselined) |
| Supersedes | SRS v1.0; "REST API Requirements" (DB-001 era) |
| Format | Kiro spec-driven, EARS acceptance criteria |
| Keywords | SHALL = mandatory. SHALL NOT = prohibited. SHOULD = recommended. RESERVED = do not implement |

### 0.2 How agents and team members use this document
1. Each requirement has an immutable ID `REQ-{MODULE}-{NN}`. Each acceptance criterion is `AC-{MODULE}-{NN}.{n}`.
2. Module specs in `.kiro/specs/{module}/` MUST copy (not rewrite) the relevant requirement blocks and add design/tasks.
3. Where this document and any older document (SRS v1.0, old API requirements, demo schema) disagree, THIS document wins.
4. Unspecified behaviour is not permitted. Log it in §14 Open Questions.

### 0.3 Change control
1. Raise a Change Request (CR) as a GitHub issue labelled `CR`, naming the IDs affected and the reason.
2. The team lead assesses the impact on design, tests and schedule.
3. Once approved, edit this file: bump the version, add a revision-history row, and mark changed IDs with `(changed v2.x)`. Never reuse a deleted ID.

### 0.4 Revision history
| Version | Date | Change | Author |
|---|---|---|---|
| 2.0 | 2026-11-06 | Consolidated SRS + API requirements + schema decisions | Team |

---

## 1. Introduction

### 1.1 Purpose
GSDTS is a REST backend that:
- registers beneficiaries;
- scores their eligibility against weighted scheme criteria;
- routes applications through field, district and finance verification based on risk tier;
- releases grants in tranches tied to verified compliance milestones;
- reports fund utilization by scheme and region, with a complete, immutable audit trail.

### 1.2 Core demands (highest priority)
1. **Eligibility scoring engine**: weighted, rule-based, deterministic, explainable (§7.1, REQ-ELG-*).
2. **Multi-stage verification workflow**: risk-tiered routing with separation of duties and region scoping (§6, §7.2–7.4, REQ-APP-*, REQ-VER-*).
3. **Staged disbursement with compliance milestones** (REQ-DSB-*, REQ-CMP-*).

### 1.3 In scope
Auth and users; regions; settings; beneficiaries and documents; schemes (criteria, milestone templates, regional budgets); eligibility; applications and workflow; verification; disbursement; compliance job; analytics; audit; treasury and beneficiary-DB integration APIs; notification port; OpenAPI; Docker Compose.

### 1.4 Out of scope (v2.0)
- Frontend (React). This spec covers the API only.
- Real SMS/email provider integration (a port plus log adapter only).
- Payment gateway (the treasury is external).
- AI assistant / MCP (RESERVED, §13).
- OCR or automated document verification.
- Refresh tokens and SSO.

---

## 2. Glossary
| Term | Meaning |
|---|---|
| System | The GSDTS Spring Boot backend |
| Actor | Authenticated user (or system job / API client) performing an action |
| Region | A STATE or DISTRICT node in the region hierarchy |
| Region scope | The set of regions an officer may act on: their bound regions plus all descendants |
| Scheme | A subsidy/grant programme with criteria, amount range, window, milestone template and regional budgets |
| Criterion | One weighted eligibility rule of a scheme (attribute, operator, threshold, weight, mandatory) |
| Eligibility score | Integer 0–100 computed per §7.1 |
| Risk tier | LOW, MEDIUM, HIGH per §7.2. It decides the review path |
| Application | One beneficiary's request under one scheme |
| Active application | An application not in a terminal status (AUTO_REJECTED, REJECTED, CLOSED, TERMINATED) |
| Tranche | One staged payment (a `disbursement` row) of an approved grant |
| Milestone | Compliance step (`compliance_milestone`) that must be VERIFIED before its tranche is releasable |
| Compliance flag | Alert raised when a milestone becomes OVERDUE |
| Remaining budget | `allocated − committed − disbursed` for (scheme, region) |
| Public remark | Text visible to the beneficiary. Internal comments are never visible to the beneficiary |
| SoD | Separation of duties (§7.4) |
| ApiResponse / PagedResponse | Standard response envelopes (§11.1) |

---

## 3. Decision Log (resolved conflicts — binding)
| ID | Conflict | Decision | Reason |
|---|---|---|---|
| D-01 | SRS: Java 17 / Boot 3. Project: Boot 4.1.2, Java 17. Old doc: Java 21 | **Java 21, Spring Boot 4.1.x** | Existing pom already on Boot 4; Java 21 is LTS |
| D-02 | Old doc: schema owned by Supabase DB-001, ddl validate. SRS: Flyway only | **Flyway owns schema**. `V1__baseline` = DB-001 schema; `ddl-auto=validate` | Satisfies NFR-05 and protects the schema |
| D-03 | SRS: local login + BCrypt + JWT. Schema: `auth_user_id → auth.users` (Supabase Auth) | **Self-issued JWT** (`POST /auth/login`). `auth_user_id` kept nullable, RESERVED, never client-settable | Fully self-contained (NFR-08 Docker Compose); simpler testing |
| D-04 | Old doc: 11 statuses incl. DRAFT, ON_HOLD, DISBURSEMENT_IN_PROGRESS. SRS: workflow statuses | **SRS workflow statuses (§6.1)**. No DRAFT: `POST /applications` = submit | Core demand is the multi-stage workflow |
| D-05 | SRS transition table lacks reject at second/finance review | **Added** SECOND_REVIEW→REJECTED, SECOND_REVIEW→FIELD_PENDING, FINANCE_REVIEW→REJECTED, SECOND_REVIEW→BUDGET_HOLD | Reviewers must be able to reject |
| D-06 | Old doc: `identity_reference` plaintext unique. SRS: SHA-256 hash + last 4 | **HMAC-SHA-256(nationalId, `NATIONAL_ID_HASH_KEY`)** + last 4; plaintext never stored | Plain SHA-256 of a 12-digit ID can be brute-forced in minutes. A keyed hash cannot |
| D-07 | SRS category list mixes caste with WOMEN/DISABLED | Split into `social_category` (GENERAL, SC, ST, OBC), `gender` (MALE, FEMALE, OTHER), `is_disabled` (bool) | One person can be both SC and a woman |
| D-08 | Error codes: old doc 400 for rule violations; SRS 422 | **SRS model**: 400 malformed/bean validation, 401, 403, 404, 409 duplicate/invalid transition/concurrency, 422 business rule, 429 lockout, 500 | Matches SRS §3.1.4 |
| D-09 | Pagination default: old 10; SRS 20, max 100 | **Default 20, max 100** | NFR-03 |
| D-10 | Old doc: client supplies `reference_no` | **System generates** `GS-{YYYY}-{NNNNNNNN}` | Prevents collisions and spoofing |
| D-11 | Old doc: scheme status DRAFT/OPEN/PAUSED/CLOSED. SRS: active flag + window | **Keep status enum AND window**. Applications are accepted only when OPEN and today ∈ window | Richer control |
| D-12 | Tranche due date: FR-07 "after previous tranche" vs STD "approval date + days" | **Due(n) = approval date + Σ due_days(1..n)** | Deterministic and honours both |
| D-13 | Committed→disbursed moves at release (§3.8.3) or at PAID (UC-2) | **At PAID confirmation** | Money is disbursed only when confirmed |
| D-14 | Old doc: hard delete users | Users who appear in any workflow/audit record **cannot be deleted** (409). Deactivate instead | Audit integrity |
| D-15 | Multi-role users (user_role is M:N) | **Exactly one role per user in v2.0** (table stays M:N for future) | Simplifies SoD; avoids officer-as-beneficiary conflicts |
| D-16 | Object access by non-owner beneficiary | Return **404**, not 403 | Prevents resource enumeration |
| D-17 | Audit immutability on Supabase | App connects as dedicated role `gsdts_app` (not `postgres`). REVOKE UPDATE/DELETE/TRUNCATE on `audit_log` **and** a trigger raising an exception on UPDATE/DELETE | The `postgres` superuser bypasses grants |
| D-18 | Region hierarchy | Two levels: STATE → DISTRICT. Beneficiaries, applications and budgets bind to a DISTRICT | Matches SRS region table |

---

## 4. Roles and Permissions

### 4.1 Roles (seeded, immutable)
| id | name | Region binding |
|---|---|---|
| 1 | BENEFICIARY | none (owns own data) |
| 2 | FIELD_OFFICER | exactly one DISTRICT |
| 3 | DISTRICT_OFFICER | exactly one DISTRICT |
| 4 | FINANCE_APPROVER | one or more regions (STATE or DISTRICT; covers descendants) |
| 5 | ADMIN | global |

### 4.2 Permission matrix (✔ allowed, ✖ 403, O = own records only)
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

### 4.3 Inverse requirements (the System SHALL NOT)
- INV-01: let a beneficiary see other beneficiaries, eligibility scores, risk tiers, internal comments or audit logs.
- INV-02: show the eligibility score, breakdown or risk tier to a field officer before that officer has filed a field report on the application.
- INV-03: let a district officer release funds or edit scheme rules.
- INV-04: let a finance approver edit application data, approved amounts or field findings.
- INV-05: let an admin approve or reject an individual application.
- INV-06: let one user act at two verification levels on one application, or let a tranche be released by the user who verified its milestone.
- INV-07: store a national ID or bank account number in plaintext.
- INV-08: allow update or deletion of audit records by any path (API, ORM or DB role).
- INV-09: automatically reject or terminate an application because of a compliance flag.

---

## 5. Logical Data Model

### 5.1 Tables
`[E]` = exists in DB-001 and is altered. `[N]` = new. Every table has `created_at timestamptz NOT NULL DEFAULT now()`. Mutable tables also have `updated_at` and `version BIGINT NOT NULL DEFAULT 0`. Money is `NUMERIC(14,2)`.

| # | Table | Key columns (beyond id/timestamps/version) | Constraints |
|---|---|---|---|
| 1 | region [N] | id BIGSERIAL, code, name, type (STATE/DISTRICT), parent_id | code UNIQUE; DISTRICT must have STATE parent |
| 2 | app_user [E] | username, password_hash, full_name, email, phone, active, failed_login_count, locked_until, auth_user_id (RESERVED) | username UNIQUE; lower(email) UNIQUE |
| 3 | role [E] | id BIGINT, name, description | name UNIQUE; 5 seeded rows |
| 4 | user_role [E] | user_id, role_id, assigned_at | PK(user_id, role_id); FK cascade on user delete |
| 5 | user_region [N] | user_id, region_id, assigned_at | PK(user_id, region_id) |
| 6 | system_setting [N] | key, value, value_type, description, updated_by | key PK |
| 7 | beneficiary [E] | user_id (nullable), beneficiary_type (existing enum), full_name, date_of_birth, gender, social_category, is_disabled, annual_income, land_holding_acres NUMERIC(10,2), region_id, address, email, phone, national_id_hash, national_id_last4, bank_account_enc, bank_account_last4, bank_ifsc | national_id_hash UNIQUE; user_id UNIQUE (nullable); region must be DISTRICT. Drops `identity_reference` and `region_code` |
| 8 | beneficiary_document [N] | beneficiary_id, document_type, storage_key, original_filename, content_type, size_bytes, sha256, uploaded_by | — |
| 9 | scheme [E] | code, name, description, category, start_date, end_date (= application window), min_grant_amount, max_grant_amount, tranche_count, max_applications_per_beneficiary, status | code UNIQUE; CHECK min>0, max≥min, end≥start, tranche_count 1–10 |
| 10 | scheme_criterion [N] | scheme_id, attribute, operator, threshold, weight, mandatory, description | weight 1–100 |
| 11 | milestone_template [N] | scheme_id, sequence, name, description, tranche_percentage NUMERIC(5,2), due_days | UNIQUE(scheme_id, sequence); pct > 0; due_days ≥ 0 |
| 12 | scheme_region_budget [N] | scheme_id, region_id, allocated, committed, disbursed | UNIQUE(scheme_id, region_id); CHECK committed≥0, disbursed≥0, committed+disbursed ≤ allocated |
| 13 | application [E] | reference_no, beneficiary_id, scheme_id, region_id, requested_amount, approved_amount, eligibility_score, risk_tier, status, assigned_field_officer_id, beneficiary_snapshot JSONB, last_public_remark, budget_hold_resume_status, submitted_at, decided_at | reference_no UNIQUE; partial UNIQUE(beneficiary_id, scheme_id) WHERE status NOT IN terminal |
| 14 | application_status_history [N] | application_id, from_status, to_status, actor_id, actor_role, comment, occurred_at | append-only |
| 15 | eligibility_result [N] | application_id, criterion_id, attribute, operator, threshold, beneficiary_value, passed, points_awarded | UNIQUE(application_id, criterion_id) |
| 16 | field_report [N] | application_id, report_no, field_officer_id, visit_date, finding, remarks, recommended_amount | UNIQUE(application_id, report_no) |
| 17 | field_report_photo [N] | field_report_id, storage_key, content_type, size_bytes, sha256 | — |
| 18 | verification_step [N] | application_id, level (DISTRICT, SECOND_DISTRICT, FINANCE), decision (APPROVE, REJECT, RETURN), officer_id, comment, public_remark, approved_amount | — |
| 19 | disbursement [N] | application_id, sequence, planned_amount, paid_amount, due_date, status, released_by, released_at, treasury_ref, paid_at | UNIQUE(application_id, sequence) |
| 20 | compliance_milestone [N] | disbursement_id, name, due_date, status, evidence_storage_key, evidence_note, submitted_at, verified_by, verified_at, verifier_comment | one per disbursement (UNIQUE disbursement_id) |
| 21 | compliance_flag [N] | milestone_id, raised_at, status (OPEN, ACTIONED), action (EXTEND, SUSPEND, TERMINATE), acted_by, acted_at, remark, new_due_date | partial UNIQUE(milestone_id) WHERE status='OPEN' |
| 22 | payment_instruction [N] | disbursement_id, amount, beneficiary_account_ref, status (PENDING, SENT, PAID, FAILED), attempts, last_error, treasury_ref, idempotency_key | idempotency_key UNIQUE; treasury_ref UNIQUE (nullable) |
| 23 | audit_log [N] | id BIGSERIAL, occurred_at, actor_id, actor_role, actor_type (USER, SYSTEM, API_CLIENT), action, entity_type, entity_id, reference_no, old_value JSONB, new_value JSONB, remark, correlation_id, ip_address | append-only (D-17) |
| 24 | api_client [N] | name (TREASURY, BENEFICIARY_DB), key_hash, active | name UNIQUE |
| 25 | shedlock [N] | standard ShedLock table | — |

### 5.2 Required indexes (NFR-03)
`application(status, region_id)`, `application(beneficiary_id)`, `application(scheme_id, status)`, `application(assigned_field_officer_id, status)`, `application(submitted_at)`, `disbursement(application_id)`, `compliance_milestone(status, due_date)`, `audit_log(reference_no, occurred_at)`, `audit_log(entity_type, entity_id)`, `beneficiary(region_id)`.

### 5.3 Migration plan
| Order | Migration | Owner module |
|---|---|---|
| 1 | `V1__baseline.sql` (DB-001 as-is) | common |
| 2 | region, user_region, roles seed, app_user auth columns, system_setting + defaults, gsdts_app role grants | auth/region/setting |
| 3 | beneficiary alterations (demo rows may be truncated), beneficiary_document | beneficiary |
| 4 | scheme alterations, scheme_criterion, milestone_template, scheme_region_budget | scheme |
| 5 | application alterations, status check, history, eligibility_result, field_report(+photo), verification_step | application/verification |
| 6 | disbursement, compliance_milestone, compliance_flag, payment_instruction | disbursement/compliance |
| 7 | audit_log + immutability trigger, api_client, shedlock | audit/integration |

### 5.4 Default system settings
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

## 6. State Machines

### 6.1 Application status
`SUBMITTED, AUTO_REJECTED, FIELD_PENDING, DISTRICT_REVIEW, SECOND_REVIEW, FINANCE_REVIEW, BUDGET_HOLD, APPROVED, REJECTED, CLOSED, TERMINATED`
Terminal: `AUTO_REJECTED, REJECTED, CLOSED, TERMINATED`.

| ID | From | To | Actor | Condition |
|---|---|---|---|---|
| T01 | SUBMITTED | AUTO_REJECTED | System | Any mandatory criterion failed |
| T02 | SUBMITTED | FIELD_PENDING | System / Admin (assign) | Scored, tier set, field officer assigned |
| T03 | FIELD_PENDING | DISTRICT_REVIEW | Field officer (assigned) | Field report filed |
| T04 | DISTRICT_REVIEW | FIELD_PENDING | District officer | Decision RETURN |
| T05 | DISTRICT_REVIEW | REJECTED | District officer | Decision REJECT |
| T06 | DISTRICT_REVIEW | SECOND_REVIEW | District officer | APPROVE and tier HIGH |
| T07 | DISTRICT_REVIEW | FINANCE_REVIEW | District officer | APPROVE, tier MEDIUM, budget pre-check passes |
| T08 | DISTRICT_REVIEW | APPROVED | District officer | APPROVE, tier LOW, budget check passes |
| T09 | DISTRICT_REVIEW | BUDGET_HOLD | System | Budget check fails during T07/T08 |
| T10 | SECOND_REVIEW | FINANCE_REVIEW | Second district officer | APPROVE, budget pre-check passes |
| T11 | SECOND_REVIEW | REJECTED | Second district officer | REJECT |
| T12 | SECOND_REVIEW | FIELD_PENDING | Second district officer | RETURN |
| T13 | SECOND_REVIEW | BUDGET_HOLD | System | Budget pre-check fails during T10 |
| T14 | FINANCE_REVIEW | APPROVED | Finance approver | APPROVE, budget check passes |
| T15 | FINANCE_REVIEW | BUDGET_HOLD | System | Budget check fails during T14 |
| T16 | FINANCE_REVIEW | REJECTED | Finance approver | REJECT |
| T17 | BUDGET_HOLD | FINANCE_REVIEW | Admin (resume) | Held before finance (resume_status = FINANCE_REVIEW) and budget now sufficient |
| T18 | BUDGET_HOLD | APPROVED | Admin (resume) | Held at final approval (resume_status = APPROVED) and budget now sufficient |
| T19 | APPROVED | CLOSED | System | All tranches PAID |
| T20 | APPROVED | TERMINATED | District officer | Flag action TERMINATE |

Any transition not listed is invalid → 409 `INVALID_STATUS_TRANSITION`.

### 6.2 Tranche (disbursement) status
`PLANNED → RELEASABLE` (milestone VERIFIED) `→ RELEASED` (finance release) `→ PAID` (treasury/manual confirmation).
Other transitions:
- `RELEASED → RELEASABLE` (treasury FAILED)
- `PLANNED|RELEASABLE → SUSPENDED` (flag SUSPEND)
- `SUSPENDED → PLANNED|RELEASABLE` (flag EXTEND; RELEASABLE if milestone VERIFIED)
- `PLANNED|RELEASABLE|SUSPENDED → CANCELLED` (TERMINATE)

### 6.3 Milestone status
`PENDING → SUBMITTED` (evidence) `→ VERIFIED | REJECTED`. Also:
- `REJECTED → SUBMITTED` (resubmission)
- `PENDING|SUBMITTED|REJECTED → OVERDUE` (daily job)
- `OVERDUE → PENDING|SUBMITTED` (flag EXTEND; SUBMITTED if evidence present)

VERIFIED is final.

### 6.4 Scheme status
`DRAFT → OPEN` (activation checks REQ-SCH-06), `OPEN ↔ PAUSED`, `OPEN|PAUSED → CLOSED`. CLOSED is terminal.

---

## 7. Business Rules

### 7.1 Eligibility scoring (BR-ELG)
- BR-ELG-1: Scoring runs exactly once, at submission, against a snapshot of beneficiary attributes taken at submission (stored in `application.beneficiary_snapshot`).
- BR-ELG-2: Supported attributes, types and operators:

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

- BR-ELG-3: Threshold encoding is a single value (`50000.00`, `FEMALE`, `true`). BETWEEN uses `min,max` (inclusive). IN/NOT_IN use a comma-separated list. Thresholds are type-validated when the criterion is saved.
- BR-ELG-4: A criterion whose beneficiary value is null FAILS.
- BR-ELG-5: If any mandatory criterion fails → AUTO_REJECTED. Every failed mandatory criterion is recorded as the reason, and the public remark lists the failed criterion descriptions.
- BR-ELG-6: Score = `round_half_up(100 × Σ weight(passed) / Σ weight(all))`. Mandatory criteria are included in both sums.
- BR-ELG-7: One `eligibility_result` row is saved per criterion (passed, points_awarded = weight if passed else 0, beneficiary_value used).
- BR-ELG-8: The evaluator is a pure function with no I/O: `EligibilityEvaluator.evaluate(List<CriterionSpec>, BeneficiaryAttributes) → EligibilityOutcome` (also the AI design hook AI-H1).

### 7.2 Risk tier (BR-RISK)
Evaluate in this order (first match wins); thresholds come from settings §5.4:
1. **HIGH** if score < medium.minScore (50), OR amount > medium.maxAmount (200,000), OR latest field finding = MAJOR_MISMATCH.
2. **MEDIUM** if score < low.minScore (75), OR amount > low.maxAmount (50,000).
3. **LOW** otherwise (score ≥ 75 AND amount ≤ 50,000).

- BR-RISK-1: At submission, "amount" = requested_amount.
- BR-RISK-2: On each field report, the tier is recomputed with amount = recommended_amount and the report's finding. **The tier can only stay the same or escalate, never decrease.**

### 7.3 Routing and review path (BR-ROUTE)
| Tier | Path |
|---|---|
| LOW | Field → District → APPROVED |
| MEDIUM | Field → District → Finance → APPROVED |
| HIGH | Field → District → Second District (different officer) → Finance → APPROVED |

- BR-ROUTE-1 (field officer assignment): choose an active FIELD_OFFICER bound to the application's district with the fewest applications in FIELD_PENDING. Tie-break 1: the oldest most-recent assignment (never-assigned first). Tie-break 2: lowest user id (string compare).
- BR-ROUTE-2: If no field officer is available, the application stays SUBMITTED, an `ASSIGNMENT_PENDING` audit entry is written, and admins are notified. Admin assigns via REQ-APP-08.
- BR-ROUTE-3: Tranche releases are always performed by a finance approver for every tier. This is the meaning of SRS FR-15 "first tranche".

### 7.4 Separation of duties and scope (BR-SOD)
- BR-SOD-1: Verification levels on one application are FIELD, DISTRICT, SECOND_DISTRICT and FINANCE. A user who has acted at one level SHALL NOT act at any other level on the same application. The same user may act again at the same level after a RETURN.
- BR-SOD-2: The user releasing a tranche ≠ the user who verified its milestone.
- BR-SOD-3: Officers act only on applications whose region is within their region scope.
- BR-SOD-4: Violations → 403 `SEPARATION_OF_DUTIES` or 403 `REGION_SCOPE_VIOLATION`.

### 7.5 Amounts and budget (BR-BUD)
- BR-BUD-1: requested_amount ∈ [scheme.min, scheme.max], else 422 `AMOUNT_OUT_OF_RANGE`.
- BR-BUD-2: recommended_amount ∈ [scheme.min, requested_amount].
- BR-BUD-3: approved_amount defaults to the latest recommended_amount. A district officer may lower it at their APPROVE (≥ scheme.min). Finance cannot change it (INV-04).
- BR-BUD-4: Budget check: candidate amount ≤ remaining budget of (scheme, application.region). A missing budget row means remaining = 0.
- BR-BUD-5: Pre-check happens on T07/T10. The final check plus commit happens on entering APPROVED (T08/T14/T18). Both run with the budget row locked (`PESSIMISTIC_WRITE`) and are also protected by the DB CHECK constraint.
- BR-BUD-6: On entering APPROVED, in ONE transaction: set approved_amount and decided_at; committed += approved_amount; generate tranches and milestones (BR-DSB-1); write status history and audit.
- BR-BUD-7: On tranche PAID: committed −= planned_amount; disbursed += paid_amount. On TERMINATE: committed −= Σ planned_amount of CANCELLED tranches.

### 7.6 Disbursement (BR-DSB)
- BR-DSB-1: For N templates: planned(n) = round(approved × pct(n) / 100, 2) for n < N; planned(N) = approved − Σ planned(1..N−1). Due(n) = approval date (IST) + Σ due_days(1..n) (D-12). Each tranche gets one milestone named after its template.
- BR-DSB-2: Tranche n is releasable only if ALL of the following hold, else 422 with the matching code:
  - status RELEASABLE (milestone VERIFIED) — `MILESTONE_NOT_VERIFIED`
  - tranche n−1 PAID (if n > 1) — `PREVIOUS_TRANCHE_UNPAID`
  - application APPROVED — `INVALID_STATUS_TRANSITION` (409)
  - releaser ≠ verifier — `SEPARATION_OF_DUTIES` (403)
  - budget committed ≥ planned — `BUDGET_INSUFFICIENT`
- BR-DSB-3: When all tranches are PAID → application CLOSED (T19).

### 7.7 Compliance (BR-CMP)
- BR-CMP-1: A daily job at 01:00 Asia/Kolkata (ShedLock, single instance) marks every milestone in PENDING/SUBMITTED/REJECTED with `today > due_date + graceDays` as OVERDUE and opens one compliance flag per milestone (idempotent).
- BR-CMP-2: Flags never change application status by themselves (INV-09).
- BR-CMP-3: Flag actions (district officer in scope, remark mandatory):
  - **EXTEND** `{newDueDate > today}` → milestone back to PENDING/SUBMITTED; SUSPENDED tranches restored.
  - **SUSPEND** → all unpaid, uncancelled tranches of the application become SUSPENDED.
  - **TERMINATE** → application TERMINATED (T20); unpaid tranches CANCELLED; budget released per BR-BUD-7.

---

## 8. Functional Requirements

Notation: "THE System" = GSDTS backend. All paths are prefixed with `/api/v1`. Every endpoint except `/auth/register`, `/auth/login`, `/integration/**` (API key) and docs/health requires a valid JWT.

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

### 8.3 BEN — Beneficiaries

**REQ-BEN-01 Registration (FR-01, FR-02)**
- AC-BEN-01.1 WHEN a BENEFICIARY calls `POST /beneficiaries` with a valid body, THE System SHALL create a beneficiary linked to the caller's user and return 201.
- AC-BEN-01.2 WHEN an ADMIN calls it, THE System SHALL create the beneficiary with optional `userId` (must reference a BENEFICIARY-role user).
- AC-BEN-01.3 Body: fullName (2–150), beneficiaryType (existing enum), dateOfBirth (past, age 0–120), gender, socialCategory, isDisabled, annualIncome (≥ 0), landHoldingAcres (≥ 0), regionId (a DISTRICT), address (≤ 500), email, phone `^(\+91)?[6-9]\d{9}$` (stored as 10 digits), nationalId `^\d{12}$`, bankAccountNumber `^\d{9,18}$`, bankIfsc `^[A-Z]{4}0[A-Z0-9]{6}$`. Invalid → 400 with field errors.
- AC-BEN-01.4 THE System SHALL store only HMAC-SHA-256(nationalId) and its last 4 digits, plus the AES-256-GCM-encrypted bank account and its last 4 digits (D-06, INV-07).
- AC-BEN-01.5 WHEN national_id_hash already exists → 409 `DUPLICATE_NATIONAL_ID`.
- AC-BEN-01.6 WHEN the user already has a beneficiary profile → 409 `DUPLICATE_RESOURCE`.
- AC-BEN-01.7 WHERE setting `beneficiaryRegistry.verifyOnRegister=true`, THE System SHALL call `BeneficiaryRegistryPort.verify(hash)`. If the result is not verified → 422 `IDENTITY_NOT_VERIFIED`.
- AC-BEN-01.8 Responses SHALL show only `nationalIdMasked` (`XXXXXXXX1234`) and `bankAccountMasked`. Never the hash, plaintext or ciphertext.

**REQ-BEN-02 Retrieval**
- AC-BEN-02.1 `GET /beneficiaries/me` (BENEFICIARY) SHALL return own profile, or 404 if none.
- AC-BEN-02.2 `GET /beneficiaries` (DO, FA, ADMIN) SHALL be paginated, region-scoped, with filters `regionId`, `beneficiaryType`, `socialCategory`, `q`.
- AC-BEN-02.3 `GET /beneficiaries/{id}`: a non-owner beneficiary gets 404 (D-16); a field officer may view only beneficiaries of applications assigned to them.

**REQ-BEN-03 Update**
- AC-BEN-03.1 `PUT /beneficiaries/{id}` (owner or ADMIN) SHALL update profile fields except nationalId (immutable; changes go through ADMIN-only `PUT /beneficiaries/{id}/national-id`, duplicate → 409).
- AC-BEN-03.2 Updates SHALL NOT alter snapshots of already-submitted applications (BR-ELG-1).
- AC-BEN-03.3 Stale `version` → 409 `CONCURRENT_MODIFICATION`.

**REQ-BEN-04 Deletion (ADMIN)**
- AC-BEN-04.1 `DELETE /beneficiaries/{id}` → 204 if the beneficiary has no applications, else 409 `RESOURCE_IN_USE`.

**REQ-BEN-05 Application history (FR-08)**
- AC-BEN-05.1 `GET /beneficiaries/{id}/applications` (owner, ADMIN, scoped officers) SHALL return all applications of the beneficiary, paginated, newest first, role-filtered per REQ-APP-05.

### 8.4 DOC — Documents (FR-03)

**REQ-DOC-01 Upload**
- AC-DOC-01.1 `POST /beneficiaries/{id}/documents` (multipart: file, documentType ∈ ID_PROOF, INCOME_PROOF, LAND_PROOF, BUSINESS_PROOF, BANK_PROOF, OTHER) by the owner SHALL store the file via StoragePort and return 201 with metadata.
- AC-DOC-01.2 Allowed: PDF, JPEG, PNG, verified by magic bytes, not just extension (else 400 `FILE_TYPE_NOT_ALLOWED`). Max 5 MB (else 400 `FILE_TOO_LARGE`).
- AC-DOC-01.3 THE System SHALL compute and store a SHA-256 checksum, a random storage key and the original filename (sanitized). Storage keys are never returned.
- AC-DOC-01.4 `GET /beneficiaries/{id}/documents` SHALL list metadata. `GET /documents/{docId}/content` SHALL stream the file to authorized users only (same visibility as the beneficiary).

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

### 8.7 APP — Applications and Workflow

**REQ-APP-01 Submit application (UC-1)**
- AC-APP-01.1 `POST /applications {schemeId, requestedAmount}` by a BENEFICIARY with a profile SHALL run these checks in order:
  1. scheme exists (404)
  2. scheme OPEN and today ∈ [startDate, endDate] (422 `SCHEME_NOT_OPEN`)
  3. amount within range (422 `AMOUNT_OUT_OF_RANGE`)
  4. no active application for this scheme (409 `ACTIVE_APPLICATION_EXISTS`)
  5. total applications for this scheme < maxApplicationsPerBeneficiary (422 `APPLICATION_LIMIT_REACHED`)
  6. profile has the fields referenced by the scheme's criteria plus bank details (422 `PROFILE_INCOMPLETE`)
- AC-APP-01.2 On success, in ONE transaction THE System SHALL: generate reference_no (D-10); set region = beneficiary region; snapshot attributes; set status SUBMITTED and submitted_at; score (REQ-ELG-02); tier (§7.2); assign a field officer (BR-ROUTE-1) → FIELD_PENDING; write history and audit for each step. It SHALL return 201.
- AC-APP-01.3 The beneficiary response SHALL contain referenceNo, status, stage label, requestedAmount and lastPublicRemark. It SHALL NOT contain score or tier.
- AC-APP-01.4 Client-supplied id, referenceNo, status, score, tier, timestamps or beneficiaryId SHALL be rejected (400) or ignored. The beneficiary is always the caller.
- AC-APP-01.5 requestedAmount ≤ 0 → 400.

**REQ-APP-02 Work queue**
- AC-APP-02.1 `GET /applications?status=&regionId=&schemeId=&riskTier=&assignedToMe=&submittedFrom=&submittedTo=` (FO, DO, FA, ADMIN) SHALL be paginated, region-scoped and sorted by submitted_at ascending by default.
- AC-APP-02.2 A field officer SHALL see only applications assigned to them.

**REQ-APP-03 Lookups**
- AC-APP-03.1 `GET /applications/{id}` and `GET /applications/reference/{referenceNo}` → 404 if missing or not visible.
- AC-APP-03.2 `GET /schemes/{id}/applications` (ADMIN, scoped officers) SHALL be paginated.

**REQ-APP-04 Status history (FR-16)**
- AC-APP-04.1 `GET /applications/{id}/history` SHALL return transitions ordered by time. For beneficiaries: stage and public remarks only, with no actor identities or internal comments.

**REQ-APP-05 Role-filtered views**
- AC-APP-05.1 A BENEFICIARY sees: referenceNo, scheme, status, stage label, requested, approved, lastPublicRemark, submittedAt, decidedAt.
- AC-APP-05.2 A FIELD_OFFICER sees the beneficiary profile (masked IDs), documents and requested amount. Score, breakdown and tier are hidden UNTIL they have filed a report on this application (INV-02).
- AC-APP-05.3 DO, FA and ADMIN see the full detail: score, breakdown, tier, field reports with photos, verification steps and history.

**REQ-APP-06 Centralized workflow**
- AC-APP-06.1 ALL status changes SHALL go through `ApplicationWorkflowService.transition(app, target, actorContext, reason)`, which validates the §6.1 table, role, region scope and SoD, then writes status history and audit in the same transaction.
- AC-APP-06.2 The transition table SHALL be defined in ONE place (`ApplicationTransitionPolicy`) as data, so new transitions need no changes elsewhere.
- AC-APP-06.3 An invalid transition → 409 `INVALID_STATUS_TRANSITION` with from/to in the message.
- AC-APP-06.4 There SHALL be NO generic "set status" endpoint.

**REQ-APP-07 Resume from budget hold (ADMIN)**
- AC-APP-07.1 `POST /applications/{id}/resume` SHALL re-run the budget check. If it passes → T17 or T18 per budget_hold_resume_status; if it fails → 422 `BUDGET_INSUFFICIENT`. Status not BUDGET_HOLD → 409.

**REQ-APP-08 Field officer (re)assignment (ADMIN)**
- AC-APP-08.1 `POST /applications/{id}/assign {fieldOfficerId}` is allowed in SUBMITTED (performs T02 after scoring is complete) or FIELD_PENDING with no report filed in the current cycle. The officer must be an active FO in the application's district (422 otherwise).

### 8.8 VER — Verification (FR-12 to FR-15)

**REQ-VER-01 Field report**
- AC-VER-01.1 `POST /applications/{id}/field-report` (multipart: JSON part `{visitDate, finding, remarks, recommendedAmount}` plus 1–5 photos JPEG/PNG ≤ 5 MB each) by the assigned FO, while status = FIELD_PENDING, SHALL save the report with report_no = previous + 1, store the photos, recompute the tier (BR-RISK-2), perform T03 and return 201.
- AC-VER-01.2 Validation: visitDate between submitted_at date and today; finding ∈ CONSISTENT, MINOR_MISMATCH, MAJOR_MISMATCH; remarks 10–2000 chars; recommendedAmount per BR-BUD-2. Errors → 400 or 422.
- AC-VER-01.3 A non-assigned FO → 403. Wrong status → 409.

**REQ-VER-02 Decisions**
- AC-VER-02.1 `POST /applications/{id}/decision {level, decision, comment, publicRemark, approvedAmount?}` SHALL be handled per the table below. Each decision creates a verification_step row.

| level | Required status | Role | APPROVE | REJECT | RETURN |
|---|---|---|---|---|---|
| DISTRICT | DISTRICT_REVIEW | DISTRICT_OFFICER | T06 / T07 / T08 by tier (with budget → T09) | T05 | T04 |
| SECOND_DISTRICT | SECOND_REVIEW | DISTRICT_OFFICER (≠ first district reviewer) | T10 (→ T13) | T11 | T12 |
| FINANCE | FINANCE_REVIEW | FINANCE_APPROVER | T14 (→ T15) | T16 | ✖ 422 `DECISION_NOT_ALLOWED` |

- AC-VER-02.2 comment (10–2000) is mandatory for REJECT and RETURN. publicRemark is mandatory for REJECT.
- AC-VER-02.3 approvedAmount may be supplied only at level DISTRICT (BR-BUD-3). At other levels → 422.
- AC-VER-02.4 A level/status mismatch → 409. A role mismatch → 403. SoD/region violations → 403 (BR-SOD).
- AC-VER-02.5 ADMIN calling this endpoint → 403 (INV-05).
- AC-VER-02.6 WHEN BUDGET_HOLD is entered, budget_hold_resume_status SHALL be set (FINANCE_REVIEW for T09-from-T07 and for T13; APPROVED for T09-from-T08 and for T15).
- AC-VER-02.7 Entering APPROVED SHALL execute BR-BUD-6 atomically. Any failure rolls back everything.

### 8.9 DSB — Disbursement (FR-17, FR-19, FR-21)

**REQ-DSB-01 Schedule generation** — per BR-DSB-1 on entering APPROVED.
- AC-DSB-01.1 The Σ planned amounts SHALL equal approved_amount exactly (test with amounts producing rounding remainders, e.g. 100,000.00 at 33.33/33.33/33.34).

**REQ-DSB-02 View schedule and reconciliation**
- AC-DSB-02.1 `GET /applications/{id}/disbursements` (role-filtered) SHALL return per tranche: sequence, planned, paid, variance = paid − planned (null if unpaid), dueDate, status, milestone status; plus totals (planned, paid, variance).

**REQ-DSB-03 Release**
- AC-DSB-03.1 `POST /disbursements/{id}/release` (FA in scope, optional header `Idempotency-Key`) SHALL validate BR-DSB-2, set RELEASED, released_by and released_at, create a PENDING payment_instruction and return 200.
- AC-DSB-03.2 Repeating the call with the same Idempotency-Key SHALL return the original result without a second instruction.
- AC-DSB-03.3 WHERE treasury.mode = API, an outbox dispatcher SHALL send PENDING instructions after commit via `TreasuryPort` (retries with exponential backoff, max 5; then FAILED plus a notification to finance).

**REQ-DSB-04 Payment confirmation**
- AC-DSB-04.1 Treasury `POST /integration/treasury/confirmations {instructionId, treasuryRef, status: PAID|FAILED, paidAmount, paidAt}` with PAID SHALL set the tranche to PAID (paid_amount, treasury_ref, paid_at), apply BR-BUD-7 and close the application if all tranches are PAID (T19), in one transaction.
- AC-DSB-04.2 FAILED SHALL set the tranche back to RELEASABLE and notify finance.
- AC-DSB-04.3 Confirmations SHALL be idempotent on (instructionId, treasuryRef). A duplicate → 200 with no change. A conflicting duplicate → 409.
- AC-DSB-04.4 WHERE treasury.mode = MANUAL, a FA (≠ releaser not required; ≠ milestone verifier required) MAY call `POST /disbursements/{id}/payment-confirmation {treasuryRef, paidAmount, paidAt}`, with the same effect (FR-19).

### 8.10 CMP — Compliance (FR-18, FR-20)

**REQ-CMP-01 Evidence submission**
- AC-CMP-01.1 `POST /milestones/{id}/evidence` (multipart file PDF/JPEG/PNG ≤ 5 MB plus a note ≤ 1000) by the owning beneficiary, when the milestone is PENDING or REJECTED (or OVERDUE after an EXTEND has reset it), SHALL set SUBMITTED and submitted_at.
- AC-CMP-01.2 `GET /applications/{id}/milestones` SHALL list milestones (role-filtered).

**REQ-CMP-02 Milestone verification**
- AC-CMP-02.1 `POST /milestones/{id}/verify {decision: VERIFY|REJECT, comment}` (DO in scope), when SUBMITTED, SHALL set VERIFIED (tranche → RELEASABLE, unless SUSPENDED) or REJECTED. The comment is mandatory on REJECT.

**REQ-CMP-03 Daily compliance job** — per BR-CMP-1.
- AC-CMP-03.1 Running the job twice on the same day SHALL NOT create duplicate flags.
- AC-CMP-03.2 The job SHALL be testable via an injectable `Clock`.

**REQ-CMP-04 Flag actions**
- AC-CMP-04.1 `GET /flags?status=&regionId=&schemeId=` (DO, ADMIN) SHALL be paginated.
- AC-CMP-04.2 `POST /flags/{id}/action {action: EXTEND|SUSPEND|TERMINATE, remark, newDueDate?}` SHALL apply BR-CMP-3. The flag must be OPEN, except EXTEND on an ACTIONED flag whose action was SUSPEND.

### 8.11 ANL — Analytics (FR-22 to FR-26)
All endpoints accept the optional filters `schemeId`, `regionId`, `from`, `to` (submitted_at, IST dates), and are automatically scoped to the caller's regions.

| REQ | Endpoint | Roles | Output (per group) |
|---|---|---|---|
| REQ-ANL-01 | GET /analytics/utilization | ADMIN, FA | scheme, region: allocated, committed, disbursed, remaining, utilizationPct = disbursed/allocated×100, commitmentPct = (committed+disbursed)/allocated×100 (2 dp; 0 if allocated = 0) |
| REQ-ANL-02 | GET /analytics/pipeline | ADMIN | scheme × status × socialCategory: count |
| REQ-ANL-03 | GET /analytics/turnaround | ADMIN | region: avg days submitted_at→decided_at; region × status: avg days spent in status (from history); count of active apps older than agingThresholdDays |
| REQ-ANL-04 | GET /analytics/compliance | ADMIN, DO | region × scheme: overdue milestone count, open flag count, suspended tranche count |
| REQ-ANL-05 | GET /analytics/demand-vs-budget | ADMIN | scheme × region: pending count and Σ requested (status ∈ SUBMITTED, FIELD_PENDING, DISTRICT_REVIEW, SECOND_REVIEW, FINANCE_REVIEW, BUDGET_HOLD) vs remaining budget, gap |

- AC-ANL-0x.1 Each endpoint SHALL be verified by an integration test against seeded data with hand-computed expected totals.
- AC-ANL-0x.2 Aggregations SHALL run in SQL (JPQL/native projections), not in-memory loops over entities.

### 8.12 AUD — Audit (FR-28, FR-29)

**REQ-AUD-01 Audit writing**
- AC-AUD-01.1 Every state change SHALL write an audit_log row in the same transaction: user created/updated/role/region/status, login, setting, scheme/criterion/template/budget, beneficiary create/update, application status, score, tier, assignment, field report, verification decision, tranche status, milestone status, flag action, payment instruction and confirmation.
- AC-AUD-01.2 old_value/new_value SHALL contain changed fields only, with PII masked.
- AC-AUD-01.3 reference_no SHALL be set for every application-related entry. correlation_id = the request's `X-Correlation-Id` (generated if absent, echoed in the response header).

**REQ-AUD-02 Immutability** — per D-17. AC-AUD-02.1: an integration test proves UPDATE and DELETE on audit_log fail for the `gsdts_app` role and via the trigger.

**REQ-AUD-03 Query**
- AC-AUD-03.1 `GET /audit?referenceNo=&entityType=&entityId=&actorId=&from=&to=` (ADMIN) SHALL be paginated, ordered by occurred_at, id ascending.
- AC-AUD-03.2 No create, update or delete audit endpoints exist.

### 8.13 INT — Integrations (FR-30)

**REQ-INT-01 API key security**
- AC-INT-01.1 `/integration/**` SHALL require header `X-API-Key`, matched (constant-time) against the stored hash of an active api_client. JWT is not accepted here and API keys are not accepted elsewhere.
- AC-INT-01.2 Each client may call only its own endpoints (TREASURY → treasury, BENEFICIARY_DB → beneficiaries). Otherwise 403.

**REQ-INT-02 Treasury**
- AC-INT-02.1 Outbound: `TreasuryPort.sendInstruction(instruction)`, with a `MockTreasuryAdapter` in the dev profile that auto-confirms after a configurable delay.
- AC-INT-02.2 Inbound: confirmations per REQ-DSB-04.
- AC-INT-02.3 `GET /integration/treasury/payment-instructions?status=PENDING|SENT` SHALL let the treasury pull instructions (pull mode). The payload includes amount, IFSC, the decrypted account number (TLS only), referenceNo and idempotency key.

**REQ-INT-03 Beneficiary database**
- AC-INT-03.1 `GET /integration/beneficiaries/{nationalIdHash}` SHALL return a minimal profile (id, name, region, category, masked IDs), or 404.
- AC-INT-03.2 `PUT /integration/beneficiaries/{nationalIdHash}` SHALL upsert profile attributes (never user_id or hash), audited with actor_type = API_CLIENT.

### 8.14 NTF — Notifications

**REQ-NTF-01 Notification port**
- AC-NTF-01.1 THE System SHALL publish domain events after commit (`@TransactionalEventListener(AFTER_COMMIT)`): application status changed, field officer assigned, milestone due in 7 days, milestone overdue, tranche released/paid/failed, assignment pending.
- AC-NTF-01.2 `NotificationPort` SHALL have a `LoggingNotificationAdapter` (default). Delivery failure SHALL NOT roll back business transactions.

---

## 9. API Catalogue (prefix `/api/v1`)
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
| POST/GET | /beneficiaries | BEN, ADMIN / DO, FA, ADMIN | BEN-01/02 |
| GET | /beneficiaries/me | BEN | BEN-02 |
| GET/PUT/DELETE | /beneficiaries/{id} | per §4.2 | BEN-02/03/04 |
| PUT | /beneficiaries/{id}/national-id | ADMIN | BEN-03 |
| GET | /beneficiaries/{id}/applications | per §4.2 | BEN-05 |
| POST/GET | /beneficiaries/{id}/documents | BEN (own) / per §4.2 | DOC-01 |
| GET | /documents/{docId}/content | per §4.2 | DOC-01 |
| GET/POST | /schemes | Any / ADMIN | SCH-01/02 |
| GET/PUT/DELETE | /schemes/{id} | Any / ADMIN | SCH-02/03/08 |
| GET | /schemes/code/{code} | Any | SCH-02 |
| PATCH | /schemes/{id}/status | ADMIN | SCH-06 |
| GET/POST/PUT/DELETE | /schemes/{id}/criteria[/{cid}] | Any (GET) / ADMIN | SCH-04 |
| PUT/GET | /schemes/{id}/milestone-templates | ADMIN / Any | SCH-05 |
| GET/PUT | /schemes/{id}/budgets[/{regionId}] | ADMIN, FA (GET) | SCH-07 |
| POST | /schemes/{id}/eligibility-check | BEN | ELG-03 |
| GET | /schemes/eligible | BEN | ELG-03 |
| GET | /schemes/{id}/applications | ADMIN, DO, FA | APP-03 |
| POST | /applications | BEN | APP-01 |
| GET | /applications | FO, DO, FA, ADMIN | APP-02 |
| GET | /applications/{id}, /applications/reference/{ref} | role-filtered | APP-03/05 |
| GET | /applications/{id}/history | role-filtered | APP-04 |
| POST | /applications/{id}/assign, /applications/{id}/resume | ADMIN | APP-08/07 |
| POST | /applications/{id}/field-report | FO | VER-01 |
| POST | /applications/{id}/decision | DO, FA | VER-02 |
| GET | /applications/{id}/disbursements | role-filtered | DSB-02 |
| GET | /applications/{id}/milestones | role-filtered | CMP-01 |
| POST | /disbursements/{id}/release | FA | DSB-03 |
| POST | /disbursements/{id}/payment-confirmation | FA (MANUAL mode) | DSB-04 |
| POST | /milestones/{id}/evidence | BEN | CMP-01 |
| POST | /milestones/{id}/verify | DO | CMP-02 |
| GET | /flags | DO, ADMIN | CMP-04 |
| POST | /flags/{id}/action | DO | CMP-04 |
| GET | /analytics/{utilization, pipeline, turnaround, compliance, demand-vs-budget} | per §8.11 | ANL-* |
| GET | /audit | ADMIN | AUD-03 |
| GET | /integration/treasury/payment-instructions | API key (TREASURY) | INT-02 |
| POST | /integration/treasury/confirmations | API key (TREASURY) | DSB-04 |
| GET/PUT | /integration/beneficiaries/{nationalIdHash} | API key (BENEFICIARY_DB) | INT-03 |

---

## 10. Non-Functional Requirements
| ID | Requirement |
|---|---|
| NFR-01 | BCrypt (strength 12); JWT 30-min expiry; HTTPS terminated at proxy; HSTS header in prod profile; CORS allow-list from env |
| NFR-02 | National ID only as HMAC-SHA-256 + last 4; bank account AES-256-GCM; keys from env; no PII in logs |
| NFR-03 | Pagination default 20, max 100 (size > 100 → 400). p95 < 500 ms for list/detail endpoints with 100,000 applications (verified by a seeded performance test; indexes per §5.2) |
| NFR-04 | Money NUMERIC(14,2)/BigDecimal HALF_UP; budget and tranche updates are transactional with row locks plus `@Version`. Stale writes → 409 `CONCURRENT_MODIFICATION` |
| NFR-05 | Flyway-only schema; `ddl-auto=validate`; startup fails fast on mismatch |
| NFR-06 | Uniform error format (§11.2); validation before processing |
| NFR-07 | Service-layer coverage ≥ 70% enforced by JaCoCo in `mvn verify` |
| NFR-08 | OpenAPI 3 at `/v3/api-docs`, Swagger UI at `/swagger-ui/index.html` with JWT and API-key auth schemes, examples and error schemas; `docker compose up` runs app + postgres:15 + minio with migrations applied |
| NFR-09 | Structured JSON logs with correlationId; Actuator `health` and `info` only exposed |
| NFR-10 | All `@Transactional` boundaries in services; read methods `readOnly = true` |
| NFR-11 | Availability target: not specified (SRS 3.4.3); see OQ-07 |

---

## 11. Response and Error Contract

### 11.1 Success envelope
```json
{ "success": true, "message": "Application submitted", "data": { }, "timestamp": "2026-11-06T13:12:00Z" }
```
Paged `data`:
```json
{ "content": [], "currentPage": 0, "pageSize": 20, "totalElements": 135, "totalPages": 7, "last": false }
```
Query parameters: `page` (≥ 0), `size` (1–100), `sort=field,asc|desc` (allow-listed fields per endpoint; unknown → 400).
DELETE returns 204 with no body.

### 11.2 Error envelope
```json
{
  "success": false,
  "status": 422,
  "code": "AMOUNT_OUT_OF_RANGE",
  "message": "Requested amount must be between 10000.00 and 50000.00",
  "errors": [ { "field": "requestedAmount", "message": "must be between 10000.00 and 50000.00" } ],
  "path": "/api/v1/applications",
  "correlationId": "7f3c...",
  "timestamp": "2026-11-06T13:12:00Z"
}
```
No stack traces, SQL or class names are ever returned. 500s are logged server-side with correlationId.

| HTTP | Codes |
|---|---|
| 400 | VALIDATION_FAILED, MALFORMED_JSON, INVALID_PARAMETER, INVALID_CRITERION, INVALID_MILESTONE_TEMPLATE, FILE_TYPE_NOT_ALLOWED, FILE_TOO_LARGE |
| 401 | UNAUTHENTICATED |
| 403 | ACCESS_DENIED, REGION_SCOPE_VIOLATION, SEPARATION_OF_DUTIES |
| 404 | RESOURCE_NOT_FOUND |
| 409 | DUPLICATE_RESOURCE, DUPLICATE_NATIONAL_ID, ACTIVE_APPLICATION_EXISTS, INVALID_STATUS_TRANSITION, CONCURRENT_MODIFICATION, RESOURCE_IN_USE |
| 422 | SCHEME_NOT_OPEN, SCHEME_NOT_READY, SCHEME_LOCKED, AMOUNT_OUT_OF_RANGE, APPLICATION_LIMIT_REACHED, PROFILE_INCOMPLETE, BUDGET_INSUFFICIENT, BUDGET_BELOW_COMMITTED, MILESTONE_NOT_VERIFIED, PREVIOUS_TRANCHE_UNPAID, DECISION_NOT_ALLOWED, INVALID_REGION_BINDING, IDENTITY_NOT_VERIFIED |
| 429 | TOO_MANY_ATTEMPTS |
| 500 | INTERNAL_ERROR |

Exception mapping:
- `MethodArgumentNotValidException` and `ConstraintViolationException` → 400 VALIDATION_FAILED
- `HttpMessageNotReadableException` → 400 MALFORMED_JSON
- `MethodArgumentTypeMismatchException` (e.g. bad UUID) → 400 INVALID_PARAMETER
- `DataIntegrityViolationException` (unique) → 409 DUPLICATE_RESOURCE
- `ObjectOptimisticLockingFailureException` → 409 CONCURRENT_MODIFICATION
- `AccessDeniedException` → 403
- Everything else → 500

---

## 12. Testing and Acceptance

### 12.1 Required test suites
| Suite | Scope |
|---|---|
| Unit (Mockito) | Every service; EligibilityEvaluator (all operators/types/boundaries); RiskTierPolicy (all boundaries); ApplicationTransitionPolicy (every T-row plus invalid pairs); tranche split rounding; SoD checks |
| Controller (MockMvc, `@WebMvcTest`) | Per resource: success POST/GET, 400 invalid body, 404, 409 duplicate, 401/403 role checks, envelope structure, pagination metadata |
| Integration (Testcontainers + Flyway) | Mappings for all tables; unique and FK constraints; partial unique active-application index; budget CHECK constraint; audit immutability; transactional rollback on mid-approval failure; repository custom queries; analytics totals |
| End-to-end (SpringBootTest + Testcontainers) | Acceptance tests below |

### 12.2 Acceptance tests (must all pass for release)
| ID | Scenario | Expected |
|---|---|---|
| AT-01 | Register a beneficiary with an existing national ID | 409 DUPLICATE_NATIONAL_ID |
| AT-02 | Submit when a mandatory criterion fails | AUTO_REJECTED with reasons; no FO assigned |
| AT-03 | Field report with MAJOR_MISMATCH on a LOW-tier app | Tier → HIGH; district APPROVE → SECOND_REVIEW |
| AT-04 | Final approval exceeding remaining regional budget | BUDGET_HOLD (not REJECTED); resume after budget raise → APPROVED |
| AT-05 | Release a tranche whose milestone is not VERIFIED | 422 MILESTONE_NOT_VERIFIED |
| AT-06 | Same user attempts DISTRICT then FINANCE (or second district) on one app | 403 SEPARATION_OF_DUTIES |
| AT-07 | UPDATE/DELETE on audit_log via the app DB role | DB error; row unchanged |
| AT-08 | LOW-tier full path: submit → field → district → APPROVED | Tranches generated, Σ = approved, committed increased |
| AT-09 | MEDIUM and HIGH full paths | Correct sequence of statuses per §7.3 |
| AT-10 | Three tranches: each releases only after its milestone is verified and the previous one is PAID; treasury confirms | All PAID → CLOSED; disbursed = Σ paid; committed back to 0 |
| AT-11 | Daily job with clock past due + grace | Milestone OVERDUE, one flag; second run creates no duplicate |
| AT-12 | TERMINATE flag action | App TERMINATED; unpaid tranches CANCELLED; committed released |
| AT-13 | Field officer views app before and after filing a report | Score hidden before, visible after |
| AT-14 | Beneficiary requests another beneficiary's application | 404 |
| AT-15 | Officer from another district decides | 403 REGION_SCOPE_VIOLATION |
| AT-16 | Admin calls /decision | 403 |
| AT-17 | Unauthenticated call to a protected endpoint / wrong role | 401 / 403 |
| AT-18 | Duplicate treasury confirmation | 200, no double counting |

---

## 13. RESERVED — AI Assistant (Chatbot) and MCP Integration
> **Status: RESERVED. Do not implement anything in §13.2–13.4.** Only the design hooks in §13.1 are in current scope.

### 13.1 Design hooks (IN SCOPE NOW — mandatory)
| ID | Hook |
|---|---|
| AI-H1 | Eligibility evaluator is a pure function (BR-ELG-8), reusable for chatbot "am I eligible?" answers |
| AI-H2 | Every read use case is a service method taking `ActorContext` and returning DTOs (no HttpServletRequest dependence), so an MCP server can call services with the end user's identity and identical RBAC |
| AI-H3 | All DTOs and endpoints have OpenAPI `@Schema`/`@Operation` descriptions (these become tool descriptions) |
| AI-H4 | Empty package `{base}.assistant` with a `package-info.java` referencing this section |
| AI-H5 | Role-filtered DTO mappers (REQ-APP-05) are the ONLY way to produce application views, so AI tools inherit INV-01/INV-02 automatically |

### 13.2 Future scope (not to be built now)
An `assistant` module exposing an MCP server (e.g. Spring AI MCP Server, Streamable HTTP transport) plus a chat endpoint for the React frontend, supporting English and Hindi.

### 13.3 Planned MCP tool catalogue
| Tool | Roles | Backed by | Type |
|---|---|---|---|
| search_open_schemes(query, category) | All | SchemeService | read |
| get_scheme_details(code) | All | SchemeService | read |
| check_my_eligibility(schemeCode) | BEN | EligibilityPreviewService | read |
| list_my_applications() | BEN | ApplicationQueryService | read |
| get_application_stage(referenceNo) | BEN (own), staff (scope) | ApplicationQueryService | read |
| get_my_tranche_schedule(referenceNo) | BEN | DisbursementQueryService | read |
| explain_status(referenceNo) | BEN | public remarks + history | read |
| get_my_work_queue(status) | FO, DO, FA | ApplicationQueryService | read |
| summarize_application(referenceNo) | DO, FA | ApplicationQueryService | read (AI summary, advisory) |
| draft_field_report_remarks(notes) | FO | — | draft only; officer submits via normal API |
| get_utilization / get_pipeline / get_compliance_report | ADMIN, FA, DO | AnalyticsService | read |
| get_audit_trail(referenceNo) | ADMIN | AuditQueryService | read |

### 13.4 Planned rules for the assistant
- R-AI-01: Assistant tools are read-only. Any future write tool requires explicit user confirmation and goes through the same service plus audit as the REST API. The AI never approves, rejects, releases or verifies.
- R-AI-02: Tools execute with the end user's ActorContext (token pass-through), never a privileged service account.
- R-AI-03: Tool outputs pass through the same role-filtered mappers. No national ID, bank data, scores to beneficiaries, or scores to field officers pre-report.
- R-AI-04: Every tool call is audited (actor, tool, parameters with PII masked, result size).
- R-AI-05: Uploaded documents and user text are treated as untrusted data (prompt-injection safe); never executed as instructions.
- R-AI-06: Answers about status, amounts or eligibility cite the source record (referenceNo, scheme code).
- R-AI-07: Per-user rate limit and token budget.
- R-AI-08: Optional RAG over scheme guideline documents uploaded by ADMIN.

---

## 14. Open Questions (agents: add here, never guess)
| ID | Question | Current default until answered |
|---|---|---|
| OQ-01 | Should beneficiaries see their numeric eligibility score? (SRS forbids; project brief mentions "score-based eligibility" for end users) | Hidden. Preview shows met/not-met only |
| OQ-02 | Should schemes define required document types that block submission? | Not enforced |
| OQ-03 | National ID format: Aadhaar only (12 digits)? | `^\d{12}$` |
| OQ-04 | Real treasury protocol (push vs pull, signing) | Both supported via TreasuryPort + pull endpoint |
| OQ-05 | Notification provider (SMTP/SMS gateway) | Logging adapter |
| OQ-06 | Must the external beneficiary DB share our HMAC key to look up by hash? | Yes, key shared out-of-band |
| OQ-07 | Availability target | None |
| OQ-08 | Future move to Supabase Auth? | Self-issued JWT (D-03) |

---

## 15. Traceability (SRS v1.0 → this document)
| SRS | REQ |
|---|---|
| FR-01, FR-02 | BEN-01 |
| FR-03 | DOC-01 |
| FR-04 | SCH-01, SCH-03, SCH-06 |
| FR-05 | SCH-04, ELG-01 |
| FR-06 | SCH-07 |
| FR-07 | SCH-05 |
| FR-08 | BEN-05 |
| FR-09, FR-10 | ELG-02 |
| FR-11 | ELG-04 |
| FR-12 | APP-01 (BR-ROUTE-1), APP-08 |
| FR-13 | VER-01 |
| FR-14, FR-15 | VER-02 |
| FR-16 | APP-04, APP-05 |
| FR-17 | DSB-01 |
| FR-18 | CMP-01, CMP-02 |
| FR-19 | DSB-03, DSB-04 |
| FR-20 | CMP-03, CMP-04 |
| FR-21 | DSB-02 |
| FR-22 to FR-26 | ANL-01 to ANL-05 |
| FR-27 | AUTH-01 to AUTH-03 |
| FR-28, FR-29 | AUD-01 to AUD-03 |
| FR-30 | INT-01 to INT-03 |
| NFR-01 to NFR-08 | §10 |
| Inverse requirements | §4.3 |
| Acceptance tests 1–7 | AT-01 to AT-07 |