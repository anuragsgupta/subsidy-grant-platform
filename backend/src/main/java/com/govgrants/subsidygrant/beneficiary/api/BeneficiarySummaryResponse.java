package com.govgrants.subsidygrant.beneficiary.api;

import com.govgrants.subsidygrant.enums.BeneficiaryType;
import lombok.*;
import java.util.UUID;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BeneficiarySummaryResponse {
    private UUID id;
    private UUID userId;
    private BeneficiaryType beneficiaryType;
    private String fullName;
    private String identityReference;
    private String regionCode;
}
