package com.govgrants.subsidygrant.user.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request DTO for PUT /regions/{id} (AC-USR-03.2).
 * <p>
 * Only {@code name} is editable; the code and type are immutable after creation.
 *
 * REQ-USR-03
 */
public record UpdateRegionRequest(
        @NotBlank
        @Size(max = 100)
        String name
) {}
