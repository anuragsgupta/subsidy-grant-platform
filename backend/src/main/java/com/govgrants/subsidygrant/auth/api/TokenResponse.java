package com.govgrants.subsidygrant.auth.api;

import java.time.Instant;

/**
 * Response body returned on successful login (AC-AUTH-02.1).
 * <p>
 * Carries the self-issued JWT access token, the token type (always "Bearer"),
 * and the exact expiry instant.
 *
 * REQ-AUTH-02, D-03
 */
public record TokenResponse(
        String accessToken,
        String tokenType,
        Instant expiresAt
) {}
