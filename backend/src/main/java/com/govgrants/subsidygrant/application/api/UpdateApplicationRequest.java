package com.govgrants.subsidygrant.application.api;

import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UpdateApplicationRequest {
    @NotNull(message = "Requested amount is required")
    @DecimalMin(value = "0.01")
    private BigDecimal requestedAmount;
}
