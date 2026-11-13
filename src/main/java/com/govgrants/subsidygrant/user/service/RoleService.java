package com.govgrants.subsidygrant.user.service;

import com.govgrants.subsidygrant.common.exception.ResourceNotFoundException;
import com.govgrants.subsidygrant.user.api.RoleResponse;
import com.govgrants.subsidygrant.user.domain.Role;
import com.govgrants.subsidygrant.user.repository.RoleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Read-only service for role lookups (REQ-USR-02).
 *
 * <p>Roles are seeded and immutable (AC-USR-02.2); this service exposes no
 * create, update or delete operations.
 *
 * REQ-USR-02
 */
@Service
@Transactional(readOnly = true)
public class RoleService {

    private final RoleRepository roleRepository;

    public RoleService(RoleRepository roleRepository) {
        this.roleRepository = roleRepository;
    }

    /**
     * Returns all roles (AC-USR-02.1).
     */
    public List<RoleResponse> listRoles() {
        return roleRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    /**
     * Returns a role by ID, or 404 if missing (AC-USR-02.1).
     */
    public RoleResponse getRole(Long id) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + id));
        return toResponse(role);
    }

    /**
     * Returns a role by name, or 404 if missing (AC-USR-02.1).
     */
    public RoleResponse getRoleByName(String name) {
        Role role = roleRepository.findByName(name)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + name));
        return toResponse(role);
    }

    private RoleResponse toResponse(Role role) {
        return new RoleResponse(
                role.getId(),
                role.getName(),
                role.getDescription(),
                role.getCreatedAt()
        );
    }
}
