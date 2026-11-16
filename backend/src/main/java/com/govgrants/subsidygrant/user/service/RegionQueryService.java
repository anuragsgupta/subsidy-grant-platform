package com.govgrants.subsidygrant.user.service;

import com.govgrants.subsidygrant.user.domain.Region;

import java.util.List;

/**
 * Cross-slice query interface for region hierarchy data (requirements §10).
 * <p>
 * Consumed by modules that need to resolve region scope (BR-SOD-3) or check
 * ancestry without depending on the {@code user} repository directly.
 */
public interface RegionQueryService {

    /** Returns the region or throws {@code ResourceNotFoundException}. */
    Region getById(Long regionId);

    /** Returns true if {@code regionId} is a descendant of (or equal to) {@code ancestorId}. */
    boolean isDescendantOf(Long regionId, Long ancestorId);

    /** Returns all descendant region IDs including the root itself (recursive CTE). */
    List<Long> getDescendantIds(Long regionId);
}
