package com.govgrants.subsidygrant.auth.service;

import com.govgrants.subsidygrant.audit.repository.AuditLogRepository;
import com.govgrants.subsidygrant.audit.service.AuditEntry;
import com.govgrants.subsidygrant.audit.service.AuditService;
import com.govgrants.subsidygrant.auth.api.LoginRequest;
import com.govgrants.subsidygrant.auth.api.RegisterRequest;
import com.govgrants.subsidygrant.auth.domain.AppUser;
import com.govgrants.subsidygrant.auth.repository.AppUserRepository;
import com.govgrants.subsidygrant.common.exception.DuplicateResourceException;
import com.govgrants.subsidygrant.common.exception.TooManyAttemptsException;
import com.govgrants.subsidygrant.common.exception.UnauthenticatedException;
import com.govgrants.subsidygrant.user.domain.Role;
import com.govgrants.subsidygrant.user.domain.UserRole;
import com.govgrants.subsidygrant.user.domain.UserRoleId;
import com.govgrants.subsidygrant.user.repository.RoleRepository;
import com.govgrants.subsidygrant.user.repository.UserRegionRepository;
import com.govgrants.subsidygrant.user.repository.UserRoleRepository;
import com.govgrants.subsidygrant.user.service.SettingsCacheService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for AuthService — no Spring context, no DB.
 * REQ-AUTH-01, REQ-AUTH-02 / AC-AUTH-01.1, AC-AUTH-02.3, AC-AUTH-02.4, AC-AUTH-02.5
 */
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock AppUserRepository userRepository;
    @Mock UserRoleRepository userRoleRepository;
    @Mock RoleRepository roleRepository;
    @Mock UserRegionRepository userRegionRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock JwtService jwtService;
    @Mock AuditService auditService;
    @Mock SettingsCacheService settingsCache;

    @InjectMocks
    AuthService authService;

    private AppUser buildUser(int failedCount, Instant lockedUntil) {
        return AppUser.builder()
                .id(UUID.randomUUID())
                .username("testuser")
                .passwordHash("hashed")
                .fullName("Test User")
                .email("test@example.com")
                .active(true)
                .failedLoginCount(failedCount)
                .lockedUntil(lockedUntil)
                .build();
    }

    private AppUser buildUserWithRole(int failedCount, Instant lockedUntil, String roleName) {
        AppUser user = buildUser(failedCount, lockedUntil);

        Role role = Role.builder()
                .id(1L)
                .name(roleName)
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

    // -------------------------------------------------------------------------
    // AC-AUTH-02.3 — Account lockout after max failed attempts
    // -------------------------------------------------------------------------

    @Test
    void AC_AUTH_02_3_locksAccountAfterMaxFailedAttempts() {
        // User has failedLoginCount = 4 (one more failure should trigger lock at 5)
        AppUser user = buildUser(4, null);
        when(userRepository.findByUsernameIgnoreCase("testuser"))
                .thenReturn(Optional.of(user));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(false);
        when(settingsCache.getInt("auth.maxFailedLogins")).thenReturn(5);
        when(settingsCache.getInt("auth.lockMinutes")).thenReturn(15);
        when(userRepository.save(any(AppUser.class))).thenAnswer(inv -> inv.getArgument(0));

        assertThatThrownBy(() -> authService.login(new LoginRequest("testuser", "wrongpw")))
                .isInstanceOf(TooManyAttemptsException.class);

        ArgumentCaptor<AppUser> captor = ArgumentCaptor.forClass(AppUser.class);
        verify(userRepository).save(captor.capture());
        AppUser saved = captor.getValue();
        assertThat(saved.getFailedLoginCount()).isEqualTo(5);
        assertThat(saved.getLockedUntil()).isNotNull();
        assertThat(saved.getLockedUntil()).isAfter(Instant.now());
    }

    @Test
    void AC_AUTH_02_3_returnsLockedWhileLockedUntilInFuture() {
        // User is currently locked — login should throw TooManyAttemptsException
        Instant lockedUntil = Instant.now().plusSeconds(300); // 5 min in future
        AppUser user = buildUser(5, lockedUntil);
        when(userRepository.findByUsernameIgnoreCase("testuser"))
                .thenReturn(Optional.of(user));

        assertThatThrownBy(() -> authService.login(new LoginRequest("testuser", "anypass")))
                .isInstanceOf(TooManyAttemptsException.class)
                .hasMessageContaining("locked");
    }

    @Test
    void AC_AUTH_02_3_doesNotExtendLockOnSubsequentAttempts() {
        // While account is locked, additional attempts must NOT save / extend the lock
        Instant originalLock = Instant.now().plusSeconds(300);
        AppUser user = buildUser(5, originalLock);
        when(userRepository.findByUsernameIgnoreCase("testuser"))
                .thenReturn(Optional.of(user));

        try {
            authService.login(new LoginRequest("testuser", "wrongpw"));
        } catch (TooManyAttemptsException ignored) {}

        // userRepository.save must NOT be called when already locked
        verify(userRepository, never()).save(any(AppUser.class));
        // lockedUntil must remain unchanged
        assertThat(user.getLockedUntil()).isEqualTo(originalLock);
    }

    // -------------------------------------------------------------------------
    // AC-AUTH-02.5 — Expired lock resets failed count
    // -------------------------------------------------------------------------

    @Test
    void AC_AUTH_02_5_unlocksAndResetsCountWhenLockExpired() {
        // Lock expired in the past — service should reset and proceed normally
        Instant expiredLock = Instant.now().minusSeconds(60);
        AppUser user = buildUserWithRole(5, expiredLock, "BENEFICIARY");
        when(userRepository.findByUsernameIgnoreCase("testuser"))
                .thenReturn(Optional.of(user));
        // Password matches this time → successful login
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(true);
        when(userRepository.save(any(AppUser.class))).thenAnswer(inv -> inv.getArgument(0));
        when(jwtService.generateToken(any())).thenReturn("jwt-token");

        // Should NOT throw — lock is expired
        var response = authService.login(new LoginRequest("testuser", "correctpw"));
        assertThat(response).isNotNull();
        assertThat(response.accessToken()).isEqualTo("jwt-token");

        // Verify that failedLoginCount and lockedUntil were reset
        ArgumentCaptor<AppUser> captor = ArgumentCaptor.forClass(AppUser.class);
        // save is called twice: once in the reset branch and once after success
        verify(userRepository, atLeastOnce()).save(captor.capture());
        // The final saved state should have count=0 and no lock
        AppUser lastSaved = captor.getAllValues().get(captor.getAllValues().size() - 1);
        assertThat(lastSaved.getFailedLoginCount()).isEqualTo(0);
        assertThat(lastSaved.getLockedUntil()).isNull();
    }

    // -------------------------------------------------------------------------
    // AC-AUTH-02.4 — Successful login resets failed count
    // -------------------------------------------------------------------------

    @Test
    void AC_AUTH_02_4_resetsFailedCountOnSuccessfulLogin() {
        AppUser user = buildUserWithRole(3, null, "BENEFICIARY");
        when(userRepository.findByUsernameIgnoreCase("testuser"))
                .thenReturn(Optional.of(user));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(true);
        when(userRepository.save(any(AppUser.class))).thenAnswer(inv -> inv.getArgument(0));
        when(jwtService.generateToken(any())).thenReturn("jwt-token");

        authService.login(new LoginRequest("testuser", "correctpw"));

        ArgumentCaptor<AppUser> captor = ArgumentCaptor.forClass(AppUser.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getFailedLoginCount()).isEqualTo(0);
        assertThat(captor.getValue().getLockedUntil()).isNull();
    }

    // -------------------------------------------------------------------------
    // AC-AUTH-01.1 — Duplicate username / email
    // -------------------------------------------------------------------------

    @Test
    void AC_AUTH_01_1_throwsDuplicateOnExistingUsername() {
        when(userRepository.existsByUsernameIgnoreCase("existing")).thenReturn(true);

        RegisterRequest request = new RegisterRequest(
                "existing", "Password1", "Full Name", "new@example.com", null);

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessageContaining("Username");
    }

    @Test
    void AC_AUTH_01_1_throwsDuplicateOnExistingEmail() {
        when(userRepository.existsByUsernameIgnoreCase("newuser")).thenReturn(false);
        when(userRepository.existsByEmailIgnoreCase("existing@example.com")).thenReturn(true);

        RegisterRequest request = new RegisterRequest(
                "newuser", "Password1", "Full Name", "existing@example.com", null);

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessageContaining("Email");
    }
}
