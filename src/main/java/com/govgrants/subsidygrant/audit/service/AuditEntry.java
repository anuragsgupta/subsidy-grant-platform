package com.govgrants.subsidygrant.audit.service;

import java.util.Map;

/**
 * Immutable value record passed to {@link AuditService#record(AuditEntry, com.govgrants.subsidygrant.common.domain.ActorContext)}.
 *
 * <p>Callers populate only the fields that changed in {@code oldValue} / {@code newValue}.
 * PII fields ({@code email}, {@code phone}) are masked by {@link PiiMaskingUtil} before
 * serialization. Fields such as {@code national_id_hash} and {@code bank_account_enc}
 * should never be included here — they are excluded at the source (AC-AUD-01.2).
 *
 * REQ-AUD-01, AC-AUD-01.2
 */
public record AuditEntry(
        String action,
        String entityType,
        String entityId,
        String referenceNo,           // null for non-application entities
        Map<String, Object> oldValue, // only changed fields; PII excluded at source
        Map<String, Object> newValue,
        String remark
) {}
