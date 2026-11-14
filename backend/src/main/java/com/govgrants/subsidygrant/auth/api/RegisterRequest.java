package com.govgrants.subsidygrant.auth.api;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Request body for beneficiary self sign-up (AC-AUTH-01.1).
 * <p>
 * Password complexity (≥1 letter AND ≥1 digit) is validated in the service
 * layer because Bean Validation cannot express the cross-character-class rule
 * declaratively.
 *
 * REQ-AUTH-01
 */
public record RegisterRequest(
        @NotBlank
        @Size(min = 4, max = 50)
        @Pattern(regexp = "^[a-zA-Z0-9._-]+$")
        String username,

        @NotBlank
        @Size(min = 8, max = 72)
        String password,

        @NotBlank
        @Size(min = 2, max = 150)
        String fullName,

        @NotBlank
        @Email
        String email,

        @Pattern(regexp = "^(\\+91)?[6-9]\\d{9}$")
        String phone
) {}
