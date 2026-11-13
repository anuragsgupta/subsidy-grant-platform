package com.govgrants.subsidygrant.user.service;

import com.govgrants.subsidygrant.audit.service.AuditEntry;
import com.govgrants.subsidygrant.audit.service.AuditService;
import com.govgrants.subsidygrant.common.domain.ActorContext;
import com.govgrants.subsidygrant.common.exception.BusinessRuleException;
import com.govgrants.subsidygrant.common.exception.ResourceNotFoundException;
import com.govgrants.subsidygrant.user.api.SettingResponse;
import com.govgrants.subsidygrant.user.api.UpdateSettingRequest;
import com.govgrants.subsidygrant.user.domain.SettingValueType;
import com.govgrants.subsidygrant.user.domain.SystemSetting;
import com.govgrants.subsidygrant.user.repository.SystemSettingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * System settings service implementing REQ-USR-04 (AC-USR-04.1–04.3).
 *
 * <p>Settings are seeded; unknown keys return 404. Values are validated against
 * the setting's {@code valueType}. Every change is audited with old and new
 * values (AC-USR-04.2) and the settings cache is evicted so the next read
 * reloads the fresh value (AC-USR-04.3).
 *
 * REQ-USR-04
 */
@Service
@Transactional
public class SettingService {

    private final SystemSettingRepository settingRepository;
    private final SettingsCacheService settingsCache;
    private final AuditService auditService;

    public SettingService(SystemSettingRepository settingRepository,
                          SettingsCacheService settingsCache,
                          AuditService auditService) {
        this.settingRepository = settingRepository;
        this.settingsCache = settingsCache;
        this.auditService = auditService;
    }

    // -------------------------------------------------------------------------
    // AC-USR-04.1 — Read settings
    // -------------------------------------------------------------------------

    /**
     * Returns all system settings.
     */
    @Transactional(readOnly = true)
    public List<SettingResponse> getAllSettings(ActorContext actor) {
        return settingRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    /**
     * Returns a single setting by key, or 404 if unknown.
     */
    @Transactional(readOnly = true)
    public SettingResponse getSetting(String key, ActorContext actor) {
        SystemSetting setting = settingRepository.findById(key)
                .orElseThrow(() -> new ResourceNotFoundException("Setting not found: " + key));
        return toResponse(setting);
    }

    // -------------------------------------------------------------------------
    // AC-USR-04.1, AC-USR-04.2 — Update setting
    // -------------------------------------------------------------------------

    /**
     * Updates a setting's value. Validates the value against the setting's
     * type, evicts the cache, and writes an audit entry with old/new values.
     *
     * @param key     the setting key
     * @param request validated update payload
     * @param actor   the admin performing the action
     * @return the updated setting
     */
    public SettingResponse updateSetting(String key, UpdateSettingRequest request, ActorContext actor) {
        SystemSetting setting = settingRepository.findById(key)
                .orElseThrow(() -> new ResourceNotFoundException("Setting not found: " + key));

        // Validate value against valueType (400 on failure)
        validateValue(request.value(), setting.getValueType());

        // Store old value for audit
        Map<String, Object> oldValue = new LinkedHashMap<>();
        oldValue.put("value", setting.getValue());

        setting.setValue(request.value());
        setting.setUpdatedBy(actor.userId());
        setting = settingRepository.save(setting);

        // Evict cache (AC-USR-04.3)
        settingsCache.evict(key);

        // Audit with old and new values (AC-USR-04.2)
        Map<String, Object> newValue = new LinkedHashMap<>();
        newValue.put("value", setting.getValue());
        auditService.record(new AuditEntry(
                "SETTING_UPDATED", "SYSTEM_SETTING", key, null,
                oldValue, newValue, "Setting '" + key + "' updated"
        ), actor);

        return toResponse(setting);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Validates that the string value conforms to the setting's value type.
     * Throws {@link BusinessRuleException} with VALIDATION_FAILED on mismatch.
     */
    private void validateValue(String value, SettingValueType valueType) {
        switch (valueType) {
            case INT -> {
                try {
                    Integer.parseInt(value);
                } catch (NumberFormatException e) {
                    throw new BusinessRuleException("VALIDATION_FAILED",
                            "Value must be a valid integer");
                }
            }
            case MONEY -> {
                try {
                    new BigDecimal(value);
                } catch (NumberFormatException e) {
                    throw new BusinessRuleException("VALIDATION_FAILED",
                            "Value must be a valid decimal number");
                }
            }
            case BOOL -> {
                if (!"true".equalsIgnoreCase(value) && !"false".equalsIgnoreCase(value)) {
                    throw new BusinessRuleException("VALIDATION_FAILED",
                            "Value must be 'true' or 'false'");
                }
            }
            case ENUM -> {
                if (value == null || value.isBlank()) {
                    throw new BusinessRuleException("VALIDATION_FAILED",
                            "Value must not be blank");
                }
            }
        }
    }

    private SettingResponse toResponse(SystemSetting setting) {
        return new SettingResponse(
                setting.getKey(),
                setting.getValue(),
                setting.getValueType(),
                setting.getDescription(),
                setting.getUpdatedBy(),
                setting.getUpdatedAt()
        );
    }
}
