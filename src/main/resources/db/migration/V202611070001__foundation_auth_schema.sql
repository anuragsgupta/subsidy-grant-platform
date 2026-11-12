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
  ('risk.low.minScore',                '75',        'INT',  'Minimum score for LOW risk tier'),
  ('risk.low.maxAmount',               '50000.00',  'MONEY','Maximum amount for LOW risk tier'),
  ('risk.medium.minScore',             '50',        'INT',  'Minimum score for MEDIUM risk tier'),
  ('risk.medium.maxAmount',            '200000.00', 'MONEY','Maximum amount for MEDIUM risk tier'),
  ('compliance.graceDays',             '7',         'INT',  'Grace days before milestone becomes OVERDUE'),
  ('analytics.agingThresholdDays',     '15',        'INT',  'Days before an active application is considered aging'),
  ('treasury.mode',                    'API',       'ENUM', 'Treasury integration mode: API or MANUAL'),
  ('beneficiaryRegistry.verifyOnRegister','false',  'BOOL', 'Call BeneficiaryRegistryPort on registration'),
  ('auth.maxFailedLogins',             '5',         'INT',  'Failed login attempts before account lockout'),
  ('auth.lockMinutes',                 '15',        'INT',  'Account lockout duration in minutes')
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
-- Grants SELECT/INSERT/UPDATE/DELETE on all current tables; UPDATE/DELETE/TRUNCATE
-- on audit_log will be explicitly REVOKED in migration V202611070007 when that
-- table is created.
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
