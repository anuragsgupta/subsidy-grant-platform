package com.govgrants.subsidygrant.entity;

import com.govgrants.subsidygrant.auth.domain.AppUser;
import com.govgrants.subsidygrant.eligibility.domain.Gender;
import com.govgrants.subsidygrant.eligibility.domain.SocialCategory;
import com.govgrants.subsidygrant.enums.BeneficiaryType;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "beneficiary", schema = "public")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Beneficiary {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", unique = true)
    private AppUser user;

    @Enumerated(EnumType.STRING)
    @Column(name = "beneficiary_type", nullable = false, length = 30)
    private BeneficiaryType beneficiaryType;

    @Column(name = "full_name", nullable = false, length = 150)
    private String fullName;

    @Column(name = "identity_reference", unique = true, length = 100)
    private String identityReference;

    @Column(name = "email", length = 255)
    private String email;

    @Column(name = "phone", length = 20)
    private String phone;

    @Column(name = "address", columnDefinition = "TEXT")
    private String address;

    @Column(name = "region_code", length = 30)
    private String regionCode;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Column(name = "annual_income", precision = 14, scale = 2)
    private BigDecimal annualIncome;

    @Column(name = "land_holding_acres", precision = 10, scale = 3)
    private BigDecimal landHoldingAcres;

    @Enumerated(EnumType.STRING)
    @Column(name = "gender", length = 10)
    private Gender gender;

    @Enumerated(EnumType.STRING)
    @Column(name = "social_category", length = 30)
    private SocialCategory socialCategory;

    @Column(name = "is_disabled")
    private Boolean isDisabled;

    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
}
