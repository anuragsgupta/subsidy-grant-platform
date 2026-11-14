package com.govgrants.subsidygrant.common.exception;

import org.springframework.http.HttpStatus;

/**
 * 403 — the actor attempted to act on a resource outside their region scope.
 * BR-SOD-3, BR-SOD-4
 */
public class RegionScopeViolationException extends BusinessException {

    public RegionScopeViolationException(String message) {
        super(HttpStatus.FORBIDDEN, "REGION_SCOPE_VIOLATION", message);
    }
}
