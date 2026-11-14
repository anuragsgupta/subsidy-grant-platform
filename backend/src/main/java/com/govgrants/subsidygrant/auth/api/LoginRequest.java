package com.govgrants.subsidygrant.auth.api;

import jakarta.validation.constraints.NotBlank;

/**
 * Request body for login (AC-AUTH-02.1).
 *
 * REQ-AUTH-02
 */
public record LoginRequest(
        @NotBlank String username,
        @NotBlank String password
) {}
