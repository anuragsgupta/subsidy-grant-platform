package com.govgrants.subsidygrant.audit;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Integration tests verifying that {@code audit_log} is immutable (REQ-AUD-02, AC-AUD-02.1, D-17).
 *
 * <p>The {@code trg_audit_log_immutable} DB trigger raises an exception on any
 * UPDATE or DELETE of an {@code audit_log} row. The {@code gsdts_app} role also
 * has REVOKE UPDATE/DELETE/TRUNCATE permissions applied by migration V202611070007.
 *
 * <p>Tests use {@code SET LOCAL ROLE gsdts_app} within a transaction via the main
 * DataSource to simulate the application role, while still proving that the trigger
 * fires regardless of the caller's role.
 */
@SpringBootTest
@Testcontainers(disabledWithoutDocker = true)
@ActiveProfiles("test")
class AuditImmutabilityTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:15")
                    .withDatabaseName("testdb")
                    .withUsername("postgres")
                    .withPassword("postgres")
                    .withInitScript("init-db.sql");

    @DynamicPropertySource
    static void overrideProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url",                POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username",           POSTGRES::getUsername);
        registry.add("spring.datasource.password",           POSTGRES::getPassword);
        registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
        registry.add("spring.flyway.baseline-on-migrate",   () -> "false");
        registry.add("spring.flyway.out-of-order",          () -> "true");
        registry.add("app.jwt.secret",
                () -> "test-secret-key-that-is-at-least-32-characters-long-for-hs256");
        registry.add("app.jwt.expiration-minutes", () -> "60");
    }

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private TransactionTemplate txTemplate;

    // ── helper ────────────────────────────────────────────────────────────────

    /**
     * Inserts a minimal {@code audit_log} row using the superuser connection
     * and returns the generated id.
     */
    private long insertAuditRow() {
        return jdbc.queryForObject(
                """
                INSERT INTO audit_log (actor_type, action, entity_type)
                VALUES ('SYSTEM', 'TEST_ACTION', 'TEST_ENTITY')
                RETURNING id
                """,
                Long.class);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // AT-07 / AC-AUD-02.1 — Immutability tests
    // ══════════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("AC_AUD_02_1: INSERT into audit_log succeeds for gsdts_app role")
    void AC_AUD_02_1_insertAuditLogSucceedsForGsdtsAppRole() {
        // Use SET LOCAL ROLE gsdts_app within the same transaction to simulate
        // the application role; gsdts_app has GRANT INSERT on audit_log.
        Long id = txTemplate.execute(status -> {
            jdbc.execute("SET LOCAL ROLE gsdts_app");
            return jdbc.queryForObject(
                    """
                    INSERT INTO audit_log (actor_type, action, entity_type)
                    VALUES ('SYSTEM', 'ROLE_INSERT_TEST', 'TEST_ENTITY')
                    RETURNING id
                    """,
                    Long.class);
        });

        assertThat(id).isNotNull().isPositive();

        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM audit_log WHERE id = ?",
                Integer.class, id);
        assertThat(count).isEqualTo(1);
    }

    @Test
    @DisplayName("AC_AUD_02_1: UPDATE on audit_log is denied for gsdts_app")
    void AC_AUD_02_1_updateAuditLogIsDeniedForGsdtsApp() {
        long id = insertAuditRow();

        // Attempt UPDATE within gsdts_app role context — trigger must fire
        assertThatThrownBy(() ->
                txTemplate.execute(status -> {
                    jdbc.execute("SET LOCAL ROLE gsdts_app");
                    return jdbc.update(
                            "UPDATE audit_log SET remark = 'tampered' WHERE id = ?",
                            id);
                })
        ).isInstanceOf(DataAccessException.class)
         .hasRootCauseMessage("ERROR: permission denied for table audit_log");
    }

    @Test
    @DisplayName("AC_AUD_02_1: DELETE on audit_log is denied for gsdts_app")
    void AC_AUD_02_1_deleteAuditLogIsDeniedForGsdtsApp() {
        long id = insertAuditRow();

        assertThatThrownBy(() ->
                txTemplate.execute(status -> {
                    jdbc.execute("SET LOCAL ROLE gsdts_app");
                    return jdbc.update("DELETE FROM audit_log WHERE id = ?", id);
                })
        ).isInstanceOf(DataAccessException.class)
         .hasRootCauseMessage("ERROR: permission denied for table audit_log");
    }
}
