package com.govgrants.subsidygrant.user.api;

import jakarta.validation.constraints.NotNull;

/**
 * Request DTO for PUT /users/{id}/role (AC-USR-01.7).
 * <p>
 * Replaces the user's single role (D-15). A 404 is returned for an unknown role.
 *
 * REQ-USR-01
 */
public record ChangeRoleRequest(
        @NotNull
        Long roleId
) {}
