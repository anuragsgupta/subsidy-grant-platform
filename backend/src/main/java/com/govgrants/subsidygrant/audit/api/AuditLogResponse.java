package com.govgrants.subsidygrant.audit.api;

import com.govgrants.subsidygrant.audit.domain.ActorType;

import java.time.Instant;
import java.util.UUID;

/**
 * Response DTO for a single audit log entry, returned by {@code GET /api/v1/audit}.
 *
 * <p>{@code oldValue} and {@code newValue} are deserialized from the JSONB
 * column and returned as generic {@link Object} (a Jackson {@code Map} or
 * {@code List} tree), so the caller receives the full structured payload.
 *
 * REQ-AUD-03, AC-AUD-03.1
 */
public record AuditLogResponse(
        Long id,
        Instant occurredAt,
        UUID actorId,
        String actorRole,
        ActorType actorType,
        String action,
        String entityType,
        String entityId,
        String referenceNo,
        Object oldValue,
        Object newValue,
        String remark,
        String correlationId,
        String ipAddress
) {}
