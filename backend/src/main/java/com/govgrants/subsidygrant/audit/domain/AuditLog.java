package com.govgrants.subsidygrant.audit.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.ColumnTransformer;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * Immutable append-only audit trail entry.
 *
 * <p>Every field has {@code updatable = false} so Hibernate never issues an UPDATE
 * against this table. Immutability is also enforced at the DB level via a trigger
 * that raises an exception on UPDATE/DELETE (D-17, AC-AUD-02.1). There is no
 * {@code updated_at} column and no {@code @Version} — the row is written once and
 * never modified.
 *
 * REQ-AUD-01, D-17, INV-08
 */
@Entity
@Table(name = "audit_log", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "occurred_at", nullable = false, updatable = false)
    private Instant occurredAt;

    /** Null when {@code actorType = SYSTEM}. */
    @Column(name = "actor_id", updatable = false)
    private UUID actorId;

    @Column(name = "actor_role", length = 50, updatable = false)
    private String actorRole;

    @Enumerated(EnumType.STRING)
    @Column(name = "actor_type", nullable = false, length = 20, updatable = false)
    private ActorType actorType;

    @Column(name = "action", nullable = false, length = 100, updatable = false)
    private String action;

    @Column(name = "entity_type", nullable = false, length = 100, updatable = false)
    private String entityType;

    @Column(name = "entity_id", length = 100, updatable = false)
    private String entityId;

    /** Application reference number; null for non-application entities. */
    @Column(name = "reference_no", length = 40, updatable = false)
    private String referenceNo;

    /** JSONB column — serialized by {@code AuditService} from a {@code Map}. */
    @Column(name = "old_value", columnDefinition = "jsonb", updatable = false)
    @ColumnTransformer(write = "?::jsonb")
    private String oldValue;

    @Column(name = "new_value", columnDefinition = "jsonb", updatable = false)
    @ColumnTransformer(write = "?::jsonb")
    private String newValue;

    @Column(name = "remark", columnDefinition = "TEXT", updatable = false)
    private String remark;

    @Column(name = "correlation_id", length = 100, updatable = false)
    private String correlationId;

    @Column(name = "ip_address", length = 45, updatable = false)
    private String ipAddress;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
