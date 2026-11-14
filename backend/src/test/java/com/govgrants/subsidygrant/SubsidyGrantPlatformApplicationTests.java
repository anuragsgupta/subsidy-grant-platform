package com.govgrants.subsidygrant;

import org.junit.jupiter.api.Test;

/**
 * Smoke test: verifies the Spring application context loads successfully
 * against the Testcontainers PostgreSQL instance provided by {@link BaseIT}.
 */
class SubsidyGrantPlatformApplicationTests extends BaseIT {

    @Test
    void contextLoads() {
        // Context loading is verified by the Spring Boot test runner.
        // If the context fails to start, this test will fail with the cause.
    }
}
