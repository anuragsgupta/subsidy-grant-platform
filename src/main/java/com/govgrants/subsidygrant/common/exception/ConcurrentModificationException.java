package com.govgrants.subsidygrant.common.exception;

import org.springframework.http.HttpStatus;

/**
 * 409 — optimistic locking failure; the client's version is stale.
 * REQ-BEN-03 AC-BEN-03.3
 */
public class ConcurrentModificationException extends BusinessException {

    public ConcurrentModificationException(String message) {
        super(HttpStatus.CONFLICT, "CONCURRENT_MODIFICATION", message);
    }
}
