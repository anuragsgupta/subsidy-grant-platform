package com.govgrants.subsidygrant.audit.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * External API client credential record (TREASURY, BENEFICIARY_DB).
 *
 * <p>Stores a BCrypt hash of the API key; the plaintext key is never persisted.
 * Unlike {@link AuditLog}, this entity is mutable (keys can be rotated, clients
 * can be deactivated) and therefore carries a {@code @Version} for optimistic
 * locking.
 *
 * REQ-AUD-01
 */
@Entity
@Table(name = "api_client", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApiClient {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** TREASURY or BENEFICIARY_DB — unique. */
    @Column(name = "name", nullable = false, unique = true, length = 50)
    private String name;

    /** BCrypt hash of the API key. */
    @Column(name = "key_hash", nullable = false, length = 255)
    private String keyHash;

    @Column(name = "active", nullable = false)
    @Builder.Default
    private boolean active = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    private long version;
}
