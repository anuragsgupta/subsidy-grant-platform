package com.govgrants.subsidygrant.user.api;

import java.time.Instant;

/**
 * Response DTO for role lookups (AC-USR-02.1).
 * <p>
 * Roles are seeded and immutable (AC-USR-02.2); this DTO is read-only.
 *
 * REQ-USR-02
 */
public record RoleResponse(
        Long id,
        String name,
        String description,
        Instant createdAt
) {}
