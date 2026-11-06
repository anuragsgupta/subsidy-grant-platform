package com.govgrants.subsidygrant.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserStatusRequest {

    @NotNull(message = "Active status is required")
    private Boolean active;
}
