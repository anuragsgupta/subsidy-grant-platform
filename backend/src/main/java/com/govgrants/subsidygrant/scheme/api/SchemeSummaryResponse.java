package com.govgrants.subsidygrant.scheme.api;

import com.govgrants.subsidygrant.enums.SchemeStatus;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SchemeSummaryResponse {
    private UUID id;
    private String name;
    private String code;
    private SchemeStatus status;
    private LocalDate startDate;
    private LocalDate endDate;
    private BigDecimal minGrantAmount;
    private BigDecimal maxGrantAmount;
}
