package com.govgrants.subsidygrant.scheme.api;

import com.govgrants.subsidygrant.enums.SchemeStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class SchemeStatusRequest {
    @NotNull(message = "Status is required")
    private SchemeStatus status;
}
