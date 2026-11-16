package com.govgrants.subsidygrant.scheme.api;

import com.govgrants.subsidygrant.enums.SchemeStatus;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SchemeResponse {
    private UUID id;
    private String name;
    private String code;
    private String description;
    private LocalDate startDate;
    private LocalDate endDate;
    private BigDecimal minGrantAmount;
    private BigDecimal maxGrantAmount;
    private SchemeStatus status;
    private Instant createdAt;
    private Instant updatedAt;
}
