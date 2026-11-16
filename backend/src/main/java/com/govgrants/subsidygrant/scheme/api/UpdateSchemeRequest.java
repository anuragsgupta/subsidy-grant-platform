package com.govgrants.subsidygrant.scheme.api;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UpdateSchemeRequest {
    @NotBlank(message = "Scheme name is required")
    @Size(max = 200)
    private String name;

    private String description;

    @NotNull(message = "Start date is required")
    private LocalDate startDate;

    @NotNull(message = "End date is required")
    private LocalDate endDate;

    @NotNull(message = "Minimum grant amount is required")
    @DecimalMin(value = "0.01")
    private BigDecimal minGrantAmount;

    @NotNull(message = "Maximum grant amount is required")
    @DecimalMin(value = "0.01")
    private BigDecimal maxGrantAmount;
}
