package com.govgrants.subsidygrant.common.response;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Standard response envelope for all API endpoints (§11.1).
 * All controllers return {@code ApiResponse<T>} wrapped via this class.
 *
 * NFR-06
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiResponse<T>(
        boolean success,
        String message,
        String errorCode,
        T data,
        List<FieldError> fieldErrors,
        Instant timestamp,
        String correlationId
) {

    /** Field-level validation error entry (AC-AUTH-01.1, VALIDATION_FAILED). */
    public record FieldError(String field, String message) {}

    // -------------------------------------------------------------------------
    // Success factories
    // -------------------------------------------------------------------------

    public static <T> ApiResponse<T> success(String message, T data) {
        return new ApiResponse<>(true, message, null, data, null, Instant.now(), null);
    }

    public static <T> ApiResponse<T> success(String message) {
        return success(message, null);
    }

    // -------------------------------------------------------------------------
    // Error factories
    // -------------------------------------------------------------------------

    public static <T> ApiResponse<T> error(String errorCode, String message) {
        return new ApiResponse<>(false, message, errorCode, null, null, Instant.now(), null);
    }

    public static <T> ApiResponse<T> error(String errorCode, String message, List<FieldError> fieldErrors) {
        return new ApiResponse<>(false, message, errorCode, null, fieldErrors, Instant.now(), null);
    }

    /** Return a copy with the correlationId set (used by GlobalExceptionHandler). */
    public ApiResponse<T> withCorrelationId(String cid) {
        return new ApiResponse<>(success, message, errorCode, data, fieldErrors, timestamp, cid);
    }
}
