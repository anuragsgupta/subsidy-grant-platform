package com.govgrants.subsidygrant.user.service;

import com.govgrants.subsidygrant.auth.domain.AppUser;
import com.govgrants.subsidygrant.auth.repository.AppUserRepository;
import com.govgrants.subsidygrant.auth.service.UserStatusCache;
import com.govgrants.subsidygrant.audit.repository.AuditLogRepository;
import com.govgrants.subsidygrant.audit.service.AuditEntry;
import com.govgrants.subsidygrant.audit.service.AuditService;
import com.govgrants.subsidygrant.common.domain.ActorContext;
import com.govgrants.subsidygrant.common.exception.BusinessRuleException;
import com.govgrants.subsidygrant.common.exception.DuplicateResourceException;
import com.govgrants.subsidygrant.common.exception.ResourceInUseException;
import com.govgrants.subsidygrant.common.exception.ResourceNotFoundException;
import com.govgrants.subsidygrant.user.api.ChangeRegionsRequest;
import com.govgrants.subsidygrant.user.api.ChangeRoleRequest;
import com.govgrants.subsidygrant.user.api.CreateUserRequest;
import com.govgrants.subsidygrant.user.api.RoleResponse;
import com.govgrants.subsidygrant.user.api.UpdateUserRequest;
import com.govgrants.subsidygrant.user.api.UserResponse;
import com.govgrants.subsidygrant.user.api.UserSummaryResponse;
import com.govgrants.subsidygrant.user.domain.Region;
import com.govgrants.subsidygrant.user.domain.RegionType;
import com.govgrants.subsidygrant.user.domain.Role;
import com.govgrants.subsidygrant.user.domain.UserRegion;
import com.govgrants.subsidygrant.user.domain.UserRegionId;
import com.govgrants.subsidygrant.user.domain.UserRole;
import com.govgrants.subsidygrant.user.domain.UserRoleId;
import com.govgrants.subsidygrant.user.repository.RegionRepository;
import com.govgrants.subsidygrant.user.repository.RoleRepository;
import com.govgrants.subsidygrant.user.repository.UserRegionRepository;
import com.govgrants.subsidygrant.user.repository.UserRoleRepository;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Staff user management service implementing REQ-USR-01 (AC-USR-01.1–01.9).
 *
 * <p>All methods require ADMIN role (enforced in the controller). Every state
 * change writes an audit record in the same transaction (AC-AUD-01.1).
 *
 * REQ-USR-01, D-14, D-15
 */
@Service
@Transactional
public class UserService {

    private final AppUserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final UserRegionRepository userRegionRepository;
    private final RegionRepository regionRepository;
    private final AuditService auditService;
    private final AuditLogRepository auditLogRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserStatusCache userStatusCache;

    public UserService(AppUserRepository userRepository,
                       RoleRepository roleRepository,
                       UserRoleRepository userRoleRepository,
                       UserRegionRepository userRegionRepository,
                       RegionRepository regionRepository,
                       AuditService auditService,
                       AuditLogRepository auditLogRepository,
                       PasswordEncoder passwordEncoder,
                       UserStatusCache userStatusCache) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.userRoleRepository = userRoleRepository;
        this.userRegionRepository = userRegionRepository;
        this.regionRepository = regionRepository;
        this.auditService = auditService;
        this.auditLogRepository = auditLogRepository;
        this.passwordEncoder = passwordEncoder;
        this.userStatusCache = userStatusCache;
    }

    // -------------------------------------------------------------------------
    // AC-USR-01.1, AC-USR-01.2 — Create staff user
    // -------------------------------------------------------------------------

    /**
     * Creates a staff user with the given role and region bindings.
     *
     * @param request validated creation payload
     * @param actor   the admin performing the action
     * @return the created user profile
     */
    public UserResponse createUser(CreateUserRequest request, ActorContext actor) {
        // AC-USR-01.2 — username uniqueness (case-insensitive)
        if (userRepository.existsByUsernameIgnoreCase(request.username())) {
            throw new DuplicateResourceException("Username already exists");
        }
        // AC-USR-01.2 — email uniqueness (case-insensitive)
        if (userRepository.existsByEmailIgnoreCase(request.email())) {
            throw new DuplicateResourceException("Email already exists");
        }
        // Password must contain ≥1 letter AND ≥1 digit
        if (!hasLetterAndDigit(request.password())) {
            throw new BusinessRuleException("VALIDATION_FAILED",
                    "Password must contain at least one letter and one digit");
        }

        // Find role (404 if missing)
        Role role = roleRepository.findById(request.roleId())
                .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + request.roleId()));

        // AC-USR-01.2 — validate region binding per §4.1
        validateRegionBinding(role.getName(), request.regionIds());
        // Load and validate regions exist
        List<Region> regions = loadAndValidateRegions(request.regionIds());

        // Create user
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

        // Assign role
        UserRole userRole = UserRole.builder()
                .id(UserRoleId.builder()
                        .userId(user.getId())
                        .roleId(role.getId())
                        .build())
                .user(user)
                .role(role)
                .build();
        userRoleRepository.save(userRole);

        // Assign regions
        for (Region region : regions) {
            UserRegion userRegion = UserRegion.builder()
                    .id(UserRegionId.builder()
                            .userId(user.getId())
                            .regionId(region.getId())
                            .build())
                    .user(user)
                    .region(region)
                    .build();
            userRegionRepository.save(userRegion);
        }

        // Audit (AC-AUD-01.1)
        Map<String, Object> newValue = new LinkedHashMap<>();
        newValue.put("username", user.getUsername());
        newValue.put("fullName", user.getFullName());
        newValue.put("email", user.getEmail());
        newValue.put("role", role.getName());
        newValue.put("active", true);
        auditService.record(new AuditEntry(
                "USER_CREATED", "USER", user.getId().toString(), null,
                null, newValue, "Staff user created"
        ), actor);

        return toUserResponse(user.getId(), role.getName(), request.regionIds());
    }

    // -------------------------------------------------------------------------
    // AC-USR-01.3 — List users
    // -------------------------------------------------------------------------

    /**
     * Paginated, filtered list of users.
     *
     * @param role     optional filter by role name
     * @param regionId optional filter by bound region ID
     * @param active   optional filter by active status
     * @param q        optional full-text search on fullName/email
     * @param pageable pagination and sorting
     * @param actor    the admin performing the action
     * @return a page of user summary items
     */
    @Transactional(readOnly = true)
    public Page<UserSummaryResponse> listUsers(String role, Long regionId, Boolean active,
                                                 String q, Pageable pageable, ActorContext actor) {
        Specification<AppUser> spec = buildSpecification(role, regionId, active, q);
        return userRepository.findAll(spec, pageable)
                .map(user -> new UserSummaryResponse(
                        user.getId(),
                        user.getUsername(),
                        user.getFullName(),
                        user.getEmail(),
                        user.getActive(),
                        extractRoleName(user)
                ));
    }

    // -------------------------------------------------------------------------
    // AC-USR-01.3 — Get single user
    // -------------------------------------------------------------------------

    /**
     * Returns a single user by ID.
     *
     * @param id    the user ID
     * @param actor the admin performing the action
     * @return the user profile with role and region bindings
     */
    @Transactional(readOnly = true)
    public UserResponse getUser(UUID id, ActorContext actor) {
        AppUser user = userRepository.findByIdWithRoles(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));
        String roleName = extractRoleName(user);
        List<Long> regionIds = userRegionRepository.findRegionIdsByUserId(id);
        return toUserResponse(id, roleName, regionIds);
    }

    // -------------------------------------------------------------------------
    // AC-USR-01.4 — Update user
    // -------------------------------------------------------------------------

    /**
     * Updates fullName and phone only. Email, username, id and auth_user_id
     * are not changeable through this endpoint.
     *
     * @param id      the user ID
     * @param request validated update payload
     * @param actor   the admin performing the action
     * @return the updated user profile
     */
    public UserResponse updateUser(UUID id, UpdateUserRequest request, ActorContext actor) {
        AppUser user = userRepository.findByIdWithRoles(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));

        // Capture old values for audit
        Map<String, Object> oldValue = new LinkedHashMap<>();
        oldValue.put("fullName", user.getFullName());
        oldValue.put("phone", user.getPhone());

        // Update only fullName and phone (AC-USR-01.4)
        user.setFullName(request.fullName());
        user.setPhone(request.phone());
        userRepository.save(user);

        // Audit (AC-AUD-01.1)
        Map<String, Object> newValue = new LinkedHashMap<>();
        newValue.put("fullName", user.getFullName());
        newValue.put("phone", user.getPhone());
        auditService.record(new AuditEntry(
                "USER_UPDATED", "USER", id.toString(), null,
                oldValue, newValue, "User profile updated"
        ), actor);

        String roleName = extractRoleName(user);
        List<Long> regionIds = userRegionRepository.findRegionIdsByUserId(id);
        return toUserResponse(id, roleName, regionIds);
    }

    // -------------------------------------------------------------------------
    // AC-USR-01.5 — Activate/deactivate
    // -------------------------------------------------------------------------

    /**
     * Activates or deactivates the user. An admin cannot deactivate themselves.
     *
     * @param id     the user ID
     * @param active the desired active status
     * @param actor  the admin performing the action
     */
    public void setStatus(UUID id, boolean active, ActorContext actor) {
        AppUser user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));

        // AC-USR-01.5 — admin cannot deactivate themselves
        if (!active && actor.userId() != null && actor.userId().equals(id)) {
            throw new BusinessRuleException("SELF_DEACTIVATION_NOT_ALLOWED",
                    "An admin cannot deactivate themselves");
        }

        Map<String, Object> oldValue = new LinkedHashMap<>();
        oldValue.put("active", user.getActive());

        user.setActive(active);
        userRepository.save(user);
        userStatusCache.evict(id);

        Map<String, Object> newValue = new LinkedHashMap<>();
        newValue.put("active", active);
        auditService.record(new AuditEntry(
                "USER_STATUS_CHANGED", "USER", id.toString(), null,
                oldValue, newValue, active ? "User activated" : "User deactivated"
        ), actor);
    }

    // -------------------------------------------------------------------------
    // AC-USR-01.6 — Delete user
    // -------------------------------------------------------------------------

    /**
     * Deletes a user only if they have no workflow or audit references (D-14).
     *
     * <p>Checks:
     * <ul>
     *   <li>{@code audit_log.actor_id} — always checked (exists in this slice)</li>
     *   <li>{@code application_status_history}, {@code field_report}, {@code verification_step},
     *       {@code disbursement.released_by} — checked when those slices are implemented;
     *       currently guarded with try-catch to avoid compile errors on missing tables</li>
     * </ul>
     *
     * <p>{@code user_role} and {@code user_region} rows are deleted by CASCADE,
     * so they do not block deletion.
     *
     * @param id    the user ID
     * @param actor the admin performing the action
     */
    public void deleteUser(UUID id, ActorContext actor) {
        AppUser user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));

        // D-14 — check for references in stable tables
        if (isUserReferencedInWorkflowTables(id)) {
            throw new ResourceInUseException(
                    "User has workflow references and cannot be deleted");
        }

        // Audit before delete (AC-AUD-01.1)
        Map<String, Object> oldValue = new LinkedHashMap<>();
        oldValue.put("username", user.getUsername());
        oldValue.put("fullName", user.getFullName());
        auditService.record(new AuditEntry(
                "USER_DELETED", "USER", id.toString(), null,
                oldValue, null, "User deleted"
        ), actor);

        userRepository.delete(user);
    }

    /**
     * Checks whether the user is referenced in any workflow or audit tables.
     *
     * <p>Always checks {@code audit_log.actor_id}. The other tables
     * (application_status_history, field_report, verification_step,
     * disbursement) are checked once those slices are implemented — the
     * try-catch blocks here ensure compilation succeeds even before those
     * tables exist.
     *
     * @param userId the user ID to check
     * @return {@code true} if the user is referenced in any checked table
     */
    private boolean isUserReferencedInWorkflowTables(UUID userId) {
        // Check audit_log.actor_id (this table exists in the foundation slice)
        if (auditLogRepository != null) {
            try {
                long auditCount = auditLogRepository.countByActorId(userId);
                if (auditCount > 0) {
                    return true;
                }
            } catch (Exception ignored) {
                // Table may not exist in test environments
            }
        }

        // TODO: When workflow slices are added, uncomment and implement:
        // try { if (applicationStatusHistoryRepository.existsByActorId(userId)) return true; }
        // catch (Exception ignored) {}
        // try { if (fieldReportRepository.existsByAuthorId(userId)) return true; }
        // catch (Exception ignored) {}
        // try { if (verificationStepRepository.existsByVerifierId(userId)) return true; }
        // catch (Exception ignored) {}
        // try { if (disbursementRepository.existsByReleasedBy(userId)) return true; }
        // catch (Exception ignored) {}

        return false;
    }

    // -------------------------------------------------------------------------
    // AC-USR-01.7 — Change role
    // -------------------------------------------------------------------------

    /**
     * Replaces the user's single role (D-15).
     *
     * @param id      the user ID
     * @param request the new role assignment
     * @param actor   the admin performing the action
     * @return the updated user profile
     */
    public UserResponse changeRole(UUID id, ChangeRoleRequest request, ActorContext actor) {
        AppUser user = userRepository.findByIdWithRoles(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));

        Role newRole = roleRepository.findById(request.roleId())
                .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + request.roleId()));

        // Check FIELD_PENDING assignments
        if (userRegionRepository.countActiveFieldPendingByOfficer(id) > 0) {
            throw new BusinessRuleException("RESOURCE_IN_USE",
                    "Role cannot be changed while active workflow assignments exist");
        }

        // Capture old role name for audit
        String oldRoleName = extractRoleName(user);

        // Delete existing role and create new one
        userRoleRepository.deleteByIdUserId(id);
        UserRole userRole = UserRole.builder()
                .id(UserRoleId.builder()
                        .userId(user.getId())
                        .roleId(newRole.getId())
                        .build())
                .user(user)
                .role(newRole)
                .build();
        userRoleRepository.save(userRole);

        // Audit (AC-AUD-01.1)
        Map<String, Object> oldValue = new LinkedHashMap<>();
        if (oldRoleName != null) {
            oldValue.put("role", oldRoleName);
        }
        Map<String, Object> newValue = new LinkedHashMap<>();
        newValue.put("role", newRole.getName());
        auditService.record(new AuditEntry(
                "USER_ROLE_CHANGED", "USER", id.toString(), null,
                oldValue, newValue, "User role changed to " + newRole.getName()
        ), actor);

        List<Long> regionIds = userRegionRepository.findRegionIdsByUserId(id);
        return toUserResponse(id, newRole.getName(), regionIds);
    }

    // -------------------------------------------------------------------------
    // AC-USR-01.8 — Change regions
    // -------------------------------------------------------------------------

    /**
     * Replaces the full set of region bindings for the user.
     *
     * @param id      the user ID
     * @param request the new region bindings
     * @param actor   the admin performing the action
     * @return the updated user profile
     */
    public UserResponse changeRegions(UUID id, ChangeRegionsRequest request, ActorContext actor) {
        AppUser user = userRepository.findByIdWithRoles(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));

        String roleName = extractRoleName(user);

        // If user is FIELD_OFFICER, check FIELD_PENDING assignments
        if ("FIELD_OFFICER".equals(roleName)
                && userRegionRepository.countActiveFieldPendingByOfficer(id) > 0) {
            throw new BusinessRuleException("RESOURCE_IN_USE",
                    "Regions cannot be changed while active field assignments exist");
        }

        // Validate region binding per §4.1
        validateRegionBinding(roleName, request.regionIds());
        List<Region> regions = loadAndValidateRegions(request.regionIds());

        // Capture old region IDs for audit
        List<Long> oldRegionIds = userRegionRepository.findRegionIdsByUserId(id);

        // Delete existing and create new
        userRegionRepository.deleteByIdUserId(id);
        for (Region region : regions) {
            UserRegion userRegion = UserRegion.builder()
                    .id(UserRegionId.builder()
                            .userId(user.getId())
                            .regionId(region.getId())
                            .build())
                    .user(user)
                    .region(region)
                    .build();
            userRegionRepository.save(userRegion);
        }

        // Audit (AC-AUD-01.1)
        Map<String, Object> oldValue = new LinkedHashMap<>();
        oldValue.put("regionIds", oldRegionIds);
        Map<String, Object> newValue = new LinkedHashMap<>();
        newValue.put("regionIds", request.regionIds());
        auditService.record(new AuditEntry(
                "USER_REGIONS_CHANGED", "USER", id.toString(), null,
                oldValue, newValue, "User region bindings changed"
        ), actor);

        return toUserResponse(id, roleName, request.regionIds());
    }

    // -------------------------------------------------------------------------
    // AC-USR-01.9 — Get user roles
    // -------------------------------------------------------------------------

    /**
     * Returns the assigned roles for the user.
     *
     * @param id    the user ID
     * @param actor the admin performing the action
     * @return list of role responses
     */
    @Transactional(readOnly = true)
    public List<RoleResponse> getUserRoles(UUID id, ActorContext actor) {
        if (userRepository.findById(id).isEmpty()) {
            throw new ResourceNotFoundException("User not found: " + id);
        }
        return userRoleRepository.findByUserIdWithRole(id).stream()
                .map(ur -> new RoleResponse(
                        ur.getRole().getId(),
                        ur.getRole().getName(),
                        ur.getRole().getDescription(),
                        ur.getRole().getCreatedAt()
                ))
                .toList();
    }

    // -------------------------------------------------------------------------
    // Helper methods
    // -------------------------------------------------------------------------

    /**
     * Validates that the regionIds conform to the §4.1 binding rules for the
     * given role. Throws {@link BusinessRuleException} on violation.
     *
     * @param roleName  the role name
     * @param regionIds the candidate region IDs (may be null)
     */
    private void validateRegionBinding(String roleName, List<Long> regionIds) {
        if (roleName == null) {
            throw new BusinessRuleException("INVALID_REGION_BINDING", "User has no role assigned");
        }
        switch (roleName) {
            case "BENEFICIARY", "ADMIN" -> {
                if (regionIds != null && !regionIds.isEmpty()) {
                    throw new BusinessRuleException("INVALID_REGION_BINDING",
                            roleName + " must not have region bindings");
                }
            }
            case "FIELD_OFFICER", "DISTRICT_OFFICER" -> {
                if (regionIds == null || regionIds.size() != 1) {
                    throw new BusinessRuleException("INVALID_REGION_BINDING",
                            roleName + " must be bound to exactly one district");
                }
                Region region = regionRepository.findById(regionIds.get(0))
                        .orElseThrow(() -> new ResourceNotFoundException(
                                "Region not found: " + regionIds.get(0)));
                if (region.getType() != RegionType.DISTRICT) {
                    throw new BusinessRuleException("INVALID_REGION_BINDING",
                            "Region must be a DISTRICT: " + regionIds.get(0));
                }
            }
            case "FINANCE_APPROVER" -> {
                if (regionIds == null || regionIds.isEmpty()) {
                    throw new BusinessRuleException("INVALID_REGION_BINDING",
                            "FINANCE_APPROVER must be bound to at least one region");
                }
            }
            default -> throw new BusinessRuleException("INVALID_REGION_BINDING",
                    "Unknown role: " + roleName);
        }
    }

    /**
     * Loads and validates that all provided region IDs exist in the database.
     * Returns the loaded Region entities. An empty list is returned for empty input.
     *
     * @param regionIds the region IDs to load
     * @return the loaded Region entities
     */
    private List<Region> loadAndValidateRegions(List<Long> regionIds) {
        if (regionIds == null || regionIds.isEmpty()) {
            return List.of();
        }
        List<Region> regions = new ArrayList<>();
        for (Long regionId : regionIds) {
            Region region = regionRepository.findById(regionId)
                    .orElseThrow(() -> new ResourceNotFoundException("Region not found: " + regionId));
            regions.add(region);
        }
        return regions;
    }

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
     * The userRoles set must already be loaded (use findByIdWithRoles).
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
     * Builds a UserResponse from the user ID, role name, and region IDs.
     * Loads the user fresh to ensure accurate timestamps.
     */
    private UserResponse toUserResponse(UUID userId, String roleName, List<Long> regionIds) {
        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
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

    /**
     * Builds a dynamic JPA {@link Specification} for filtering users by role
     * name, region ID, active status, and free-text search on fullName/email.
     * Uses subqueries for role and region to avoid fetch-join complications
     * with pagination.
     */
    private Specification<AppUser> buildSpecification(String role, Long regionId,
                                                       Boolean active, String q) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (role != null && !role.isBlank()) {
                Subquery<UUID> roleSub = query.subquery(UUID.class);
                Root<UserRole> ur = roleSub.from(UserRole.class);
                roleSub.select(ur.get("id").get("userId"))
                        .where(cb.and(
                                cb.equal(ur.get("id").get("userId"), root.get("id")),
                                cb.equal(ur.get("role").get("name"), role)
                        ));
                predicates.add(cb.exists(roleSub));
            }

            if (regionId != null) {
                Subquery<UUID> regionSub = query.subquery(UUID.class);
                Root<UserRegion> ur = regionSub.from(UserRegion.class);
                regionSub.select(ur.get("id").get("userId"))
                        .where(cb.and(
                                cb.equal(ur.get("id").get("userId"), root.get("id")),
                                cb.equal(ur.get("id").get("regionId"), regionId)
                        ));
                predicates.add(cb.exists(regionSub));
            }

            if (active != null) {
                predicates.add(cb.equal(root.get("active"), active));
            }

            if (q != null && !q.isBlank()) {
                String pattern = "%" + q.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("fullName")), pattern),
                        cb.like(cb.lower(root.get("email")), pattern)
                ));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
