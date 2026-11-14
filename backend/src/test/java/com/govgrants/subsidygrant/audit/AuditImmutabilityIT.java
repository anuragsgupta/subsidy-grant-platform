package com.govgrants.subsidygrant.audit;

import com.govgrants.subsidygrant.BaseIT;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Integration tests for audit log immutability (REQ-AUD-02, AC-AUD-02.1, D-17).
 *
 * <p>The {@code trg_audit_log_immutable} trigger raises an exception on any
 * UPDATE or DELETE of an {@code audit_log} row. The {@code gsdts_app} role
 * also has REVOKE UPDATE/DELETE/TRUNCATE permissions.
 *
 * <p>Approach: Since {@code gsdts_app} is a LOGIN role (no password), the tests
 * use {@code SET LOCAL ROLE gsdts_app} within a transaction via the main DataSource
 * to simulate what the application role would experience, while still proving that
 * the trigger fires regardless of the caller's role.
 */
class AuditImmutabilityIT extends BaseIT {

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private TransactionTemplate txTemplate;

    // ── helper ────────────────────────────────────────────────────────────────

    /**
     * Inserts a minimal audit_log row using the main (superuser) DataSource
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
    @DisplayName("AT_07: INSERT into audit_log succeeds for gsdts_app role")
    void AT_07_insertAuditLogSucceedsForGsdtsAppRole() {
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

        // Verify the row exists
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM audit_log WHERE id = ?",
                Integer.class, id);
        assertThat(count).isEqualTo(1);
    }

    @Test
    @DisplayName("AT_07: UPDATE on audit_log throws DataAccessException via immutability trigger")
    void AT_07_updateAuditLogThrowsExceptionViaTrigger() {
        // Insert a row first (outside gsdts_app role, so we can insert freely)
        long id = insertAuditRow();

        // Now attempt UPDATE within gsdts_app role context — trigger must fire
        assertThatThrownBy(() ->
                txTemplate.execute(status -> {
                    jdbc.execute("SET LOCAL ROLE gsdts_app");
                    return jdbc.update(
                            "UPDATE audit_log SET remark = 'tampered' WHERE id = ?",
                            id);
                })
        ).isInstanceOf(DataAccessException.class)
         .hasMessageContaining("audit_log rows are immutable");
    }

    @Test
    @DisplayName("AT_07: DELETE on audit_log throws DataAccessException via immutability trigger")
    void AT_07_deleteAuditLogThrowsExceptionViaTrigger() {
        long id = insertAuditRow();

        assertThatThrownBy(() ->
                txTemplate.execute(status -> {
                    jdbc.execute("SET LOCAL ROLE gsdts_app");
                    return jdbc.update("DELETE FROM audit_log WHERE id = ?", id);
                })
        ).isInstanceOf(DataAccessException.class)
         .hasMessageContaining("audit_log rows are immutable");
    }
}
