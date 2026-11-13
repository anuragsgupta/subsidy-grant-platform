package com.govgrants.subsidygrant.user.api;

import jakarta.validation.constraints.NotBlank;

/**
 * Request DTO for PUT /settings/{key} (AC-USR-04.1, AC-USR-04.2).
 * <p>
 * The value is validated against the setting's {@code valueType} by the service.
 *
 * REQ-USR-04
 */
public record UpdateSettingRequest(
        @NotBlank
        String value
) {}
