package com.govgrants.subsidygrant;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Smoke test: verifies the Spring application context loads successfully
 * against the Testcontainers PostgreSQL instance provided by {@link BaseIT}.
 */
class SubsidyGrantPlatformApplicationTests extends BaseIT {

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void contextLoads() {
        // Context loading is verified by the Spring Boot test runner.
        // If the context fails to start, this test will fail with the cause.
    }

    @Test
    void flywayCreatesApiClientTable() {
        Integer tableCount = jdbc.queryForObject(
                """
                SELECT COUNT(*)
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_name = 'api_client'
                """,
                Integer.class);

        assertThat(tableCount).isEqualTo(1);
    }
}
