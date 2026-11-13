package com.govgrants.subsidygrant.audit.service;

import java.time.Instant;
import java.util.UUID;

/**
 * Filter criteria for {@code GET /api/v1/audit} (REQ-AUD-03, AC-AUD-03.1).
 *
 * <p>Each field is optional; null fields are not applied as predicates in the
 * dynamic JPA Specification.
 */
public record AuditFilter(
        String referenceNo,
        String entityType,
        String entityId,
        UUID actorId,
        Instant from,
        Instant to
) {}
