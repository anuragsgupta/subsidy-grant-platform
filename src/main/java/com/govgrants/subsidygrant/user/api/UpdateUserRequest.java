package com.govgrants.subsidygrant.user.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Request DTO for PUT /users/{id} (AC-USR-01.4).
 * <p>
 * Only {@code fullName} and {@code phone} are editable. Email, username, id and
 * auth_user_id SHALL NOT be changeable through this endpoint.
 *
 * REQ-USR-01
 */
public record UpdateUserRequest(
        @NotBlank
        @Size(min = 2, max = 150)
        String fullName,

        @Pattern(regexp = "^(\\+91)?[6-9]\\d{9}$")
        String phone
) {}
