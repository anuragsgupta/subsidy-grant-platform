package com.govgrants.subsidygrant.common.exception;

import org.springframework.http.HttpStatus;

/**
 * 429 — the account is locked due to too many failed login attempts.
 * AC-AUTH-02.3
 */
public class TooManyAttemptsException extends BusinessException {

    public TooManyAttemptsException(String message) {
        super(HttpStatus.TOO_MANY_REQUESTS, "TOO_MANY_ATTEMPTS", message);
    }
}
