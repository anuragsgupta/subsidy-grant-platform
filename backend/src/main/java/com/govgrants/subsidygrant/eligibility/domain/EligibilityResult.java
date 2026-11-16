package com.govgrants.subsidygrant.eligibility.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "eligibility_result", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EligibilityResult {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "application_id", nullable = false)
    private UUID applicationId;

    @Column(name = "criterion_id", nullable = false)
    private UUID criterionId;

    @Column(name = "passed", nullable = false)
    private boolean passed;

    @Builder.Default
    @Column(name = "points_awarded", nullable = false)
    private int pointsAwarded = 0;

    @Column(name = "beneficiary_value")
    private String beneficiaryValue;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
