-- V202611070004__scheme_eligibility_schema.sql
-- Implements: REQ-SCH-01, REQ-SCH-04, REQ-SCH-05, REQ-SCH-07, REQ-ELG-01, REQ-ELG-02, AC-SCH-01.1
-- Migration 4: scheme alterations, scheme_criterion, milestone_template,
--              scheme_region_budget, beneficiary alterations, eligibility_result
-- Depends on: V1__baseline, V202611070001__foundation_auth_schema,
--             V202611070007__foundation_audit_schema

-- ── scheme: add missing columns ───────────────────────────────────────────────
ALTER TABLE public.scheme
  ADD COLUMN IF NOT EXISTS category                         VARCHAR(30)
      CHECK (category IN ('AGRICULTURE','EDUCATION','MSME','HOUSING','HEALTH','LIVELIHOOD','OTHER')),
  ADD COLUMN IF NOT EXISTS tranche_count                    INT          NOT NULL DEFAULT 1
      CONSTRAINT chk_scheme_tranche_count CHECK (tranche_count BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS max_applications_per_beneficiary INT          NOT NULL DEFAULT 1
      CONSTRAINT chk_scheme_max_app_per_ben CHECK (max_applications_per_beneficiary >= 1),
  ADD COLUMN IF NOT EXISTS version                          BIGINT       NOT NULL DEFAULT 0;

-- Tighten existing grant-amount check: min_grant_amount > 0 (was >= 0 in baseline).
-- Drop first, then re-add, because a named constraint cannot be replaced in one statement.
ALTER TABLE public.scheme
  DROP CONSTRAINT IF EXISTS chk_scheme_grant_amount;

ALTER TABLE public.scheme
  ADD CONSTRAINT chk_scheme_grant_amount
      CHECK (min_grant_amount > 0 AND max_grant_amount >= min_grant_amount);

-- ── scheme_criterion ──────────────────────────────────────────────────────────
-- REQ-SCH-04, AC-SCH-04.2, BR-ELG-2
CREATE TABLE IF NOT EXISTS public.scheme_criterion (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    scheme_id   UUID         NOT NULL REFERENCES public.scheme(id) ON DELETE CASCADE,
    attribute   VARCHAR(30)  NOT NULL
                    CHECK (attribute IN (
                        'AGE', 'ANNUAL_INCOME', 'LAND_HOLDING', 'GENDER',
                        'SOCIAL_CATEGORY', 'IS_DISABLED', 'BENEFICIARY_TYPE', 'REGION'
                    )),
    operator    VARCHAR(20)  NOT NULL
                    CHECK (operator IN (
                        'EQ', 'NEQ', 'GT', 'GTE', 'LT', 'LTE', 'BETWEEN', 'IN', 'NOT_IN'
                    )),
    threshold   TEXT         NOT NULL,
    weight      INT          NOT NULL
                    CONSTRAINT chk_criterion_weight CHECK (weight BETWEEN 1 AND 100),
    mandatory   BOOLEAN      NOT NULL DEFAULT FALSE,
    description TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version     BIGINT       NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_scheme_criterion_scheme_created
    ON public.scheme_criterion (scheme_id, created_at);

CREATE TRIGGER trg_scheme_criterion_updated_at
    BEFORE UPDATE ON public.scheme_criterion
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheme_criterion TO gsdts_app;

-- ── milestone_template ────────────────────────────────────────────────────────
-- REQ-SCH-05, AC-SCH-05.1, AC-SCH-05.2
CREATE TABLE IF NOT EXISTS public.milestone_template (
    id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    scheme_id          UUID          NOT NULL REFERENCES public.scheme(id) ON DELETE CASCADE,
    sequence           INT           NOT NULL,
    name               VARCHAR(200)  NOT NULL,
    description        TEXT,
    tranche_percentage NUMERIC(5,2)  NOT NULL
                           CONSTRAINT chk_milestone_pct CHECK (tranche_percentage > 0),
    due_days           INT           NOT NULL DEFAULT 0
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
-- REQ-SCH-07, AC-SCH-07.1, BR-BUD-4, BR-BUD-5
CREATE TABLE IF NOT EXISTS public.scheme_region_budget (
    scheme_id   UUID          NOT NULL REFERENCES public.scheme(id)  ON DELETE RESTRICT,
    region_id   BIGINT        NOT NULL REFERENCES public.region(id)  ON DELETE RESTRICT,
    allocated   NUMERIC(14,2) NOT NULL,
    committed   NUMERIC(14,2) NOT NULL DEFAULT 0,
    disbursed   NUMERIC(14,2) NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    version     BIGINT        NOT NULL DEFAULT 0,
    PRIMARY KEY (scheme_id, region_id),
    CONSTRAINT chk_budget_committed_non_neg         CHECK (committed >= 0),
    CONSTRAINT chk_budget_disbursed_non_neg         CHECK (disbursed >= 0),
    CONSTRAINT chk_budget_committed_plus_disbursed  CHECK (committed + disbursed <= allocated)
);

CREATE TRIGGER trg_scheme_region_budget_updated_at
    BEFORE UPDATE ON public.scheme_region_budget
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheme_region_budget TO gsdts_app;

-- ── beneficiary: add eligibility attribute columns ────────────────────────────
-- REQ-ELG-01, BR-ELG-2 — attributes read during scoring and preview
ALTER TABLE public.beneficiary
  ADD COLUMN IF NOT EXISTS date_of_birth      DATE,
  ADD COLUMN IF NOT EXISTS annual_income      NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS land_holding_acres NUMERIC(10,3),
  ADD COLUMN IF NOT EXISTS gender             VARCHAR(10)
      CHECK (gender IN ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY')),
  ADD COLUMN IF NOT EXISTS social_category    VARCHAR(30)
      CHECK (social_category IN ('GENERAL', 'OBC', 'SC', 'ST', 'EWS', 'OTHER')),
  ADD COLUMN IF NOT EXISTS is_disabled        BOOLEAN;

-- ── eligibility_result ────────────────────────────────────────────────────────
-- Structurally owned by application-workflow but created here because
-- EligibilityEvaluator writes rows at submission (BR-ELG-7, AC-ELG-02.1).
-- Append-only: no updated_at, no version column.
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
    ON public.eligibility_result (application_id);

GRANT SELECT, INSERT ON public.eligibility_result TO gsdts_app;
-- No UPDATE or DELETE — eligibility results are immutable once written (BR-ELG-7).
