package com.govgrants.subsidygrant.application.api;

import com.govgrants.subsidygrant.enums.ApplicationStatus;
import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
import java.util.UUID;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CreateApplicationRequest {
    @NotNull(message = "Beneficiary ID is required")
    private UUID beneficiaryId;

    @NotNull(message = "Scheme ID is required")
    private UUID schemeId;

    @NotBlank(message = "Reference number is required")
    @Size(max = 40)
    private String referenceNo;

    @NotNull(message = "Requested amount is required")
    @DecimalMin(value = "0.01", message = "Requested amount must be greater than zero")
    private BigDecimal requestedAmount;

    private ApplicationStatus status;
}
