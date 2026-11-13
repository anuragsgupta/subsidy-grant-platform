package com.govgrants.subsidygrant.user.api;

import com.govgrants.subsidygrant.common.response.ApiResponse;
import com.govgrants.subsidygrant.user.service.RoleService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for role lookups (REQ-USR-02).
 *
 * <p>Roles are seeded and immutable (AC-USR-02.2); no create, update or delete
 * endpoints are exposed.
 *
 * AC-USR-02.1, AC-USR-02.2
 */
@RestController
@RequestMapping("/api/v1/roles")
public class RoleController {

    private final RoleService roleService;

    public RoleController(RoleService roleService) {
        this.roleService = roleService;
    }

    @GetMapping
    public ApiResponse<List<RoleResponse>> list() {
        List<RoleResponse> roles = roleService.listRoles();
        return ApiResponse.success("Roles retrieved", roles);
    }

    @GetMapping("/{id}")
    public ApiResponse<RoleResponse> get(@PathVariable Long id) {
        RoleResponse role = roleService.getRole(id);
        return ApiResponse.success("Role retrieved", role);
    }

    @GetMapping("/name/{name}")
    public ApiResponse<RoleResponse> getByName(@PathVariable String name) {
        RoleResponse role = roleService.getRoleByName(name);
        return ApiResponse.success("Role retrieved", role);
    }
}
