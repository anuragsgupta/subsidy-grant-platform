package com.govgrants.subsidygrant.eligibility.domain;

import java.util.UUID;

/**
 * Result of evaluating a single criterion against a beneficiary's attributes.
 *
 * <p>{@code pointsAwarded} equals the criterion's weight when {@code passed} is true,
 * and 0 otherwise (BR-ELG-7). {@code beneficiaryValue} is the string representation of
 * the actual attribute value used during evaluation.
 *
 * <p>Requirements: REQ-ELG-01, REQ-ELG-02, BR-ELG-6, BR-ELG-7, BR-ELG-8
 */
public record CriterionResult(
        UUID criterionId,
        String description,
        boolean mandatory,
        boolean passed,
        int pointsAwarded,
        String beneficiaryValue) {}
