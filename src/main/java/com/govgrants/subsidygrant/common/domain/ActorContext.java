package com.govgrants.subsidygrant.common.domain;

import java.util.List;
import java.util.UUID;

/**
 * Immutable context for the current actor (user, system job, or API client).
 * Passed into service methods instead of reading the HTTP request directly,
 * so services can be reused by scheduled jobs and future API integrations.
 *
 * REQ-AUD-01, AC-AUD-01.3
 */
public record ActorContext(
        UUID userId,
        String role,
        List<Long> regionIds,
        String correlationId,
        String ipAddress
) {

    /** Returns true if this actor has the given role name. */
    public boolean hasRole(String roleName) {
        return role != null && role.equalsIgnoreCase(roleName);
    }

    /**
     * Factory for system-initiated entries (scheduled jobs, outbox dispatcher, etc.).
     * userId is null; role is "SYSTEM".
     */
    public static ActorContext system(String correlationId) {
        return new ActorContext(null, "SYSTEM", List.of(), correlationId, null);
    }
}
