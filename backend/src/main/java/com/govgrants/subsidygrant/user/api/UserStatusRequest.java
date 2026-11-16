package com.govgrants.subsidygrant.user.api;

import jakarta.validation.constraints.NotNull;

/**
 * Request DTO for PATCH /users/{id}/status (AC-USR-01.5).
 * <p>
 * A null {@code active} field is rejected with 400 — the caller must explicitly
 * state whether the user is being activated or deactivated.
 *
 * REQ-USR-01
 */
public record UserStatusRequest(
        @NotNull
        Boolean active
) {}
