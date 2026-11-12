package com.govgrants.subsidygrant.common.exception;

import org.springframework.http.HttpStatus;

/**
 * 404 — the requested resource does not exist or is not visible to the caller.
 * Use for both genuine "not found" and D-16 "hide from non-owner" cases.
 */
public class ResourceNotFoundException extends BusinessException {

    public ResourceNotFoundException(String message) {
        super(HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND", message);
    }
}
