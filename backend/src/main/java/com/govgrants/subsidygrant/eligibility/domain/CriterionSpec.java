package com.govgrants.subsidygrant.eligibility.domain;

/**
 * Immutable specification of a single eligibility criterion used by the pure-function
 * EligibilityEvaluator (AI-H1, BR-ELG-8).
 *
 * <p>Requirements: REQ-ELG-01, BR-ELG-2, BR-ELG-8
 */
public record CriterionSpec(
        CriterionAttribute attribute,
        CriterionOperator operator,
        String threshold,
        int weight,
        boolean mandatory,
        String description) {}
