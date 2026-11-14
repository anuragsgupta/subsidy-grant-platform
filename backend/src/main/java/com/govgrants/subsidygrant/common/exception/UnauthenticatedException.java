package com.govgrants.subsidygrant.common.exception;

import org.springframework.http.HttpStatus;

/**
 * 401 — credentials are missing, invalid, or the account is not in a valid state
 * for authentication. The message must never reveal whether the username exists
 * (AC-AUTH-02.2).
 *
 * D-08
 */
public class UnauthenticatedException extends BusinessException {

    public UnauthenticatedException(String message) {
        super(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", message);
    }
}
