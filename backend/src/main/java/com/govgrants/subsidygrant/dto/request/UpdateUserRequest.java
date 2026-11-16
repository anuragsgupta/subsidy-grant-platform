package com.govgrants.subsidygrant.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateUserRequest {

    @NotBlank(message = "Full name is required")
    @Size(max = 150, message = "Full name must not exceed 150 characters")
    private String fullName;

    @Pattern(regexp = "^[0-9+()\\-\\s]*$", message = "Phone must follow a valid phone number format")
    @Size(max = 20, message = "Phone must not exceed 20 characters")
    private String phone;
}
