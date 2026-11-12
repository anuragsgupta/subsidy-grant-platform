package com.govgrants.subsidygrant.common.exception;

import org.springframework.http.HttpStatus;

/**
 * 409 — a resource with the given unique key already exists.
 */
public class DuplicateResourceException extends BusinessException {

    public DuplicateResourceException(String message) {
        super(HttpStatus.CONFLICT, "DUPLICATE_RESOURCE", message);
    }
}
