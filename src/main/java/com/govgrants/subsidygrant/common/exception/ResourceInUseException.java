package com.govgrants.subsidygrant.common.exception;

import org.springframework.http.HttpStatus;

/**
 * 409 — the resource cannot be deleted or replaced because it is referenced
 * by other records (D-14, REQ-BEN-04, REQ-SCH-08).
 */
public class ResourceInUseException extends BusinessException {

    public ResourceInUseException(String message) {
        super(HttpStatus.CONFLICT, "RESOURCE_IN_USE", message);
    }
}
