package com.govgrants.subsidygrant.common.api;

import com.govgrants.subsidygrant.common.exception.AccessDeniedException;
import com.govgrants.subsidygrant.common.exception.BusinessException;
import com.govgrants.subsidygrant.common.exception.BusinessRuleException;
import com.govgrants.subsidygrant.common.exception.ConcurrentModificationException;
import com.govgrants.subsidygrant.common.exception.DuplicateResourceException;
import com.govgrants.subsidygrant.common.exception.RegionScopeViolationException;
import com.govgrants.subsidygrant.common.exception.ResourceInUseException;
import com.govgrants.subsidygrant.common.exception.ResourceNotFoundException;
import com.govgrants.subsidygrant.common.exception.SeparationOfDutiesException;
import com.govgrants.subsidygrant.common.exception.TooManyAttemptsException;
import com.govgrants.subsidygrant.common.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.List;

/**
 * Centralised error handler — maps every exception to an {@link ApiResponse} envelope.
 * Stack traces are never exposed in responses (NFR-06, D-08, requirements §11.2).
 *
 * All error responses are produced exclusively here (project rules §4).
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    // -------------------------------------------------------------------------
    // Custom business exceptions
    // -------------------------------------------------------------------------

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleResourceNotFound(
            ResourceNotFoundException ex) {
        return build(HttpStatus.NOT_FOUND, ex.getErrorCode(), ex.getMessage());
    }

    @ExceptionHandler({DuplicateResourceException.class})
    public ResponseEntity<ApiResponse<Void>> handleDuplicate(
            DuplicateResourceException ex) {
        return build(HttpStatus.CONFLICT, ex.getErrorCode(), ex.getMessage());
    }

    @ExceptionHandler(ResourceInUseException.class)
    public ResponseEntity<ApiResponse<Void>> handleResourceInUse(
            ResourceInUseException ex) {
        return build(HttpStatus.CONFLICT, ex.getErrorCode(), ex.getMessage());
    }

    @ExceptionHandler(ConcurrentModificationException.class)
    public ResponseEntity<ApiResponse<Void>> handleConcurrentModification(
            ConcurrentModificationException ex) {
        return build(HttpStatus.CONFLICT, ex.getErrorCode(), ex.getMessage());
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDenied(
            AccessDeniedException ex) {
        return build(HttpStatus.FORBIDDEN, ex.getErrorCode(), ex.getMessage());
    }

    @ExceptionHandler(RegionScopeViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleRegionScope(
            RegionScopeViolationException ex) {
        return build(HttpStatus.FORBIDDEN, ex.getErrorCode(), ex.getMessage());
    }

    @ExceptionHandler(SeparationOfDutiesException.class)
    public ResponseEntity<ApiResponse<Void>> handleSeparationOfDuties(
            SeparationOfDutiesException ex) {
        return build(HttpStatus.FORBIDDEN, ex.getErrorCode(), ex.getMessage());
    }

    @ExceptionHandler(BusinessRuleException.class)
    public ResponseEntity<ApiResponse<Void>> handleBusinessRule(
            BusinessRuleException ex) {
        return build(HttpStatus.UNPROCESSABLE_CONTENT, ex.getErrorCode(), ex.getMessage());
    }

    @ExceptionHandler(TooManyAttemptsException.class)
    public ResponseEntity<ApiResponse<Void>> handleTooManyAttempts(
            TooManyAttemptsException ex) {
        return build(HttpStatus.TOO_MANY_REQUESTS, ex.getErrorCode(), ex.getMessage());
    }

    /**
     * Catch-all for any remaining {@link BusinessException} subclass not handled above.
     * Uses the status and error code embedded in the exception.
     */
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<Void>> handleGenericBusiness(
            BusinessException ex) {
        return build(ex.getStatus(), ex.getErrorCode(), ex.getMessage());
    }

    // -------------------------------------------------------------------------
    // Spring MVC / bean validation
    // -------------------------------------------------------------------------

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(
            MethodArgumentNotValidException ex) {

        List<ApiResponse.FieldError> fieldErrors = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(fe -> new ApiResponse.FieldError(fe.getField(), fe.getDefaultMessage()))
                .toList();

        ApiResponse<Void> body = ApiResponse.<Void>error(
                "VALIDATION_FAILED",
                "Request validation failed",
                fieldErrors
        ).withCorrelationId(correlationId());

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Void>> handleMalformedJson(
            HttpMessageNotReadableException ex) {
        return build(HttpStatus.BAD_REQUEST, "MALFORMED_JSON", "The request body could not be parsed");
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiResponse<Void>> handleTypeMismatch(
            MethodArgumentTypeMismatchException ex) {
        String msg = "Invalid value for parameter '" + ex.getName() + "'";
        return build(HttpStatus.BAD_REQUEST, "INVALID_PARAMETER", msg);
    }

    // -------------------------------------------------------------------------
    // Spring Security
    // -------------------------------------------------------------------------

    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleSpringAccessDenied(
            org.springframework.security.access.AccessDeniedException ex) {
        return build(HttpStatus.FORBIDDEN, "ACCESS_DENIED", "Access denied");
    }

    // -------------------------------------------------------------------------
    // Database constraint violations
    // -------------------------------------------------------------------------

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleDataIntegrity(
            DataIntegrityViolationException ex) {
        // Log the technical detail but do not expose it
        log.warn("Data integrity violation [correlationId={}]: {}", correlationId(), ex.getMessage());
        return build(HttpStatus.CONFLICT, "DUPLICATE_RESOURCE",
                "A resource with the given identifier already exists");
    }

    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    public ResponseEntity<ApiResponse<Void>> handleOptimisticLock(
            ObjectOptimisticLockingFailureException ex) {
        log.warn("Optimistic locking failure [correlationId={}]: {}", correlationId(), ex.getMessage());
        return build(HttpStatus.CONFLICT, "CONCURRENT_MODIFICATION",
                "The resource was modified by another request; please retry");
    }

    // -------------------------------------------------------------------------
    // Fallback
    // -------------------------------------------------------------------------

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGeneric(Exception ex, HttpServletRequest request) {
        // Log with correlation ID for traceability; never expose stack trace in response
        log.error("Unhandled exception [correlationId={}, path={}]",
                correlationId(), request.getRequestURI(), ex);
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR",
                "An unexpected error occurred. Please try again later.");
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private static String correlationId() {
        String cid = MDC.get("correlationId");
        return cid != null ? cid : "";
    }

    private static ResponseEntity<ApiResponse<Void>> build(
            HttpStatus status, String errorCode, String message) {
        ApiResponse<Void> body = ApiResponse.<Void>error(errorCode, message)
                .withCorrelationId(correlationId());
        return ResponseEntity.status(status).body(body);
    }
}
