package com.govgrants.subsidygrant.user.domain;

/**
 * Supported value types for a system setting (REQ-USR-04).
 * Drives validation of the stored value string and typed accessors in
 * {@link com.govgrants.subsidygrant.user.service.SettingsCacheService}.
 */
public enum SettingValueType {
    INT,
    MONEY,
    ENUM,
    BOOL
}
