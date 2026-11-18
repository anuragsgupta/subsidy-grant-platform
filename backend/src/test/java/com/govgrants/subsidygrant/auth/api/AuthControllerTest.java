package com.govgrants.subsidygrant.auth.api;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.Instant;
import java.sql.Timestamp;
import java.util.Base64;
import java.util.Map;
import com.govgrants.subsidygrant.user.service.SettingsCacheService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Full-stack integration tests for {@code AuthController}.
 *
 * <p>Covers: AC-AUTH-01.1, AC-AUTH-01.2, AC-AUTH-01.3,
 *            AC-AUTH-02.1, AC-AUTH-02.2, AC-AUTH-02.3, AC-AUTH-02.5,
 *            AC-AUTH-03.1, AC-AUTH-03.3, AC-AUTH-03.4,
 *            AT-17 (unauthenticated → 401, wrong role → 403).
 *
 * REQ-AUTH-01, REQ-AUTH-02, REQ-AUTH-03
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@Testcontainers(disabledWithoutDocker = true)
@ActiveProfiles("test")
class AuthControllerTest {

    private static final String BASE_URL  = "/api/v1/auth";
    private static final String USERS_URL = "/api/v1/users";

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
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private SettingsCacheService settingsCache;

    // ── helpers ──────────────────────────────────────────────────────────────

    private String regBody(String suffix) {
        return """
                {
                  "username": "user_%s",
                  "password": "Password1",
                  "fullName": "Test User %s",
                  "email": "user_%s@example.com"
                }
                """.formatted(suffix, suffix, suffix);
    }

    private String loginBody(String username, String password) {
        return """
                {"username": "%s", "password": "%s"}
                """.formatted(username, password);
    }

    /** Registers a user and returns the access token from the subsequent login. */
    private String registerAndLogin(String suffix) throws Exception {
        mockMvc.perform(post(BASE_URL + "/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(regBody(suffix)))
                .andExpect(status().isCreated());

        String loginResponse = mockMvc.perform(post(BASE_URL + "/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody("user_" + suffix, "Password1")))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        int start = loginResponse.indexOf("\"accessToken\":\"") + 15;
        int end   = loginResponse.indexOf("\"", start);
        return loginResponse.substring(start, end);
    }

    // ── cleanup between tests ─────────────────────────────────────────────────

    @BeforeEach
    void cleanUsers() {
        jdbc.update("""
                DELETE FROM user_role ur
                USING app_user u
                WHERE ur.user_id = u.id
                  AND u.email NOT IN ('rahul@example.com', 'priya@example.com')
                  AND u.username IS NOT NULL
                """);
        jdbc.update("""
                DELETE FROM app_user
                WHERE email NOT IN ('rahul@example.com', 'priya@example.com')
                  AND username IS NOT NULL
                """);
        // Also reset any modified system settings to avoid cross-test pollution
        jdbc.update("UPDATE system_setting SET value = '5' WHERE key = 'auth.maxFailedLogins'");
        settingsCache.evict("auth.maxFailedLogins");
    }

    // ══════════════════════════════════════════════════════════════════════════
    // REQ-AUTH-01 — Registration
    // ══════════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("AC_AUTH_01_1: registers new beneficiary, returns 201, response has no password, DB row exists")
    void AC_AUTH_01_1_registersNewBeneficiaryAndReturns201() throws Exception {
        String responseBody = mockMvc.perform(post(BASE_URL + "/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(regBody("reg01")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.username").value("user_reg01"))
                .andExpect(jsonPath("$.data.role").value("BENEFICIARY"))
                .andExpect(jsonPath("$.data.active").value(true))
                .andReturn().getResponse().getContentAsString();

        // Password / hash must NOT appear in response (AC-AUTH-01.1)
        assertThat(responseBody).doesNotContain("password");
        assertThat(responseBody).doesNotContain("passwordHash");
        assertThat(responseBody).doesNotContain("password_hash");

        // DB row must exist
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM app_user WHERE username = 'user_reg01'",
                Integer.class);
        assertThat(count).isEqualTo(1);
    }

    @Test
    @DisplayName("AC_AUTH_01_2a: returns 409 on duplicate username")
    void AC_AUTH_01_2_returns409OnDuplicateUsername() throws Exception {
        mockMvc.perform(post(BASE_URL + "/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(regBody("dup01")))
                .andExpect(status().isCreated());

        mockMvc.perform(post(BASE_URL + "/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "user_dup01",
                                  "password": "Password1",
                                  "fullName": "Duplicate User",
                                  "email": "different_dup01@example.com"
                                }
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("DUPLICATE_RESOURCE"));
    }

    @Test
    @DisplayName("AC_AUTH_01_2b: returns 409 on duplicate email (case-insensitive)")
    void AC_AUTH_01_2_returns409OnDuplicateEmail_caseInsensitive() throws Exception {
        mockMvc.perform(post(BASE_URL + "/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(regBody("dup02")))
                .andExpect(status().isCreated());

        mockMvc.perform(post(BASE_URL + "/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "user_dup02_other",
                                  "password": "Password1",
                                  "fullName": "Duplicate Email User",
                                  "email": "USER_DUP02@EXAMPLE.COM"
                                }
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("DUPLICATE_RESOURCE"));
    }

    @Test
    @DisplayName("AC_AUTH_01_3: ignores client-supplied role and active — always BENEFICIARY, active=true")
    void AC_AUTH_01_3_ignoresClientSuppliedRoleAndActive() throws Exception {
        mockMvc.perform(post(BASE_URL + "/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "user_role01",
                                  "password": "Password1",
                                  "fullName": "Role Test User",
                                  "email": "user_role01@example.com",
                                  "role": "ADMIN",
                                  "active": false
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.role").value("BENEFICIARY"))
                .andExpect(jsonPath("$.data.active").value(true));

        Map<String, Object> row = jdbc.queryForMap(
                """
                SELECT u.active, r.name as role_name
                FROM app_user u
                JOIN user_role ur ON ur.user_id = u.id
                JOIN role r ON r.id = ur.role_id
                WHERE u.username = 'user_role01'
                """);
        assertThat(row.get("active")).isEqualTo(true);
        assertThat(row.get("role_name")).isEqualTo("BENEFICIARY");
    }

    // ══════════════════════════════════════════════════════════════════════════
    // REQ-AUTH-02 — Login
    // ══════════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("AC_AUTH_02_1: returns JWT on valid credentials; decoded sub equals user UUID")
    void AC_AUTH_02_1_returnsJwtOnValidCredentials() throws Exception {
        String regResponse = mockMvc.perform(post(BASE_URL + "/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(regBody("jwt01")))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        int idStart = regResponse.indexOf("\"id\":\"") + 6;
        int idEnd   = regResponse.indexOf("\"", idStart);
        String userId = regResponse.substring(idStart, idEnd);

        String loginResponse = mockMvc.perform(post(BASE_URL + "/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody("user_jwt01", "Password1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.data.tokenType").value("Bearer"))
                .andReturn().getResponse().getContentAsString();

        int tokenStart = loginResponse.indexOf("\"accessToken\":\"") + 15;
        int tokenEnd   = loginResponse.indexOf("\"", tokenStart);
        String jwt = loginResponse.substring(tokenStart, tokenEnd);

        String[] parts = jwt.split("\\.");
        assertThat(parts).hasSize(3);
        byte[] payloadBytes = Base64.getUrlDecoder().decode(parts[1]);
        String payload = new String(payloadBytes);
        assertThat(payload).contains("\"sub\":\"" + userId + "\"");
    }

    @Test
    @DisplayName("AC_AUTH_02_2: returns 401 on bad password without revealing account existence")
    void AC_AUTH_02_2_returns401OnBadPassword_withoutRevealingExistence() throws Exception {
        mockMvc.perform(post(BASE_URL + "/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(regBody("bad01")))
                .andExpect(status().isCreated());

        mockMvc.perform(post(BASE_URL + "/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody("user_bad01", "WrongPass1")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("UNAUTHENTICATED"))
                .andExpect(jsonPath("$.message").value("Invalid username or password"));
    }

    @Test
    @DisplayName("AC_AUTH_02_3: returns 429 after max failed attempts (max set to 3 in DB)")
    void AC_AUTH_02_3_returns429AfterMaxFailedAttempts() throws Exception {
        mockMvc.perform(post(BASE_URL + "/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(regBody("lock01")))
                .andExpect(status().isCreated());

        // Reduce threshold to 3 for this test
        jdbc.update("UPDATE system_setting SET value = '3' WHERE key = 'auth.maxFailedLogins'");
        settingsCache.evict("auth.maxFailedLogins");
        assertThat(settingsCache.getInt("auth.maxFailedLogins")).isEqualTo(3);

        // Attempts 1 & 2 — 401 each
        for (int i = 0; i < 2; i++) {
            mockMvc.perform(post(BASE_URL + "/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(loginBody("user_lock01", "BadPass1")))
                    .andExpect(status().isUnauthorized());
        }

        // Attempt 3 — triggers lockout → 429
        mockMvc.perform(post(BASE_URL + "/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody("user_lock01", "BadPass1")))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.errorCode").value("TOO_MANY_ATTEMPTS"));
    }

    @Test
    @DisplayName("AC_AUTH_02_5: unlocks after lock period expires (set locked_until to past via JdbcTemplate)")
    void AC_AUTH_02_5_unlocksAfterLockPeriodExpires() throws Exception {
        mockMvc.perform(post(BASE_URL + "/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(regBody("unlock01")))
                .andExpect(status().isCreated());

        // Simulate expired lock by setting locked_until to 1 minute ago
        jdbc.update(
                "UPDATE app_user SET locked_until = ?::timestamptz WHERE username = 'user_unlock01'",
                Timestamp.from(Instant.now().minusSeconds(60)));

        // Login should succeed because the lock has expired
        mockMvc.perform(post(BASE_URL + "/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody("user_unlock01", "Password1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty());

        // DB: locked_until must be reset to null
        Instant lockedUntil = jdbc.queryForObject(
                "SELECT locked_until FROM app_user WHERE username = 'user_unlock01'",
                Instant.class);
        assertThat(lockedUntil).isNull();
    }

    // ══════════════════════════════════════════════════════════════════════════
    // REQ-AUTH-03 — Token verification & protected endpoints
    // ══════════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("AC_AUTH_03_1a: returns 401 when no token provided on protected endpoint")
    void AC_AUTH_03_1_returns401WithNoToken() throws Exception {
        mockMvc.perform(get(BASE_URL + "/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("UNAUTHENTICATED"));
    }

    @Test
    @DisplayName("AC_AUTH_03_1b: returns 401 with tampered/expired token")
    void AC_AUTH_03_1_returns401WithExpiredToken() throws Exception {
        // A syntactically valid JWT signed with a different secret — signature invalid → 401
        String fakeExpiredToken =
                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" +
                ".eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDEiLCJyb2xlcyI6WyJCRU5FRklDSUFSWSJdLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MTYwMDAwMDAwMX0" +
                ".invalidsignature";

        mockMvc.perform(get(BASE_URL + "/me")
                        .header("Authorization", "Bearer " + fakeExpiredToken))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("UNAUTHENTICATED"));
    }

    @Test
    @DisplayName("AC_AUTH_03_3: returns 403 when BENEFICIARY calls POST /users (ADMIN-only endpoint)")
    void AC_AUTH_03_3_returns403WhenRoleNotPermitted() throws Exception {
        String token = registerAndLogin("forbidden01");

        mockMvc.perform(post(USERS_URL)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "newstaff",
                                  "password": "Password1",
                                  "fullName": "Staff User",
                                  "email": "newstaff@example.com",
                                  "role": "FIELD_OFFICER",
                                  "roleId": 2,
                                  "regionIds": []
                                }
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"));
    }

    @Test
    @DisplayName("AC_AUTH_03_4: GET /me returns current user profile matching registered data")
    void AC_AUTH_03_4_getMeReturnsCurrentUserProfile() throws Exception {
        mockMvc.perform(post(BASE_URL + "/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "user_me01",
                                  "password": "Password1",
                                  "fullName": "Me Test User",
                                  "email": "user_me01@example.com"
                                }
                                """))
                .andExpect(status().isCreated());

        String loginResponse = mockMvc.perform(post(BASE_URL + "/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody("user_me01", "Password1")))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        int tokenStart = loginResponse.indexOf("\"accessToken\":\"") + 15;
        int tokenEnd   = loginResponse.indexOf("\"", tokenStart);
        String token = loginResponse.substring(tokenStart, tokenEnd);

        mockMvc.perform(get(BASE_URL + "/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.username").value("user_me01"))
                .andExpect(jsonPath("$.data.fullName").value("Me Test User"))
                .andExpect(jsonPath("$.data.email").value("user_me01@example.com"))
                .andExpect(jsonPath("$.data.role").value("BENEFICIARY"))
                .andExpect(jsonPath("$.data.active").value(true));
    }

    // ══════════════════════════════════════════════════════════════════════════
    // AT-17 — Unauthenticated and wrong-role access
    // ══════════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("AT_17: unauthenticated call to protected endpoint returns 401")
    void AT_17_unauthenticatedCallToProtectedEndpointReturns401() throws Exception {
        mockMvc.perform(get(USERS_URL))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("UNAUTHENTICATED"));
    }

    @Test
    @DisplayName("AT_17: wrong role (BENEFICIARY calling GET /users) returns 403")
    void AT_17_wrongRoleReturns403() throws Exception {
        String token = registerAndLogin("wrongrole01");

        mockMvc.perform(get(USERS_URL)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"));
    }
}
