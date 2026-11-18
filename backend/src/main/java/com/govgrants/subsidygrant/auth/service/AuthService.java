package com.govgrants.subsidygrant.auth.service;

import com.govgrants.subsidygrant.audit.service.AuditEntry;
import com.govgrants.subsidygrant.audit.service.AuditService;
import com.govgrants.subsidygrant.auth.api.LoginRequest;
import com.govgrants.subsidygrant.auth.api.RegisterRequest;
import com.govgrants.subsidygrant.auth.api.TokenResponse;
import com.govgrants.subsidygrant.auth.domain.AppUser;
import com.govgrants.subsidygrant.auth.repository.AppUserRepository;
import com.govgrants.subsidygrant.common.domain.ActorContext;
import com.govgrants.subsidygrant.common.exception.BusinessRuleException;
import com.govgrants.subsidygrant.common.exception.DuplicateResourceException;
import com.govgrants.subsidygrant.common.exception.ResourceNotFoundException;
import com.govgrants.subsidygrant.common.exception.TooManyAttemptsException;
import com.govgrants.subsidygrant.common.exception.UnauthenticatedException;
import com.govgrants.subsidygrant.user.api.UserResponse;
import com.govgrants.subsidygrant.user.domain.Role;
import com.govgrants.subsidygrant.user.domain.UserRole;
import com.govgrants.subsidygrant.user.domain.UserRoleId;
import com.govgrants.subsidygrant.user.repository.RoleRepository;
import com.govgrants.subsidygrant.user.repository.UserRegionRepository;
import com.govgrants.subsidygrant.user.repository.UserRoleRepository;
import com.govgrants.subsidygrant.user.service.SettingsCacheService;
import org.slf4j.MDC;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Authentication service implementing beneficiary self-registration and login
 * with account lockout, plus the current-user lookup.
 *
 * <p>REQ-AUTH-01 (register), REQ-AUTH-02 (login), REQ-AUTH-03.4 (me),
 * D-03 (self-issued JWT).
 */
@Service
@Transactional
public class AuthService {

    private static final String BENEFICIARY_ROLE = "BENEFICIARY";
    private static final int JWT_EXPIRATION_MINUTES = 30;

    private final AppUserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final RoleRepository roleRepository;
    private final UserRegionRepository userRegionRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuditService auditService;
    private final SettingsCacheService settingsCache;

    public AuthService(AppUserRepository userRepository,
                        UserRoleRepository userRoleRepository,
                        RoleRepository roleRepository,
                        UserRegionRepository userRegionRepository,
                        PasswordEncoder passwordEncoder,
                        JwtService jwtService,
                        AuditService auditService,
                        SettingsCacheService settingsCache) {
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
        this.roleRepository = roleRepository;
        this.userRegionRepository = userRegionRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.auditService = auditService;
        this.settingsCache = settingsCache;
    }

    // -------------------------------------------------------------------------
    // REQ-AUTH-01 — Beneficiary self sign-up
    // -------------------------------------------------------------------------

    /**
     * Registers a new beneficiary user (AC-AUTH-01.1–01.3).
     *
     * @param request validated registration payload
     * @return the created user profile (no password or hash)
     */
    public UserResponse register(RegisterRequest request) {
        // AC-AUTH-01.2 — username uniqueness (case-insensitive)
        if (userRepository.existsByUsernameIgnoreCase(request.username())) {
            throw new DuplicateResourceException("Username already exists");
        }
        // AC-AUTH-01.2 — email uniqueness (case-insensitive)
        if (userRepository.existsByEmailIgnoreCase(request.email())) {
            throw new DuplicateResourceException("Email already exists");
        }
        // AC-AUTH-01.1 — password must contain ≥1 letter AND ≥1 digit
        if (!hasLetterAndDigit(request.password())) {
            throw new BusinessRuleException("VALIDATION_FAILED",
                    "Password must contain at least one letter and one digit");
        }

        AppUser user = AppUser.builder()
                .username(request.username())
                .passwordHash(passwordEncoder.encode(request.password()))
                .fullName(request.fullName())
                .email(request.email())
                .phone(request.phone())
                .active(true)
                .failedLoginCount(0)
                .build();
        user = userRepository.save(user);

        // AC-AUTH-01.1, AC-AUTH-01.3 — assign BENEFICIARY role (system-controlled, not client-settable)
        Role beneficiaryRole = roleRepository.findByName(BENEFICIARY_ROLE)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + BENEFICIARY_ROLE));
        UserRole userRole = UserRole.builder()
                .id(UserRoleId.builder()
                        .userId(user.getId())
                        .roleId(beneficiaryRole.getId())
                        .build())
                .user(user)
                .role(beneficiaryRole)
                .build();
        userRoleRepository.save(userRole);

        // AC-AUD-01.1 — audit registration (no authenticated actor yet → system)
        Map<String, Object> newValue = new LinkedHashMap<>();
        newValue.put("username", user.getUsername());
        newValue.put("fullName", user.getFullName());
        newValue.put("email", user.getEmail()); // masked by AuditService
        auditService.recordSystem(new AuditEntry(
                "USER_REGISTERED", "USER",
                user.getId().toString(), null,
                null, newValue, "Beneficiary self-registration"
        ));

        return toUserResponse(user, BENEFICIARY_ROLE, List.of());
    }

    // -------------------------------------------------------------------------
    // REQ-AUTH-02 — Login
    // -------------------------------------------------------------------------

    /**
     * Authenticates a user and returns a JWT (AC-AUTH-02.1–02.5).
     *
     * @param request validated login payload
     * @return token response with the signed JWT and expiry
     */
    @Transactional(noRollbackFor = {UnauthenticatedException.class, TooManyAttemptsException.class})
    public TokenResponse login(LoginRequest request) {
        // AC-AUTH-02.2 — find user case-insensitive
        AppUser user = userRepository.findByUsernameIgnoreCase(request.username())
                .orElse(null);

        if (user == null) {
            // AC-AUTH-02.4 — audit failure (username only, no userId)
            auditService.recordSystem(new AuditEntry(
                    "LOGIN_FAILURE", "USER", null, null,
                    null, null, "Username not found: " + request.username()
            ));
            // AC-AUTH-02.2 — message does NOT reveal whether username exists
            throw new UnauthenticatedException("Invalid username or password");
        }

        Instant now = Instant.now();

        // AC-AUTH-02.3 — account currently locked
        if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(now)) {
            // Do NOT increment failedLoginCount (lock should not be extended)
            auditService.recordSystem(new AuditEntry(
                    "LOGIN_FAILURE", "USER", user.getId().toString(), null,
                    null, null, "Account locked"
            ));
            throw new TooManyAttemptsException("Account is locked. Try again later.");
        }

        // AC-AUTH-02.5 — lock expired → reset and continue
        if (user.getLockedUntil() != null && !user.getLockedUntil().isAfter(now)) {
            user.setFailedLoginCount(0);
            user.setLockedUntil(null);
        }

        // AC-AUTH-02.2 — password check
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            user.setFailedLoginCount(user.getFailedLoginCount() + 1);
            int maxFailedLogins = settingsCache.getInt("auth.maxFailedLogins"); // default 5
            boolean nowLocked = user.getFailedLoginCount() >= maxFailedLogins;
            if (nowLocked) {
                int lockMinutes = settingsCache.getInt("auth.lockMinutes"); // default 15
                user.setLockedUntil(now.plus(lockMinutes, ChronoUnit.MINUTES));
            }
            userRepository.save(user);

            auditService.recordSystem(new AuditEntry(
                    "LOGIN_FAILURE", "USER", user.getId().toString(), null,
                    null, null, "Invalid password for: " + request.username()
            ));

            if (nowLocked) {
                throw new TooManyAttemptsException(
                        "Account locked due to too many failed attempts.");
            }
            throw new UnauthenticatedException("Invalid username or password");
        }

        // AC-AUTH-02.4 — success: reset counters
        user.setFailedLoginCount(0);
        user.setLockedUntil(null);
        userRepository.save(user);

        // AC-AUTH-02.4 — audit success (authenticated user exists)
        String roleName = extractRoleName(user);
        ActorContext actor = new ActorContext(
                user.getId(), roleName, List.of(),
                MDC.get("correlationId"), null
        );
        auditService.record(new AuditEntry(
                "LOGIN_SUCCESS", "USER",
                user.getId().toString(), null,
                null, null, "Login successful"
        ), actor);

        // AC-AUTH-02.1 — generate JWT
        String token = jwtService.generateToken(user);
        Instant expiresAt = now.plus(JWT_EXPIRATION_MINUTES, ChronoUnit.MINUTES);
        return new TokenResponse(token, "Bearer", expiresAt);
    }

    // -------------------------------------------------------------------------
    // REQ-AUTH-03.4 — Current user
    // -------------------------------------------------------------------------

    /**
     * Returns the authenticated user's profile (AC-AUTH-03.4).
     *
     * @param actor the current actor context (populated by JwtAuthFilter)
     * @return user profile with role and region scope
     */
    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(ActorContext actor) {
        AppUser user = userRepository.findByIdWithRoles(actor.userId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        List<Long> regionIds = userRegionRepository.findRegionIdsByUserId(actor.userId());
        String roleName = extractRoleName(user);
        return toUserResponse(user, roleName, regionIds);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Checks that the password contains at least one letter and one digit.
     */
    private boolean hasLetterAndDigit(String password) {
        boolean hasLetter = false;
        boolean hasDigit = false;
        for (char c : password.toCharArray()) {
            if (Character.isLetter(c)) hasLetter = true;
            if (Character.isDigit(c)) hasDigit = true;
        }
        return hasLetter && hasDigit;
    }

    /**
     * Extracts the single role name from the user's role set (D-15).
     */
    private String extractRoleName(AppUser user) {
        if (user.getUserRoles() == null || user.getUserRoles().isEmpty()) {
            return null;
        }
        return user.getUserRoles().stream()
                .findFirst()
                .map(ur -> ur.getRole().getName())
                .orElse(null);
    }

    /**
     * Builds a {@link UserResponse} from the entity, role name, and region IDs.
     * Never includes password or hash fields (AC-AUTH-01.1).
     */
    private UserResponse toUserResponse(AppUser user, String roleName, List<Long> regionIds) {
        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                user.getActive(),
                roleName,
                regionIds,
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }
}
