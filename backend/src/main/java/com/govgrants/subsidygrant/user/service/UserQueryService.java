package com.govgrants.subsidygrant.user.service;

import com.govgrants.subsidygrant.auth.domain.AppUser;

import java.util.List;
import java.util.UUID;

/**
 * Cross-slice query interface for user data (requirements §10).
 * <p>
 * Other modules consume this interface rather than reaching into the
 * {@code user} repository directly, preserving slice boundaries.
 */
public interface UserQueryService {

    /** Returns the user or throws {@code ResourceNotFoundException}. */
    AppUser getById(UUID userId);

    /** Returns true if the user has the given role name. */
    boolean hasRole(UUID userId, String roleName);

    /** Returns the bound region IDs for the user. */
    List<Long> getRegionIds(UUID userId);
}
