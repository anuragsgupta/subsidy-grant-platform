package com.govgrants.subsidygrant.beneficiary.api;

import com.govgrants.subsidygrant.enums.BeneficiaryType;
import jakarta.validation.constraints.*;
import lombok.*;
import java.util.UUID;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CreateBeneficiaryRequest {
    @NotNull(message = "Beneficiary type is required")
    private BeneficiaryType beneficiaryType;

    @NotBlank(message = "Full name is required")
    @Size(max = 150)
    private String fullName;

    @NotBlank(message = "Identity reference is required")
    @Size(max = 100)
    private String identityReference;

    @Email(message = "Email must be a valid email address")
    @Size(max = 255)
    private String email;

    @Size(max = 20)
    private String phone;

    private String address;

    @Size(max = 30)
    private String regionCode;

    private UUID userId;
}
