package com.govgrants.subsidygrant.beneficiary.api;

import jakarta.validation.constraints.*;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UpdateBeneficiaryRequest {
    @NotBlank(message = "Full name is required")
    @Size(max = 150)
    private String fullName;

    @Size(max = 100)
    private String identityReference;

    @Email
    @Size(max = 255)
    private String email;

    @Size(max = 20)
    private String phone;

    private String address;

    @Size(max = 30)
    private String regionCode;
}
