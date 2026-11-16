package com.govgrants.subsidygrant.scheme.domain;

import com.govgrants.subsidygrant.enums.SchemeStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "scheme", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Scheme {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "code", nullable = false, unique = true, length = 50)
    private String code;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "min_grant_amount", nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal minGrantAmount = BigDecimal.ZERO;

    @Column(name = "max_grant_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal maxGrantAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private SchemeStatus status = SchemeStatus.DRAFT;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", length = 30)
    private SchemeCategory category;

    @Column(name = "tranche_count", nullable = false)
    @Builder.Default
    private int trancheCount = 1;

    @Column(name = "max_applications_per_beneficiary", nullable = false)
    @Builder.Default
    private int maxApplicationsPerBeneficiary = 1;

    @Version
    @Column(name = "version", nullable = false)
    private long version;
}
