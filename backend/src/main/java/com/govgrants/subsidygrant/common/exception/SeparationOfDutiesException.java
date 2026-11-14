package com.govgrants.subsidygrant.common.exception;

import org.springframework.http.HttpStatus;

/**
 * 403 — the actor has already acted at another level on this application
 * (or the tranche releaser equals the milestone verifier).
 * BR-SOD-1, BR-SOD-2, BR-SOD-4
 */
public class SeparationOfDutiesException extends BusinessException {

    public SeparationOfDutiesException(String message) {
        super(HttpStatus.FORBIDDEN, "SEPARATION_OF_DUTIES", message);
    }
}
