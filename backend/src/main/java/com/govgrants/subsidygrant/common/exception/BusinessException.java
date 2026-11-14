package com.govgrants.subsidygrant.common.exception;

import org.springframework.http.HttpStatus;

/**
 * Abstract base for all application-level business rule violations.
 * Subclasses carry a fixed HttpStatus and an error code string
 * drawn from requirements §11.2.
 *
 * NFR-06, D-08
 */
public abstract class BusinessException extends RuntimeException {

    private final HttpStatus status;
    private final String errorCode;

    protected BusinessException(HttpStatus status, String errorCode, String message) {
        super(message);
        this.status = status;
        this.errorCode = errorCode;
    }

    protected BusinessException(HttpStatus status, String errorCode, String message, Throwable cause) {
        super(message, cause);
        this.status = status;
        this.errorCode = errorCode;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getErrorCode() {
        return errorCode;
    }
}
