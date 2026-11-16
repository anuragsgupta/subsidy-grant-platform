package com.govgrants.subsidygrant.user.api;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Response DTO for user profile data (AC-AUTH-03.4, AC-USR-01.1).
 * <p>
 * Never includes password/hash fields. The {@code role} field carries the
 * single assigned role name (D-15).
 *
 * REQ-AUTH-03, REQ-USR-01
 */
public record UserResponse(
        UUID id,
        String username,
        String fullName,
        String email,
        String phone,
        Boolean active,
        String role,
        List<Long> regionIds,
        Instant createdAt,
        Instant updatedAt
) {}
