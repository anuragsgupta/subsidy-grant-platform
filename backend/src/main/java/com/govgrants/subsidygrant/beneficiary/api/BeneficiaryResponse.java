package com.govgrants.subsidygrant.beneficiary.api;

import com.govgrants.subsidygrant.enums.BeneficiaryType;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BeneficiaryResponse {
    private UUID id;
    private UUID userId;
    private BeneficiaryType beneficiaryType;
    private String fullName;
    private String identityReference;
    private String email;
    private String phone;
    private String address;
    private String regionCode;
    private Instant createdAt;
    private Instant updatedAt;
}
