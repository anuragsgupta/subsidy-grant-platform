package com.govgrants.subsidygrant.common.exception;

import org.springframework.http.HttpStatus;

/**
 * 403 — the authenticated user does not have the required role or permission.
 * AC-AUTH-03.3
 *
 * This is the custom application exception (error code ACCESS_DENIED).
 * The GlobalExceptionHandler also handles Spring Security's
 * {@code org.springframework.security.access.AccessDeniedException}.
 */
public class AccessDeniedException extends BusinessException {

    public AccessDeniedException(String message) {
        super(HttpStatus.FORBIDDEN, "ACCESS_DENIED", message);
    }
}
