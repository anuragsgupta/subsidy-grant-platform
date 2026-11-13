package com.govgrants.subsidygrant.user.api;

import com.govgrants.subsidygrant.user.domain.RegionType;

/**
 * Response DTO for region lookups (AC-USR-03.1, AC-USR-03.2).
 *
 * REQ-USR-03
 */
public record RegionResponse(
        Long id,
        String code,
        String name,
        RegionType type,
        Long parentId
) {}
