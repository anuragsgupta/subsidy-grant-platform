package com.govgrants.subsidygrant.user.service;

import com.govgrants.subsidygrant.audit.repository.AuditLogRepository;
import com.govgrants.subsidygrant.audit.service.AuditService;
import com.govgrants.subsidygrant.auth.domain.AppUser;
import com.govgrants.subsidygrant.auth.repository.AppUserRepository;
import com.govgrants.subsidygrant.auth.service.UserStatusCache;
import com.govgrants.subsidygrant.common.domain.ActorContext;
import com.govgrants.subsidygrant.common.exception.BusinessRuleException;
import com.govgrants.subsidygrant.common.exception.ResourceInUseException;
import com.govgrants.subsidygrant.user.api.ChangeRegionsRequest;
import com.govgrants.subsidygrant.user.api.ChangeRoleRequest;
import com.govgrants.subsidygrant.user.domain.Region;
import com.govgrants.subsidygrant.user.domain.RegionType;
import com.govgrants.subsidygrant.user.domain.Role;
import com.govgrants.subsidygrant.user.domain.UserRole;
import com.govgrants.subsidygrant.user.domain.UserRoleId;
import com.govgrants.subsidygrant.user.repository.RegionRepository;
import com.govgrants.subsidygrant.user.repository.RoleRepository;
import com.govgrants.subsidygrant.user.repository.UserRegionRepository;
import com.govgrants.subsidygrant.user.repository.UserRoleRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for UserService — Mockito only, no Spring context.
 * REQ-USR-01 / AC-USR-01.2, AC-USR-01.5, AC-USR-01.6, AC-USR-01.7, AC-USR-01.8
 */
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock AppUserRepository userRepository;
    @Mock RoleRepository roleRepository;
    @Mock UserRoleRepository userRoleRepository;
    @Mock UserRegionRepository userRegionRepository;
    @Mock RegionRepository regionRepository;
    @Mock AuditService auditService;
    @Mock AuditLogRepository auditLogRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock UserStatusCache userStatusCache;

    @InjectMocks
    UserService userService;

    private ActorContext adminActor(UUID adminId) {
        return new ActorContext(adminId, "ADMIN", List.of(), null, null);
    }

    private AppUser buildUserWithRole(UUID userId, String roleName) {
        Role role = Role.builder()
                .id(1L)
                .name(roleName)
                .build();
        AppUser user = AppUser.builder()
                .id(userId)
                .username("user1")
                .fullName("User One")
                .email("user1@example.com")
                .active(true)
                .build();
        UserRole ur = UserRole.builder()
                .id(UserRoleId.builder()
                        .userId(userId)
                        .roleId(role.getId())
                        .build())
                .user(user)
                .role(role)
                .build();
        Set<UserRole> roles = new HashSet<>();
        roles.add(ur);
        user.setUserRoles(roles);
        return user;
    }

    // -------------------------------------------------------------------------
    // AC-USR-01.5 — Admin cannot deactivate themselves
    // -------------------------------------------------------------------------

    @Test
    void AC_USR_01_5_throwsWhenAdminDeactivatesThemself() {
        UUID adminId = UUID.randomUUID();
        AppUser admin = buildUserWithRole(adminId, "ADMIN");
        when(userRepository.findById(adminId)).thenReturn(Optional.of(admin));

        ActorContext actor = adminActor(adminId);

        assertThatThrownBy(() -> userService.setStatus(adminId, false, actor))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("deactivate");
    }

    // -------------------------------------------------------------------------
    // AC-USR-01.7 — Role cannot change while active field pending assignments
    // -------------------------------------------------------------------------

    @Test
    void AC_USR_01_7_throwsWhenRoleChangedWithActiveFieldPendingAssignments() {
        UUID userId = UUID.randomUUID();
        AppUser user = buildUserWithRole(userId, "FIELD_OFFICER");
        Role newRole = Role.builder().id(2L).name("DISTRICT_OFFICER").build();

        when(userRepository.findByIdWithRoles(userId)).thenReturn(Optional.of(user));
        when(roleRepository.findById(2L)).thenReturn(Optional.of(newRole));
        when(userRegionRepository.countActiveFieldPendingByOfficer(userId)).thenReturn(1L);

        assertThatThrownBy(() -> userService.changeRole(userId, new ChangeRoleRequest(2L), adminActor(UUID.randomUUID())))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("workflow");
    }

    // -------------------------------------------------------------------------
    // AC-USR-01.8 — Regions cannot change while active field pending assignments
    // -------------------------------------------------------------------------

    @Test
    void AC_USR_01_8_throwsWhenRegionsChangedWithActiveFieldPendingAssignments() {
        UUID userId = UUID.randomUUID();
        AppUser user = buildUserWithRole(userId, "FIELD_OFFICER");

        when(userRepository.findByIdWithRoles(userId)).thenReturn(Optional.of(user));
        when(userRegionRepository.countActiveFieldPendingByOfficer(userId)).thenReturn(2L);

        assertThatThrownBy(() ->
                userService.changeRegions(userId, new ChangeRegionsRequest(List.of(10L)), adminActor(UUID.randomUUID())))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("field");
    }

    // -------------------------------------------------------------------------
    // AC-USR-01.6 — Cannot delete user who has audit references
    // -------------------------------------------------------------------------

    @Test
    void AC_USR_01_6_throwsResourceInUseWhenUserHasAuditReferences() {
        UUID userId = UUID.randomUUID();
        AppUser user = buildUserWithRole(userId, "FIELD_OFFICER");

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(auditLogRepository.countByActorId(userId)).thenReturn(3L);

        assertThatThrownBy(() -> userService.deleteUser(userId, adminActor(UUID.randomUUID())))
                .isInstanceOf(ResourceInUseException.class);
    }

    // -------------------------------------------------------------------------
    // AC-USR-01.2 — Invalid region binding: FIELD_OFFICER with no district
    // -------------------------------------------------------------------------

    @Test
    void AC_USR_01_2_throwsOnInvalidRegionBinding_fieldOfficerNoDistrict() {
        UUID userId = UUID.randomUUID();
        AppUser user = buildUserWithRole(userId, "FIELD_OFFICER");

        when(userRepository.findByIdWithRoles(userId)).thenReturn(Optional.of(user));
        // No active field pending assignments
        when(userRegionRepository.countActiveFieldPendingByOfficer(userId)).thenReturn(0L);

        // Pass empty list — FIELD_OFFICER must have exactly 1 district
        assertThatThrownBy(() ->
                userService.changeRegions(userId, new ChangeRegionsRequest(List.of()), adminActor(UUID.randomUUID())))
                .isInstanceOf(BusinessRuleException.class)
                .satisfies(e -> {
                    BusinessRuleException bre = (BusinessRuleException) e;
                    assertThat(bre.getErrorCode()).isEqualTo("INVALID_REGION_BINDING");
                    assertThat(bre.getMessage()).containsIgnoringCase("district");
                });
    }

    @Test
    void AC_USR_01_2_throwsOnInvalidRegionBinding_districtOfficerMultipleDistricts() {
        UUID userId = UUID.randomUUID();
        AppUser user = buildUserWithRole(userId, "DISTRICT_OFFICER");

        when(userRepository.findByIdWithRoles(userId)).thenReturn(Optional.of(user));

        // Passing two region IDs violates the "exactly one district" rule for DISTRICT_OFFICER
        assertThatThrownBy(() ->
                userService.changeRegions(userId, new ChangeRegionsRequest(List.of(1L, 2L)), adminActor(UUID.randomUUID())))
                .isInstanceOf(BusinessRuleException.class)
                .satisfies(e -> {
                    BusinessRuleException bre = (BusinessRuleException) e;
                    assertThat(bre.getErrorCode()).isEqualTo("INVALID_REGION_BINDING");
                    assertThat(bre.getMessage()).containsIgnoringCase("district");
                });
    }
}
