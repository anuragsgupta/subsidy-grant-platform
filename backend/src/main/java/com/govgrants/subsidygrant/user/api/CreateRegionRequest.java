package com.govgrants.subsidygrant.user.api;

import com.govgrants.subsidygrant.user.domain.RegionType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Request DTO for POST /regions (AC-USR-03.2).
 * <p>
 * The {@code code} must match {@code ^[A-Z0-9_-]{2,20}$} and be unique. A
 * DISTRICT must have a STATE parent.
 *
 * REQ-USR-03
 */
public record CreateRegionRequest(
        @NotBlank
        @Pattern(regexp = "^[A-Z0-9_-]{2,20}$")
        String code,

        @NotBlank
        @Size(max = 100)
        String name,

        @NotNull
        RegionType type,

        Long parentId
) {}
