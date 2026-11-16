package com.govgrants.subsidygrant.scheme.domain;

import com.govgrants.subsidygrant.eligibility.domain.CriterionAttribute;
import com.govgrants.subsidygrant.eligibility.domain.CriterionOperator;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "scheme_criterion", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SchemeCriterion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "scheme_id", nullable = false)
    private Scheme scheme;

    @Enumerated(EnumType.STRING)
    @Column(name = "attribute", nullable = false, length = 30)
    private CriterionAttribute attribute;

    @Enumerated(EnumType.STRING)
    @Column(name = "operator", nullable = false, length = 20)
    private CriterionOperator operator;

    @Column(name = "threshold", nullable = false, columnDefinition = "TEXT")
    private String threshold;

    @Column(name = "weight", nullable = false)
    private int weight;

    @Column(name = "mandatory", nullable = false)
    private boolean mandatory;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

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
