package com.govgrants.subsidygrant.eligibility.domain;

import java.util.List;

/**
 * Outcome produced by the pure-function EligibilityEvaluator (AI-H1, BR-ELG-8).
 *
 * <p>{@code score} is computed with {@code round_half_up(100 × Σweight(passed) / Σweight(all))}
 * per BR-ELG-6. {@code autoRejected} is true when at least one mandatory criterion failed
 * (BR-ELG-5). Risk tier is NOT set here — it is determined separately by RiskTierPolicy.
 *
 * <p>Requirements: REQ-ELG-01, REQ-ELG-02, BR-ELG-5, BR-ELG-6, BR-ELG-8
 */
public record EligibilityOutcome(
        int score,
        boolean autoRejected,
        List<CriterionResult> criterionResults,
        List<String> failedMandatoryDescriptions) {}
