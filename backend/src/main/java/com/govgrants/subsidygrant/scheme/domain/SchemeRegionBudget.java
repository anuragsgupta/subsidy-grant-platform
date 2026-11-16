package com.govgrants.subsidygrant.scheme.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "scheme_region_budget", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SchemeRegionBudget {

    @EmbeddedId
    private SchemeRegionBudgetId id;

    @Column(name = "allocated", nullable = false, precision = 14, scale = 2)
    private BigDecimal allocated;

    @Column(name = "committed", nullable = false, precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal committed = BigDecimal.ZERO;

    @Column(name = "disbursed", nullable = false, precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal disbursed = BigDecimal.ZERO;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    public BigDecimal getRemaining() {
        return allocated.subtract(committed).subtract(disbursed);
    }
}
