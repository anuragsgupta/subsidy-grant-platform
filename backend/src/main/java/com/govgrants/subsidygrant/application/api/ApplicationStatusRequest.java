package com.govgrants.subsidygrant.application.api;

import com.govgrants.subsidygrant.enums.ApplicationStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class ApplicationStatusRequest {
    @NotNull(message = "Status is required")
    private ApplicationStatus status;
}
