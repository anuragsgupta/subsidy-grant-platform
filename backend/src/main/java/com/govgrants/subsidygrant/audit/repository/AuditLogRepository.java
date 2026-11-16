package com.govgrants.subsidygrant.audit.repository;

import com.govgrants.subsidygrant.audit.domain.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.UUID;

/**
 * Repository for the immutable {@link AuditLog} entity.
 *
 * <p>{@link JpaSpecificationExecutor} enables the dynamic filtered query used by
 * {@code GET /api/v1/audit} (REQ-AUD-03). No custom delete or update methods are
 * provided — the entity is append-only (D-17, INV-08).
 *
 * REQ-AUD-01, REQ-AUD-03, D-17
 */
@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long>, JpaSpecificationExecutor<AuditLog> {

    // Spring Data provides findAll(Specification, Pageable) automatically.

    /**
     * Counts audit log entries where the actor is the given user.
     * Used by {@code deleteUser} to prevent deletion of users with audit history (D-14).
     */
    long countByActorId(UUID actorId);
}
