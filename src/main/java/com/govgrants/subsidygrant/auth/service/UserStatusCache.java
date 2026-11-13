package com.govgrants.subsidygrant.auth.service;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.govgrants.subsidygrant.auth.domain.AppUser;
import com.govgrants.subsidygrant.auth.repository.AppUserRepository;
import org.springframework.stereotype.Component;

import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * Short-lived cache of user active-status lookups (AC-AUTH-03.2).
 * <p>
 * Eviction TTL of 60 seconds ensures a deactivated or deleted user is rejected
 * within at most one minute, without hitting the database on every request.
 */
@Component
public class UserStatusCache {

    private final AppUserRepository userRepository;
    private final Cache<UUID, Boolean> cache;

    public UserStatusCache(AppUserRepository userRepository) {
        this.userRepository = userRepository;
        this.cache = Caffeine.newBuilder()
                .expireAfterWrite(60, TimeUnit.SECONDS)
                .maximumSize(10_000)
                .build();
    }

    /**
     * Returns {@code true} if the user exists and is active.
     * The result is cached for 60 seconds (AC-AUTH-03.2).
     */
    public boolean isActive(UUID userId) {
        return cache.get(userId, k ->
                userRepository.findById(k)
                        .map(AppUser::getActive)
                        .orElse(false)
        );
    }

    /** Evicts the cached status for the given user (e.g. after a status change). */
    public void evict(UUID userId) {
        cache.invalidate(userId);
    }
}
