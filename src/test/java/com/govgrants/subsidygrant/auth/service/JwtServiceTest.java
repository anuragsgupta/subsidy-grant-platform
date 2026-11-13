package com.govgrants.subsidygrant.auth.service;

import com.govgrants.subsidygrant.auth.domain.AppUser;
import com.govgrants.subsidygrant.user.domain.Role;
import com.govgrants.subsidygrant.user.domain.UserRole;
import com.govgrants.subsidygrant.user.domain.UserRoleId;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for JwtService — real HS256 logic using a test-only 256-bit secret.
 * No Spring context needed; fields are injected via ReflectionTestUtils.
 *
 * REQ-AUTH-02, REQ-AUTH-03 / AC-AUTH-02.1, AC-AUTH-03.1
 */
class JwtServiceTest {

    // 32-character (256-bit) test secret — never use in production
    private static final String TEST_SECRET = "test-secret-key-for-junit-testing";
    private static final long EXPIRY_MINUTES = 30L;

    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService(TEST_SECRET, EXPIRY_MINUTES);
    }

    private AppUser buildUserWithRole(UUID userId, String roleName) {
        Role role = Role.builder()
                .id(1L)
                .name(roleName)
                .build();
        AppUser user = AppUser.builder()
                .id(userId)
                .username("tester")
                .fullName("Test User")
                .email("tester@example.com")
                .active(true)
                .build();
        UserRole userRole = UserRole.builder()
                .id(UserRoleId.builder()
                        .userId(user.getId())
                        .roleId(role.getId())
                        .build())
                .user(user)
                .role(role)
                .build();
        Set<UserRole> roles = new HashSet<>();
        roles.add(userRole);
        user.setUserRoles(roles);
        return user;
    }

    @Test
    void generatesTokenWithCorrectClaims_userId_role_expiry() {
        UUID userId = UUID.randomUUID();
        AppUser user = buildUserWithRole(userId, "ADMIN");

        String token = jwtService.generateToken(user);

        assertThat(token).isNotBlank();
        assertThat(jwtService.extractUserId(token)).isEqualTo(userId);
        assertThat(jwtService.extractRole(token)).isEqualTo("ADMIN");
        assertThat(jwtService.isTokenExpired(token)).isFalse();
    }

    @Test
    void validatesTokenSuccessfully() {
        AppUser user = buildUserWithRole(UUID.randomUUID(), "FIELD_OFFICER");

        String token = jwtService.generateToken(user);

        assertThat(jwtService.isTokenValid(token)).isTrue();
    }

    @Test
    void rejectsExpiredToken() {
        // Use expirationMinutes = -1 to generate an already-expired token
        JwtService shortLived = new JwtService(TEST_SECRET, -1L);
        AppUser user = buildUserWithRole(UUID.randomUUID(), "BENEFICIARY");

        String expiredToken = shortLived.generateToken(user);

        assertThat(shortLived.isTokenValid(expiredToken)).isFalse();
        assertThat(shortLived.isTokenExpired(expiredToken)).isTrue();
    }

    @Test
    void rejectsTamperedToken() {
        AppUser user = buildUserWithRole(UUID.randomUUID(), "ADMIN");
        String token = jwtService.generateToken(user);

        // Tamper with the payload section (middle segment)
        String[] parts = token.split("\\.");
        String tamperedPayload = parts[1] + "X"; // corrupt the payload
        String tamperedToken = parts[0] + "." + tamperedPayload + "." + parts[2];

        assertThat(jwtService.isTokenValid(tamperedToken)).isFalse();
    }

    @Test
    void extractsUserIdFromValidToken() {
        UUID expectedUserId = UUID.randomUUID();
        AppUser user = buildUserWithRole(expectedUserId, "DISTRICT_OFFICER");

        String token = jwtService.generateToken(user);
        UUID extracted = jwtService.extractUserId(token);

        assertThat(extracted).isEqualTo(expectedUserId);
    }
}
