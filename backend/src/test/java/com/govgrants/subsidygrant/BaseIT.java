package com.govgrants.subsidygrant;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Base class for integration tests (Task 13, REQ-AUTH-*, REQ-AUD-*).
 *
 * <p>Spins up a single shared {@code postgres:15} Testcontainer via
 * {@code @Testcontainers}, overrides all datasource/flyway properties with
 * {@link DynamicPropertySource}, and activates the {@code test} profile which
 * sets {@code flyway.baseline-on-migrate=false} and {@code flyway.out-of-order=true}.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers(disabledWithoutDocker = true)
@ActiveProfiles("test")
public abstract class BaseIT {

    @Container
    static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:15")
                    .withInitScript("init-db.sql")
                    .withDatabaseName("testdb")
                    .withUsername("postgres")
                    .withPassword("postgres");

    @DynamicPropertySource
    static void overrideProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url",        POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username",   POSTGRES::getUsername);
        registry.add("spring.datasource.password",   POSTGRES::getPassword);
        registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");

        // Flyway — fresh DB, no baseline needed; allow out-of-order timestamp migrations
        registry.add("spring.flyway.baseline-on-migrate", () -> "false");
        registry.add("spring.flyway.out-of-order",        () -> "true");

        // JWT secret for tests (≥ 256-bit HS256 key)
        registry.add("app.jwt.secret",
                () -> "test-secret-key-for-integration-tests-must-be-at-least-32-bytes");
        registry.add("app.jwt.expiration-minutes", () -> "30");
    }

    /** Available for sub-classes that need to make HTTP calls directly. */
    @Autowired
    protected TestRestTemplate restTemplate;
}
