package com.govgrants.subsidygrant.application.api;

import com.govgrants.subsidygrant.enums.ApplicationStatus;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ApplicationSummaryResponse {
    private UUID id;
    private String referenceNo;
    private UUID beneficiaryId;
    private String beneficiaryFullName;
    private UUID schemeId;
    private String schemeCode;
    private BigDecimal requestedAmount;
    private ApplicationStatus status;
    private Instant createdAt;
}
