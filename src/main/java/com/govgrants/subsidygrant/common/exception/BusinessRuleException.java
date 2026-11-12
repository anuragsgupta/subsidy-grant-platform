package com.govgrants.subsidygrant.common.exception;

import org.springframework.http.HttpStatus;

/**
 * 422 — a business rule was violated.  The caller supplies the specific
 * error code (e.g. AMOUNT_OUT_OF_RANGE, SCHEME_NOT_OPEN) so each module
 * can use its own codes without adding subclasses here.
 *
 * D-08
 */
public class BusinessRuleException extends BusinessException {

    public BusinessRuleException(String errorCode, String message) {
        super(HttpStatus.UNPROCESSABLE_CONTENT, errorCode, message);
    }
}
