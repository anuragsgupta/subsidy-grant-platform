# beneficiary-documents — Module Requirements
> Slice of docs/requirements.md v2.0 (Baselined). The master wins on any conflict.
> Change only via CR on the master (§0.3), then re-sync this file.

---

## 1. Scope

- **Implements:** REQ-BEN-01, REQ-BEN-02, REQ-BEN-03, REQ-BEN-04, REQ-BEN-05, REQ-DOC-01
- **Depends on specs:** `foundation` (auth/JWT, users, regions, audit writing)
- **Out of scope for this slice:**
  - Authentication and user management (REQ-AUTH-*, REQ-USR-*) — owned by `foundation`
  - Schemes and eligibility (REQ-SCH-*, REQ-ELG-*) — owned by `scheme-eligibility`
  - Applications and workflow (REQ-APP-*, REQ-VER-*) — owned by `application-workflow`
  - Disbursement and compliance (REQ-DSB-*, REQ-CMP-*) — owned by `disbursement-compliance`
  - External integrations (REQ-INT-*) — owned by `integration`
  - Analytics (REQ-ANL-*) — owned by `analytics`

---

## 2. Shared references (not copied — read from master)

- Glossary §2, Roles & permissions §4.2, Response/error contract §11, NFRs §10,
  Steering `.kiro/steering/project-rules.md`

---

## 3. Relevant decisions

From `docs/requirements.md` §3 Decision Log:

| ID | Conflict | Decision | Reason |
|---|---|---|---|
| D-06 | Old doc: `identity_reference` plaintext unique. SRS: SHA-256 hash + last 4 | **HMAC-SHA-256(nationalId, `NATIONAL_ID_HASH_KEY`)** + last 4; plaintext never stored | Plain SHA-256 of a 12-digit ID can be brute-forced in minutes. A keyed hash cannot |
| D-07 | SRS category list mixes caste with WOMEN/DISABLED | Split into `social_category` (GENERAL, SC, ST, OBC), `gender` (MALE, FEMALE, OTHER), `is_disabled` (bool) | One person can be both SC and a woman |
| D-16 | Object access by non-owner beneficiary | Return **404**, not 403 | Prevents resource enumeration |

---

## 4. Relevant inverse requirements (from §4.3)

- INV-01: The System SHALL NOT let a beneficiary see other beneficiaries, eligibility scores, risk tiers, internal comments or audit logs.
- INV-07: The System SHALL NOT store a national ID or bank account number in plaintext.

---

## 5. Data model (tables owned by this slice)

From `docs/requirements.md` §5.1. `[E]` = exists in DB-001 and is altered. `[N]` = new. Every table has `created_at timestamptz NOT NULL DEFAULT now()`. Mutable tables also have `updated_at` and `version BIGINT NOT NULL DEFAULT 0`. Money is `NUMERIC(14,2)`.

| # | Table | Key columns (beyond id/timestamps/version) | Constraints |
|---|---|---|---|
| 7 | beneficiary [E] | user_id (nullable), beneficiary_type (existing enum), full_name, date_of_birth, gender, social_category, is_disabled, annual_income, land_holding_acres NUMERIC(10,2), region_id, address, email, phone, national_id_hash, national_id_last4, bank_account_enc, bank_account_last4, bank_ifsc | national_id_hash UNIQUE; user_id UNIQUE (nullable); region must be DISTRICT. Drops `identity_reference` and `region_code` |
| 8 | beneficiary_document [N] | beneficiary_id, document_type, storage_key, original_filename, content_type, size_bytes, sha256, uploaded_by | — |

**Required index** (from §5.2): `beneficiary(region_id)`.

**Migration order** (from §5.3): Migration 3 — beneficiary alterations (demo rows may be truncated), beneficiary_document.

---

## 6. Requirements (verbatim REQ blocks)

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

---

### 8.4 DOC — Documents (FR-03)

**REQ-DOC-01 Upload**
- AC-DOC-01.1 `POST /beneficiaries/{id}/documents` (multipart: file, documentType ∈ ID_PROOF, INCOME_PROOF, LAND_PROOF, BUSINESS_PROOF, BANK_PROOF, OTHER) by the owner SHALL store the file via StoragePort and return 201 with metadata.
- AC-DOC-01.2 Allowed: PDF, JPEG, PNG, verified by magic bytes, not just extension (else 400 `FILE_TYPE_NOT_ALLOWED`). Max 5 MB (else 400 `FILE_TOO_LARGE`).
- AC-DOC-01.3 THE System SHALL compute and store a SHA-256 checksum, a random storage key and the original filename (sanitized). Storage keys are never returned.
- AC-DOC-01.4 `GET /beneficiaries/{id}/documents` SHALL list metadata. `GET /documents/{docId}/content` SHALL stream the file to authorized users only (same visibility as the beneficiary).

---

## 7. Endpoints

From `docs/requirements.md` §9 API Catalogue (prefix `/api/v1`), rows for REQ-BEN-* and REQ-DOC-*:

| Method | Path | Roles | REQ |
|---|---|---|---|
| POST/GET | /beneficiaries | BEN, ADMIN / DO, FA, ADMIN | BEN-01/02 |
| GET | /beneficiaries/me | BEN | BEN-02 |
| GET/PUT/DELETE | /beneficiaries/{id} | per §4.2 | BEN-02/03/04 |
| PUT | /beneficiaries/{id}/national-id | ADMIN | BEN-03 |
| GET | /beneficiaries/{id}/applications | per §4.2 | BEN-05 |
| POST/GET | /beneficiaries/{id}/documents | BEN (own) / per §4.2 | DOC-01 |
| GET | /documents/{docId}/content | per §4.2 | DOC-01 |

---

## 8. Error codes used

From `docs/requirements.md` §11.2:

| HTTP | Codes used by this slice |
|---|---|
| 400 | `VALIDATION_FAILED`, `MALFORMED_JSON`, `INVALID_PARAMETER`, `FILE_TYPE_NOT_ALLOWED`, `FILE_TOO_LARGE` |
| 403 | `ACCESS_DENIED`, `REGION_SCOPE_VIOLATION` |
| 404 | `RESOURCE_NOT_FOUND` |
| 409 | `DUPLICATE_RESOURCE`, `DUPLICATE_NATIONAL_ID`, `RESOURCE_IN_USE`, `CONCURRENT_MODIFICATION` |
| 422 | `IDENTITY_NOT_VERIFIED` |
| 500 | `INTERNAL_ERROR` |

---

## 9. Acceptance tests owned by this slice

From `docs/requirements.md` §12.2:

| ID | Scenario | Expected |
|---|---|---|
| AT-01 | Register a beneficiary with an existing national ID | 409 DUPLICATE_NATIONAL_ID |
| AT-14 | Beneficiary requests another beneficiary's application | 404 |

---

## 10. Interfaces this slice exposes to other slices

```java
// com.govgrants.subsidygrant.beneficiary.service.BeneficiaryQueryService
Beneficiary getById(UUID beneficiaryId);                         // throws ResourceNotFoundException
Beneficiary getByUserId(UUID userId);                            // throws ResourceNotFoundException
BeneficiaryAttributes getAttributesForSnapshot(UUID beneficiaryId); // used by eligibility scoring
boolean hasActiveProfile(UUID userId);

// com.govgrants.subsidygrant.beneficiary.domain.BeneficiaryAttributes  (value object / record)
// Carries all attributes consumed by EligibilityEvaluator (BR-ELG-2):
// age (computed at call time, IST), annualIncome, landHoldingAcres, gender,
// socialCategory, isDisabled, beneficiaryType, regionId (+ ancestor ids)
record BeneficiaryAttributes(int age, BigDecimal annualIncome, BigDecimal landHoldingAcres,
    Gender gender, SocialCategory socialCategory, boolean isDisabled,
    BeneficiaryType beneficiaryType, Long regionId, List<Long> regionAncestorIds) {}

// com.govgrants.subsidygrant.document.service.DocumentQueryService
List<BeneficiaryDocument> listByBeneficiary(UUID beneficiaryId);
```

---

## 11. Interfaces this slice consumes from other slices

| Slice | Interface | Purpose |
|---|---|---|
| `foundation` | `AuditService.record(AuditEntry, ActorContext)` | Write audit row for beneficiary create/update and document upload (REQ-AUD-01) |
| `foundation` | `SettingsCacheService.getBool("beneficiaryRegistry.verifyOnRegister")` | Feature flag for external registry check (AC-BEN-01.7) |
| `foundation` | `RegionQueryService.getById(Long regionId)` | Validate regionId is a DISTRICT on registration (AC-BEN-01.3) |

---

## 12. Traceability check

| ID | Section |
|---|---|
| REQ-BEN-01 | §6 |
| AC-BEN-01.1 | §6 |
| AC-BEN-01.2 | §6 |
| AC-BEN-01.3 | §6 |
| AC-BEN-01.4 | §6 |
| AC-BEN-01.5 | §6 |
| AC-BEN-01.6 | §6 |
| AC-BEN-01.7 | §6 |
| AC-BEN-01.8 | §6 |
| REQ-BEN-02 | §6 |
| AC-BEN-02.1 | §6 |
| AC-BEN-02.2 | §6 |
| AC-BEN-02.3 | §6 |
| REQ-BEN-03 | §6 |
| AC-BEN-03.1 | §6 |
| AC-BEN-03.2 | §6 |
| AC-BEN-03.3 | §6 |
| REQ-BEN-04 | §6 |
| AC-BEN-04.1 | §6 |
| REQ-BEN-05 | §6 |
| AC-BEN-05.1 | §6 |
| REQ-DOC-01 | §6 |
| AC-DOC-01.1 | §6 |
| AC-DOC-01.2 | §6 |
| AC-DOC-01.3 | §6 |
| AC-DOC-01.4 | §6 |
| D-06 | §3 |
| D-07 | §3 |
| D-16 | §3 |
| INV-01 | §4 |
| INV-07 | §4 |
| Tables #7–8 | §5 |
| AT-01, AT-14 | §9 |
