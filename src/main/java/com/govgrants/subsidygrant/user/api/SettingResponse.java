package com.govgrants.subsidygrant.user.api;

import com.govgrants.subsidygrant.user.domain.SettingValueType;

import java.time.Instant;
import java.util.UUID;

/**
 * Response DTO for system settings (AC-USR-04.1).
 *
 * REQ-USR-04
 */
public record SettingResponse(
        String key,
        String value,
        SettingValueType valueType,
        String description,
        UUID updatedBy,
        Instant updatedAt
) {}
