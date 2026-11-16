package com.govgrants.subsidygrant.eligibility.domain;

import com.govgrants.subsidygrant.enums.BeneficiaryType;
import java.math.BigDecimal;

/**
 * Snapshot of a beneficiary's attributes used as input to the pure-function
 * EligibilityEvaluator (AI-H1, BR-ELG-8).
 *
 * <p>All fields are nullable (boxed types) except {@code beneficiaryType}, which is always
 * required. A null value for any attribute causes the corresponding criterion to fail per BR-ELG-4.
 *
 * <p>Requirements: REQ-ELG-01, BR-ELG-2, BR-ELG-4, BR-ELG-8
 */
public record BeneficiaryAttributes(
        Integer age,
        BigDecimal annualIncome,
        BigDecimal landHoldingAcres,
        Gender gender,
        SocialCategory socialCategory,
        Boolean isDisabled,
        BeneficiaryType beneficiaryType,
        String regionCode) {}
