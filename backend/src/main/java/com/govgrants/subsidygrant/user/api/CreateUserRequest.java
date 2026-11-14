package com.govgrants.subsidygrant.user.api;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Request DTO for POST /users (AC-USR-01.1, AC-USR-01.2).
 * <p>
 * The {@code roleId} and {@code regionIds} drive role assignment and region
 * binding validation per §4.1.
 *
 * REQ-USR-01
 */
public record CreateUserRequest(
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
        String phone,

        @NotNull
        Long roleId,

        @NotNull
        List<Long> regionIds
) {}
