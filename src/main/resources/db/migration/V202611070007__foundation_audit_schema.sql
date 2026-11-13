-- V202611070007__foundation_audit_schema.sql
-- Implements: REQ-AUD-01..03, D-17 (audit immutability)
-- Depends on: V1__baseline, V202611070001__foundation_auth_schema

-- audit_log table (append-only)
CREATE TABLE IF NOT EXISTS public.audit_log (
    id             BIGSERIAL    PRIMARY KEY,
    occurred_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    actor_id       UUID,
    actor_role     VARCHAR(50),
    actor_type     VARCHAR(20)  NOT NULL CHECK (actor_type IN ('USER','SYSTEM','API_CLIENT')),
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
);

CREATE INDEX IF NOT EXISTS idx_audit_log_reference_no ON public.audit_log(reference_no, occurred_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity       ON public.audit_log(entity_type, entity_id);

-- api_client table
CREATE TABLE IF NOT EXISTS public.api_client (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(50)  NOT NULL UNIQUE,
    key_hash   VARCHAR(255) NOT NULL,
    active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version    BIGINT       NOT NULL DEFAULT 0
);

CREATE TRIGGER trg_api_client_updated_at
  BEFORE UPDATE ON public.api_client
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- shedlock table (standard ShedLock DDL)
CREATE TABLE IF NOT EXISTS public.shedlock (
    name       VARCHAR(64)  NOT NULL PRIMARY KEY,
    lock_until TIMESTAMPTZ  NOT NULL,
    locked_at  TIMESTAMPTZ  NOT NULL,
    locked_by  VARCHAR(255) NOT NULL
);

-- Immutability: grant + revoke for gsdts_app (D-17, AC-AUD-02.1)
GRANT SELECT, INSERT ON public.audit_log TO gsdts_app;
REVOKE UPDATE, DELETE, TRUNCATE ON public.audit_log FROM gsdts_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_client TO gsdts_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shedlock   TO gsdts_app;
GRANT USAGE, SELECT ON SEQUENCE public.audit_log_id_seq   TO gsdts_app;

-- Immutability trigger (D-17)
CREATE OR REPLACE FUNCTION public.audit_log_immutability()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'audit_log rows are immutable';
END;
$$;

CREATE TRIGGER trg_audit_log_immutable
  BEFORE UPDATE OR DELETE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_immutability();
