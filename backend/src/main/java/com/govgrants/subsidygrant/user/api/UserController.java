package com.govgrants.subsidygrant.user.api;

import com.govgrants.subsidygrant.common.domain.ActorContext;
import com.govgrants.subsidygrant.common.exception.AccessDeniedException;
import com.govgrants.subsidygrant.common.response.ApiResponse;
import com.govgrants.subsidygrant.common.response.PagedResponse;
import com.govgrants.subsidygrant.user.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST controller for staff user management (REQ-USR-01).
 *
 * <p>All endpoints require ADMIN role. Every mutation delegates to
 * {@link UserService} which writes an audit record in the same transaction.
 *
 * AC-USR-01.1–01.9
 */
@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private static final String ACTOR_CONTEXT_ATTR = "actorContext";
    private static final int DEFAULT_PAGE = 0;
    private static final int DEFAULT_SIZE = 20;
    private static final int MAX_SIZE = 100;

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    // -------------------------------------------------------------------------
    // AC-USR-01.1, AC-USR-01.2 — Create user
    // -------------------------------------------------------------------------

    @PostMapping
    public ResponseEntity<ApiResponse<UserResponse>> create(
            @Valid @RequestBody CreateUserRequest request,
            HttpServletRequest httpRequest) {
        ActorContext actor = requireAdmin(httpRequest);
        UserResponse user = userService.createUser(request, actor);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("User created", user));
    }

    // -------------------------------------------------------------------------
    // AC-USR-01.3 — List users
    // -------------------------------------------------------------------------

    @GetMapping
    public ApiResponse<PagedResponse<UserSummaryResponse>> list(
            @RequestParam(required = false) String role,
            @RequestParam(required = false) Long regionId,
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) String q,
            @RequestParam(required = false, defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "20") int size,
            HttpServletRequest httpRequest) {
        ActorContext actor = requireAdmin(httpRequest);
        int safePage = Math.max(DEFAULT_PAGE, page);
        int safeSize = Math.min(MAX_SIZE, Math.max(1, size));
        Pageable pageable = PageRequest.of(safePage, safeSize,
                Sort.by("createdAt").ascending());
        Page<UserSummaryResponse> result = userService.listUsers(
                role, regionId, active, q, pageable, actor);
        return ApiResponse.success("Users retrieved", PagedResponse.from(result));
    }

    // -------------------------------------------------------------------------
    // AC-USR-01.3 — Get single user
    // -------------------------------------------------------------------------

    @GetMapping("/{id}")
    public ApiResponse<UserResponse> get(@PathVariable UUID id,
                                          HttpServletRequest httpRequest) {
        ActorContext actor = requireAdmin(httpRequest);
        UserResponse user = userService.getUser(id, actor);
        return ApiResponse.success("User retrieved", user);
    }

    // -------------------------------------------------------------------------
    // AC-USR-01.4 — Update user
    // -------------------------------------------------------------------------

    @PutMapping("/{id}")
    public ApiResponse<UserResponse> update(@PathVariable UUID id,
                                             @Valid @RequestBody UpdateUserRequest request,
                                             HttpServletRequest httpRequest) {
        ActorContext actor = requireAdmin(httpRequest);
        UserResponse user = userService.updateUser(id, request, actor);
        return ApiResponse.success("User updated", user);
    }

    // -------------------------------------------------------------------------
    // AC-USR-01.5 — Activate/deactivate
    // -------------------------------------------------------------------------

    @PatchMapping("/{id}/status")
    public ApiResponse<Void> setStatus(@PathVariable UUID id,
                                        @Valid @RequestBody UserStatusRequest request,
                                        HttpServletRequest httpRequest) {
        ActorContext actor = requireAdmin(httpRequest);
        userService.setStatus(id, request.active(), actor);
        return ApiResponse.success("User status updated");
    }

    // -------------------------------------------------------------------------
    // AC-USR-01.6 — Delete user
    // -------------------------------------------------------------------------

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id,
                                        HttpServletRequest httpRequest) {
        ActorContext actor = requireAdmin(httpRequest);
        userService.deleteUser(id, actor);
        return ResponseEntity.noContent().build();
    }

    // -------------------------------------------------------------------------
    // AC-USR-01.7 — Change role
    // -------------------------------------------------------------------------

    @PutMapping("/{id}/role")
    public ApiResponse<UserResponse> changeRole(@PathVariable UUID id,
                                                 @Valid @RequestBody ChangeRoleRequest request,
                                                 HttpServletRequest httpRequest) {
        ActorContext actor = requireAdmin(httpRequest);
        UserResponse user = userService.changeRole(id, request, actor);
        return ApiResponse.success("User role updated", user);
    }

    // -------------------------------------------------------------------------
    // AC-USR-01.8 — Change regions
    // -------------------------------------------------------------------------

    @PutMapping("/{id}/regions")
    public ApiResponse<UserResponse> changeRegions(@PathVariable UUID id,
                                                    @Valid @RequestBody ChangeRegionsRequest request,
                                                    HttpServletRequest httpRequest) {
        ActorContext actor = requireAdmin(httpRequest);
        UserResponse user = userService.changeRegions(id, request, actor);
        return ApiResponse.success("User regions updated", user);
    }

    // -------------------------------------------------------------------------
    // AC-USR-01.9 — Get user roles
    // -------------------------------------------------------------------------

    @GetMapping("/{id}/roles")
    public ApiResponse<List<RoleResponse>> getRoles(@PathVariable UUID id,
                                                      HttpServletRequest httpRequest) {
        ActorContext actor = requireAdmin(httpRequest);
        List<RoleResponse> roles = userService.getUserRoles(id, actor);
        return ApiResponse.success("User roles retrieved", roles);
    }

    // -------------------------------------------------------------------------
    // Helper
    // -------------------------------------------------------------------------

    /**
     * Extracts the ActorContext from the request and verifies the caller is
     * an ADMIN. Throws {@link AccessDeniedException} otherwise.
     */
    private ActorContext requireAdmin(HttpServletRequest request) {
        ActorContext actor = (ActorContext) request.getAttribute(ACTOR_CONTEXT_ATTR);
        if (actor == null || !actor.hasRole("ADMIN")) {
            throw new AccessDeniedException("Only ADMIN may manage users");
        }
        return actor;
    }
}
