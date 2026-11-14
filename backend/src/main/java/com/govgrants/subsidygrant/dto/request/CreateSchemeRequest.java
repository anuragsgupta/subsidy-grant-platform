package com.govgrants.subsidygrant.dto.request;

import com.govgrants.subsidygrant.enums.SchemeStatus;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateSchemeRequest {

    @NotBlank(message = "Scheme name is required")
    @Size(max = 200, message = "Scheme name must not exceed 200 characters")
    private String name;

    @NotBlank(message = "Scheme code is required")
    @Size(max = 50, message = "Scheme code must not exceed 50 characters")
    private String code;

    private String description;

    @NotNull(message = "Start date is required")
    private LocalDate startDate;

    @NotNull(message = "End date is required")
    private LocalDate endDate;

    @NotNull(message = "Minimum grant amount is required")
    @DecimalMin(value = "0.01", message = "Minimum grant amount must be greater than zero")
    private BigDecimal minGrantAmount;

    @NotNull(message = "Maximum grant amount is required")
    @DecimalMin(value = "0.01", message = "Maximum grant amount must be greater than zero")
    private BigDecimal maxGrantAmount;

    private SchemeStatus status;
}
