package com.govgrants.subsidygrant.user.service;

import com.govgrants.subsidygrant.common.exception.ResourceNotFoundException;
import com.govgrants.subsidygrant.user.domain.SettingValueType;
import com.govgrants.subsidygrant.user.domain.SystemSetting;
import com.govgrants.subsidygrant.user.repository.SystemSettingRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

/**
 * Unit tests for SettingsCacheService — Mockito, real Caffeine cache.
 * REQ-USR-04 / AC-USR-04.3
 */
@ExtendWith(MockitoExtension.class)
class SettingsCacheServiceTest {

    @Mock
    SystemSettingRepository settingRepository;

    SettingsCacheService settingsCacheService;

    @BeforeEach
    void setUp() {
        // Use the real constructor — it creates a real Caffeine cache
        settingsCacheService = new SettingsCacheService(settingRepository);
    }

    private SystemSetting setting(String key, String value, SettingValueType type) {
        return SystemSetting.builder()
                .key(key)
                .value(value)
                .valueType(type)
                .build();
    }

    // -------------------------------------------------------------------------
    // Cache hit/miss behaviour
    // -------------------------------------------------------------------------

    @Test
    void returnsValueFromCacheOnSecondCall_doesNotHitRepo() {
        when(settingRepository.findById("auth.maxFailedLogins"))
                .thenReturn(Optional.of(setting("auth.maxFailedLogins", "5", SettingValueType.INT)));

        // First call loads from repo
        String v1 = settingsCacheService.getValue("auth.maxFailedLogins");
        // Second call must use the cache — repo called only once
        String v2 = settingsCacheService.getValue("auth.maxFailedLogins");

        assertThat(v1).isEqualTo("5");
        assertThat(v2).isEqualTo("5");
        verify(settingRepository, times(1)).findById("auth.maxFailedLogins");
    }

    @Test
    void evictsCacheOnUpdate_nextCallHitsRepository() {
        when(settingRepository.findById("auth.lockMinutes"))
                .thenReturn(Optional.of(setting("auth.lockMinutes", "15", SettingValueType.INT)));

        // Warm cache
        settingsCacheService.getValue("auth.lockMinutes");

        // Evict (simulates a PUT /settings call)
        settingsCacheService.evict("auth.lockMinutes");

        // Repo returns updated value next time
        when(settingRepository.findById("auth.lockMinutes"))
                .thenReturn(Optional.of(setting("auth.lockMinutes", "30", SettingValueType.INT)));

        String updated = settingsCacheService.getValue("auth.lockMinutes");
        assertThat(updated).isEqualTo("30");
        // Repository must have been called twice total (once before evict, once after)
        verify(settingRepository, times(2)).findById("auth.lockMinutes");
    }

    // -------------------------------------------------------------------------
    // Typed accessors
    // -------------------------------------------------------------------------

    @Test
    void getInt_parsesIntValue() {
        when(settingRepository.findById("auth.maxFailedLogins"))
                .thenReturn(Optional.of(setting("auth.maxFailedLogins", "5", SettingValueType.INT)));

        int value = settingsCacheService.getInt("auth.maxFailedLogins");
        assertThat(value).isEqualTo(5);
    }

    @Test
    void getMoney_parsesBigDecimalValue() {
        when(settingRepository.findById("disburse.maxAmount"))
                .thenReturn(Optional.of(setting("disburse.maxAmount", "9999.99", SettingValueType.MONEY)));

        BigDecimal value = settingsCacheService.getMoney("disburse.maxAmount");
        assertThat(value).isEqualByComparingTo(new BigDecimal("9999.99"));
    }

    @Test
    void getBool_parsesBooleanValue() {
        when(settingRepository.findById("feature.autoApprove"))
                .thenReturn(Optional.of(setting("feature.autoApprove", "true", SettingValueType.BOOL)));

        boolean value = settingsCacheService.getBool("feature.autoApprove");
        assertThat(value).isTrue();
    }

    // -------------------------------------------------------------------------
    // Missing key
    // -------------------------------------------------------------------------

    @Test
    void throwsResourceNotFoundOnUnknownKey() {
        when(settingRepository.findById("nonexistent.key")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> settingsCacheService.getValue("nonexistent.key"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("nonexistent.key");
    }
}
