-- Creates the gsdts_app role before Flyway migrations run.
-- The V202611070001 migration also does this, but Testcontainers may not
-- have the role when the first migration references it via GRANT statements.
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'gsdts_app') THEN
        CREATE ROLE gsdts_app LOGIN;
    END IF;
END
$$;
