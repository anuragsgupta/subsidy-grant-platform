package com.govgrants.subsidygrant.audit.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.govgrants.subsidygrant.audit.api.AuditLogResponse;
import com.govgrants.subsidygrant.audit.domain.ActorType;
import com.govgrants.subsidygrant.audit.domain.AuditLog;
import com.govgrants.subsidygrant.audit.mapper.AuditMapper;
import com.govgrants.subsidygrant.audit.repository.AuditLogRepository;
import com.govgrants.subsidygrant.common.domain.ActorContext;
import org.slf4j.MDC;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Synchronous, same-transaction audit writer and paginated query service.
 *
 * <p>{@code record()} and {@code recordSystem()} persist an {@link AuditLog} row
 * in the caller's active transaction, guaranteeing that audit entries and the
 * business state change they describe are always committed together (AC-AUD-01.1).
 * PII fields in {@code oldValue} / {@code newValue} maps are masked before
 * serialization (AC-AUD-01.2).
 *
 * <p>{@code queryAudit()} builds a dynamic JPA {@link Specification} from the
 * non-null filter fields and returns results ordered by {@code occurred_at} ASC,
 * then {@code id} ASC (AC-AUD-03.1).
 *
 * REQ-AUD-01, REQ-AUD-03, D-17
 */
@Service
@Transactional
public class AuditService {

    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;
    private final AuditMapper auditMapper;

    public AuditService(AuditLogRepository auditLogRepository,
                        ObjectMapper objectMapper,
                        AuditMapper auditMapper) {
        this.auditLogRepository = auditLogRepository;
        this.objectMapper = objectMapper;
        this.auditMapper = auditMapper;
    }

    /**
     * Records an audit entry for a user-initiated action, synchronously in the
     * caller's transaction (AC-AUD-01.1).
     *
     * <p>PII fields ({@code email}, {@code phone}) in the value maps are masked
     * before serialization (AC-AUD-01.2).
     *
     * @param entry  the audit data (action, entity, changed fields)
     * @param actor  the authenticated user context (userId, role, correlationId, IP)
     */
    public void record(AuditEntry entry, ActorContext actor) {
        AuditLog log = AuditLog.builder()
                .occurredAt(java.time.Instant.now())
                .actorId(actor.userId())
                .actorRole(actor.role())
                .actorType(ActorType.USER)
                .action(entry.action())
                .entityType(entry.entityType())
                .entityId(entry.entityId())
                .referenceNo(entry.referenceNo())
                .oldValue(serializeWithMasking(entry.oldValue()))
                .newValue(serializeWithMasking(entry.newValue()))
                .remark(entry.remark())
                .correlationId(actor.correlationId())
                .ipAddress(actor.ipAddress())
                .build();
        auditLogRepository.save(log);
    }

    /**
     * Records an audit entry for a system-initiated action (scheduled jobs,
     * outbox dispatcher, etc.). The actor type is {@code SYSTEM}, actor ID is
     * null, and actor role is {@code "SYSTEM"} (AC-AUD-01.4).
     *
     * @param entry the audit data
     */
    public void recordSystem(AuditEntry entry) {
        ActorContext systemActor = ActorContext.system(MDC.get("correlationId"));
        AuditLog log = AuditLog.builder()
                .occurredAt(java.time.Instant.now())
                .actorId(null)
                .actorRole(systemActor.role())
                .actorType(ActorType.SYSTEM)
                .action(entry.action())
                .entityType(entry.entityType())
                .entityId(entry.entityId())
                .referenceNo(entry.referenceNo())
                .oldValue(serializeWithMasking(entry.oldValue()))
                .newValue(serializeWithMasking(entry.newValue()))
                .remark(entry.remark())
                .correlationId(systemActor.correlationId())
                .ipAddress(systemActor.ipAddress())
                .build();
        auditLogRepository.save(log);
    }

    /**
     * Queries audit log entries with optional filters (AC-AUD-03.1).
     *
     * <p>Results are ordered by {@code occurred_at} ASC then {@code id} ASC.
     *
     * @param filter   filter criteria (null fields are ignored)
     * @param pageable  pagination and sorting (sorting is overridden to occurred_at ASC, id ASC)
     * @return a page of {@link AuditLogResponse} records
     */
    @Transactional(readOnly = true)
    public Page<AuditLogResponse> queryAudit(AuditFilter filter, Pageable pageable) {
        Specification<AuditLog> spec = buildSpecification(filter);
        return auditLogRepository.findAll(spec, pageable)
                .map(auditMapper::toResponse);
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Builds a dynamic JPA Specification from non-null filter fields.
     */
    private Specification<AuditLog> buildSpecification(AuditFilter filter) {
        return (root, query, cb) -> {
            var predicates = new java.util.ArrayList<jakarta.persistence.criteria.Predicate>();

            if (filter.referenceNo() != null && !filter.referenceNo().isBlank()) {
                predicates.add(cb.equal(root.get("referenceNo"), filter.referenceNo()));
            }
            if (filter.entityType() != null && !filter.entityType().isBlank()) {
                predicates.add(cb.equal(root.get("entityType"), filter.entityType()));
            }
            if (filter.entityId() != null && !filter.entityId().isBlank()) {
                predicates.add(cb.equal(root.get("entityId"), filter.entityId()));
            }
            if (filter.actorId() != null) {
                predicates.add(cb.equal(root.get("actorId"), filter.actorId()));
            }
            if (filter.from() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("occurredAt"), filter.from()));
            }
            if (filter.to() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("occurredAt"), filter.to()));
            }

            // Order by occurred_at ASC, then id ASC (AC-AUD-03.1)
            query.orderBy(
                    cb.asc(root.get("occurredAt")),
                    cb.asc(root.get("id"))
            );

            return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };
    }

    /**
     * Serializes a value map to a JSON string after masking PII fields
     * (email, phone) (AC-AUD-01.2).
     *
     * @param value the map of changed fields, or null
     * @return the JSON string, or null if the input was null
     */
    private String serializeWithMasking(Map<String, Object> value) {
        if (value == null || value.isEmpty()) {
            return null;
        }
        Map<String, Object> masked = new LinkedHashMap<>(value);
        if (masked.containsKey("email")) {
            masked.put("email", PiiMaskingUtil.maskEmail(masked.get("email") != null ? masked.get("email").toString() : null));
        }
        if (masked.containsKey("phone")) {
            masked.put("phone", PiiMaskingUtil.maskPhone(masked.get("phone") != null ? masked.get("phone").toString() : null));
        }
        try {
            return objectMapper.writeValueAsString(masked);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize audit value map", e);
        }
    }
}
