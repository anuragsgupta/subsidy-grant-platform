package com.govgrants.subsidygrant.user.api;

import java.util.UUID;

/**
 * Lightweight list-item DTO for the user work queue (AC-USR-01.3).
 * <p>
 * Carries only the fields needed for the admin user list — no password, hash,
 * timestamps, or region bindings.
 *
 * REQ-USR-01
 */
public record UserSummaryResponse(
        UUID id,
        String username,
        String fullName,
        String email,
        Boolean active,
        String role
) {}
