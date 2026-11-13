package com.govgrants.subsidygrant.user.api;

import jakarta.validation.constraints.NotNull;

import java.util.List;

/**
 * Request DTO for PUT /users/{id}/regions (AC-USR-01.8).
 * <p>
 * Replaces the full set of region bindings for the user, validated per §4.1.
 *
 * REQ-USR-01
 */
public record ChangeRegionsRequest(
        @NotNull
        List<Long> regionIds
) {}
