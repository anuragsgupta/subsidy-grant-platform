package com.govgrants.subsidygrant.eligibility.domain;

import java.util.List;

/**
 * Result of a non-persisting eligibility preview (REQ-ELG-03, AC-ELG-03.1).
 *
 * <p>The numeric score, weights, and risk tier are intentionally absent to satisfy
 * the information-restriction rule INV-01 (AC-ELG-03.2).
 *
 * <p>Requirements: REQ-ELG-03, AC-ELG-03.1, AC-ELG-03.2
 */
public record EligibilityPreviewResult(
        boolean eligible,
        List<CriterionResult> criterionResults) {}
