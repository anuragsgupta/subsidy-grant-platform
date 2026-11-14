package com.govgrants.subsidygrant.user.service;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.govgrants.subsidygrant.common.exception.ResourceNotFoundException;
import com.govgrants.subsidygrant.user.domain.SystemSetting;
import com.govgrants.subsidygrant.user.repository.SystemSettingRepository;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.concurrent.TimeUnit;

/**
 * Caches system settings with a 60-second TTL (AC-USR-04.3).
 * <p>
 * Rule engines read settings at evaluation time through this service; the cache is
 * evicted on every {@code PUT /settings/{key}} so updates take effect within at most
 * the TTL window (NFR-03 / AC-USR-04.3).
 */
@Component
public class SettingsCacheService {

    private static final int TTL_SECONDS = 60;

    private final SystemSettingRepository settingRepository;
    private final Cache<String, String> cache;

    public SettingsCacheService(SystemSettingRepository settingRepository) {
        this.settingRepository = settingRepository;
        this.cache = Caffeine.newBuilder()
                .expireAfterWrite(TTL_SECONDS, TimeUnit.SECONDS)
                .build();
    }

    /**
     * Returns the raw string value for the given setting key, loading it from the
     * repository on a cache miss. Throws {@link ResourceNotFoundException} when the
     * setting does not exist.
     */
    public String getValue(String key) {
        String cached = cache.getIfPresent(key);
        if (cached != null) {
            return cached;
        }
        SystemSetting setting = settingRepository.findById(key)
                .orElseThrow(() -> new ResourceNotFoundException("System setting not found: " + key));
        String value = setting.getValue();
        cache.put(key, value);
        return value;
    }

    /**
     * Returns the setting value as an {@code int}.
     */
    public int getInt(String key) {
        return Integer.parseInt(getValue(key));
    }

    /**
     * Returns the setting value as a {@link BigDecimal} with scale 2 and
     * {@link RoundingMode#HALF_UP}, matching the project money convention.
     */
    public BigDecimal getMoney(String key) {
        return new BigDecimal(getValue(key)).setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Returns the setting value as a {@code boolean}.
     */
    public boolean getBool(String key) {
        return Boolean.parseBoolean(getValue(key));
    }

    /**
     * Evicts the cached value for the given key. Called after every
     * {@code PUT /settings/{key}} so the next read reloads the fresh value.
     */
    public void evict(String key) {
        cache.invalidate(key);
    }
}
